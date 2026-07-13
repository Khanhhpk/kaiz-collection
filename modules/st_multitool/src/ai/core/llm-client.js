const STORAGE_KEY = 'st-multitool-ai-llm-config';

const DEFAULT_CONFIG = {
    mode: 'st',
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    contextLimit: 32000,
    maxOutput: 4000,
    maxIterations: 30,
};

export function getLLMConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

export function setLLMConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
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
    const logId = startDebugLog({
        mode: config.mode,
        endpoint: config.mode === 'st' ? 'SillyTavern Internal API' : config.endpoint,
        model: config.model,
        messages,
        options: { maxOutput: config.maxOutput, contextLimit: config.contextLimit }
    });

    try {
        if (config.mode === 'st') {
            const win = window.parent || window;
            let fullText = '';
            let lastErr = null;

            // Chuyển messages thành chuỗi prompt tiêu chuẩn nếu engine cần prompt string
            const promptStr = messages.map(m => {
                if (m.role === 'system') return `### SYSTEM INSTRUCTIONS:\n${m.content}\n`;
                if (m.role === 'assistant') return `### ASSISTANT:\n${m.content}\n`;
                return `### USER:\n${m.content}\n`;
            }).join('\n\n') + (messages[messages.length - 1]?.role === 'assistant' ? '' : '\n\n### ASSISTANT:\n');

            // 1. Thử Engine 1: SillyTavern generateRaw (Quiet mode = true để không pop bubble ngoài ST)
            if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function') {
                const ctx = win.SillyTavern.getContext();
                if (typeof ctx.generateRaw === 'function') {
                    try {
                        const res = await ctx.generateRaw(promptStr, null, true);
                        const text = typeof res === 'string' ? res : (res?.text ?? res?.content ?? JSON.stringify(res ?? ''));
                        if (text && text.trim()) {
                            fullText = text;
                        }
                    } catch (e) {
                        lastErr = e;
                    }
                }
            }

            // 2. Thử Engine 2: PhoneSystem.callExternalAPI (nếu đang chạy trong hệ sinh thái Âu Âu / Phone Core)
            if (!fullText.trim() && win.PhoneSystem && typeof win.PhoneSystem.callExternalAPI === 'function') {
                try {
                    const res = await win.PhoneSystem.callExternalAPI(messages, {
                        model: config.model,
                        maxTokens: config.maxOutput
                    });
                    const text = typeof res === 'string' ? res : (res?.text ?? res?.content ?? JSON.stringify(res ?? ''));
                    if (text && text.trim()) {
                        fullText = text;
                    }
                } catch (e) {
                    lastErr = e;
                }
            }

            // 3. Thử Engine 3: SillyTavern generateQuietPrompt
            if (!fullText.trim() && win.SillyTavern && typeof win.SillyTavern.getContext === 'function') {
                const ctx = win.SillyTavern.getContext();
                if (typeof ctx.generateQuietPrompt === 'function') {
                    try {
                        const res = await ctx.generateQuietPrompt(promptStr);
                        const text = typeof res === 'string' ? res : (res?.text ?? res?.content ?? JSON.stringify(res ?? ''));
                        if (text && text.trim()) {
                            fullText = text;
                        }
                    } catch (e) {
                        lastErr = e;
                    }
                }
            }

            // 4. Thử Engine 4: Trực tiếp qua endpoint /api/backends/chat-completions/generate
            if (!fullText.trim()) {
                try {
                    const res = await fetch('/api/backends/chat-completions/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages,
                            max_tokens: config.maxOutput,
                            stream: false
                        }),
                        signal,
                    });
                    if (res.ok) {
                        const json = await res.json().catch(() => null);
                        const text = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? json?.content ?? json?.text ?? (typeof json === 'string' ? json : '');
                        if (text && text.trim()) {
                            fullText = text;
                        }
                    }
                } catch (e) {
                    lastErr = e;
                }
            }

            if (!fullText.trim()) {
                const errMsg = lastErr?.message || 'SillyTavern API không trả về dữ liệu (kết quả rỗng hoặc chưa kết nối API chính). Vui lòng kiểm tra kết nối API trong SillyTavern hoặc chuyển sang chế độ Custom Endpoint trong Cài đặt LLM.';
                const err = new Error(errMsg);
                updateDebugLog(logId, { status: 'ERROR', error: err });
                throw err;
            }

            if (onChunk) {
                onChunk(fullText);
            }
            updateDebugLog(logId, { status: 'DONE', response: fullText });
            return fullText;
        }

        if (config.mode === 'custom') {
            const baseUrl = config.endpoint.replace(/\/$/, '');
            const body = {
                model: config.model,
                messages,
                max_tokens: config.maxOutput,
                stream: true,
            };
            if (tools?.length) body.tools = tools;

            const headers = { 'Content-Type': 'application/json' };
            if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

            const res = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal,
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                const err = new Error(`LLM API error ${res.status}: ${text || res.statusText}`);
                updateDebugLog(logId, { status: 'ERROR', error: err });
                throw err;
            }

            const wrappedOnChunk = (delta) => {
                updateDebugLog(logId, { status: 'STREAMING', chunk: delta });
                if (onChunk) onChunk(delta);
            };

            const fullText = await parseSSEStream(res, wrappedOnChunk, signal);
            updateDebugLog(logId, { status: 'DONE', response: fullText });
            return fullText;
        }

        throw new Error(`Unknown LLM mode: "${config.mode}". Expected "st" or "custom".`);
    } catch (err) {
        updateDebugLog(logId, { status: 'ERROR', error: err });
        throw err;
    }
}
