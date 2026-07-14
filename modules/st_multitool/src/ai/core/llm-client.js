const STORAGE_KEY = 'st-multitool-ai-llm-config';

const DEFAULT_CONFIG = {
    mode: 'custom',
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    contextLimit: 32000,
    maxOutput: 4000,
    maxIterations: 30,
    maxRetries: 3,
};

export function getLLMConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const cfg = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
        cfg.mode = 'custom'; // Buộc luôn dùng chế độ custom để đảm bảo giữ nguyên phân tầng role bypass filter
        return cfg;
    } catch {
        return { ...DEFAULT_CONFIG, mode: 'custom' };
    }
}

export function setLLMConfig(cfg) {
    const toSave = { ...cfg, mode: 'custom' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

export async function fetchModels(endpoint, apiKey) {
    const url = `${endpoint.replace(/\/$/, '')}/models`;
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const items = Array.isArray(json.data) ? json.data : [];
    return items.map(m => ({ id: m.id, name: m.id }));
}

async function parseSSEStream(response, onChunk, signal) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    try {
        while (true) {
            if (signal?.aborted) break;

            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;

                const raw = trimmed.slice(5).trim();
                if (raw === '[DONE]') return fullText;

                try {
                    const json = JSON.parse(raw);
                    const finishReason = json?.choices?.[0]?.finish_reason || json?.candidates?.[0]?.finishReason || '';
                    if (finishReason === 'content_filter' || finishReason === 'SAFETY' || finishReason === 'blocked' || finishReason === 'safety') {
                        fullText += '\n<!-- STREAM_ABORTED_BY_SAFETY_FILTER -->';
                        return fullText;
                    }
                    const delta = typeof json === 'string'
                        ? json
                        : (json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.text ?? json?.choices?.[0]?.message?.content ?? json?.delta ?? json?.content ?? json?.text ?? '');
                    if (delta) {
                        fullText += delta;
                        onChunk?.(delta);
                    }
                } catch {
                    // skip malformed JSON
                }
            }
        }
    } finally {
        reader.cancel();
    }

    return fullText;
}

import { startDebugLog, updateDebugLog } from './debug-logger.js';

export async function sendLLMRequest({ messages, tools, onChunk, signal } = {}) {
    const config = getLLMConfig();
    const baseUrl = (config.endpoint || '').trim().replace(/\/$/, '');
    const maxRetries = typeof config.maxRetries === 'number' && config.maxRetries >= 0 ? config.maxRetries : 3;

    if (!baseUrl) {
        throw new Error('Chưa cấu hình Endpoint LLM! Vui lòng bấm vào nút [⚙️ Cài đặt LLM] trên thanh tiêu đề AI Agency để nhập Endpoint và API Key.');
    }

    const logId = startDebugLog({
        mode: 'custom',
        endpoint: baseUrl,
        model: config.model,
        messages,
        options: { maxOutput: config.maxOutput, contextLimit: config.contextLimit, maxRetries }
    });

    const body = {
        model: config.model || 'gpt-4o-mini',
        messages,
        max_tokens: config.maxOutput || 4000,
        stream: true,
    };
    if (tools?.length) body.tools = tools;

    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (signal?.aborted) {
            const abortErr = new DOMException('Task aborted by user.', 'AbortError');
            updateDebugLog(logId, { status: 'ERROR', error: abortErr });
            throw abortErr;
        }

        try {
            if (attempt > 0) {
                const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                const retryMsg = `\n⏳ [Hệ thống: Lỗi kết nối API (${lastError?.message || 'Unknown'}). Đang tự động thử lại lần ${attempt}/${maxRetries} sau ${delayMs / 1000}s...]\n`;
                updateDebugLog(logId, { status: 'STREAMING', chunk: retryMsg });
                if (onChunk) onChunk(retryMsg);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                if (signal?.aborted) {
                    throw new DOMException('Task aborted by user.', 'AbortError');
                }
            }

            const res = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal,
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                const status = res.status;
                const err = new Error(`API LLM error (${status}): ${text || res.statusText}`);
                // Không retry với các lỗi cú pháp/xác thực client (400, 401, 403, 404) trừ lỗi 429 Rate Limit và 408 Timeout
                if (status >= 400 && status < 500 && status !== 429 && status !== 408) {
                    updateDebugLog(logId, { status: 'ERROR', error: err });
                    throw err;
                }
                throw err;
            }

            const wrappedOnChunk = (delta) => {
                updateDebugLog(logId, { status: 'STREAMING', chunk: delta });
                if (onChunk) onChunk(delta);
            };

            const fullText = await parseSSEStream(res, wrappedOnChunk, signal);
            updateDebugLog(logId, { status: 'DONE', response: fullText });
            return fullText;
        } catch (err) {
            if (err?.name === 'AbortError') {
                updateDebugLog(logId, { status: 'ERROR', error: err });
                throw err;
            }
            lastError = err;
            if (attempt === maxRetries) {
                updateDebugLog(logId, { status: 'ERROR', error: err });
                throw err;
            }
        }
    }
    throw lastError || new Error('Unknown LLM request failure');
}
