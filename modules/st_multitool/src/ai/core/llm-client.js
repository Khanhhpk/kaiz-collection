const STORAGE_KEY = 'st-multitool-ai-llm-config';

const DEFAULT_CONFIG = {
    mode: 'st',
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    contextLimit: 32000,
    maxOutput: 4000,
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
                    const delta = json?.choices?.[0]?.delta?.content ?? '';
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

export async function sendLLMRequest({ messages, tools, onChunk, signal } = {}) {
    const config = getLLMConfig();

    if (config.mode === 'st') {
        const body = {
            messages,
            max_tokens: config.maxOutput,
            stream: true,
        };
        if (tools?.length) body.tools = tools;

        const res = await fetch('/api/backends/chat-completions/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`ST API error ${res.status}: ${text || res.statusText}`);
        }

        return parseSSEStream(res, onChunk, signal);
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
            throw new Error(`LLM API error ${res.status}: ${text || res.statusText}`);
        }

        return parseSSEStream(res, onChunk, signal);
    }

    throw new Error(`Unknown LLM mode: "${config.mode}". Expected "st" or "custom".`);
}
