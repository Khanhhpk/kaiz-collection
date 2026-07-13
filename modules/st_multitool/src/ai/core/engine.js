/**
 * @file engine.js
 * @description Agentic Loop engine for AI Agency.
 *
 * Responsibilities:
 *  - Maintain conversation history
 *  - Build prompt messages (system + history)
 *  - Stream LLM responses
 *  - Parse <tool_call> XML from responses
 *  - Execute tools via IContextProvider and loop until no more tool calls
 *  - Enforce a max-iteration guard (30) to prevent infinite loops
 *  - Support AbortController for cancellation
 *  - Truncate history when context limit is approached
 */

import { sendLLMRequest, getLLMConfig } from './llm-client.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of agentic iterations before forcing a stop. */
const MAX_ITERATIONS = 30;

/**
 * Fraction of the provider's contextLimit at which history truncation kicks in.
 * We use character count as a rough token proxy.
 */
const CONTEXT_LIMIT_FRACTION = 0.8;

/** Number of history entries to keep when truncation occurs. */
const HISTORY_KEEP_ENTRIES = 10;

/** Regex to extract every <tool_call>…</tool_call> block from an LLM response. */
const TOOL_CALL_REGEX = /<tool_call>([\s\S]*?)<\/tool_call>/g;

// ---------------------------------------------------------------------------
// AgencyEngine
// ---------------------------------------------------------------------------

export class AgencyEngine {
  /**
   * @param {import('./types.js').IContextProvider} provider
   */
  constructor(provider) {
    /** @type {import('./types.js').IContextProvider} */
    this._provider = provider;

    /** @type {Array<{role: string, content: string}>} */
    this._history = [];

    /** @type {AbortController | null} */
    this._abortController = null;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Replace the current context provider.
   * @param {import('./types.js').IContextProvider} provider
   */
  setProvider(provider) {
    this._provider = provider;
  }

  /**
   * Run the agentic loop for a single user message.
   *
   * @param {string} userMessage
   * @param {{
   *   onChunk?:      (chunk: string) => void,
   *   onToolCall?:   (toolCall: {name: string, args: object}) => void,
   *   onToolResult?: (result: any) => void,
   *   onDone?:       (finalText: string) => void,
   *   onError?:      (err: Error) => void,
   * }} callbacks
   */
  async runTask(userMessage, {
    onChunk      = () => {},
    onToolCall   = () => {},
    onToolResult = () => {},
    onDone       = () => {},
    onError      = () => {},
  } = {}) {
    // Create a fresh AbortController for this task.
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    try {
      // 1. Push the user message into history.
      this._pushHistory({ role: 'user', content: userMessage });

      let iterations = 0;

      // Agentic loop.
      while (iterations < MAX_ITERATIONS) {
        if (signal.aborted) {
          throw new DOMException('Task aborted by user.', 'AbortError');
        }

        iterations++;

        // 2. Build messages = [system] + history, with context truncation.
        this._maybetruncateHistory();
        const messages = this._buildMessages();

        // 3. Stream LLM request.
        let assistantText = '';

        await sendLLMRequest({
          messages,
          signal,
          onChunk: (chunk) => {
            assistantText += chunk;
            onChunk(chunk);
          },
        });


        // Push assistant's full response into history.
        this._pushHistory({ role: 'assistant', content: assistantText });

        // 4. Parse tool calls from the response.
        const toolCalls = this._parseToolCalls(assistantText);

        if (toolCalls.length === 0) {
          // 6. No tool calls → we're done.
          onDone(assistantText);
          return;
        }

        // 5. Execute each tool call in sequence.
        for (const toolCall of toolCalls) {
          if (signal.aborted) {
            throw new DOMException('Task aborted by user.', 'AbortError');
          }

          onToolCall(toolCall);

          let result;
          try {
            result = await this._provider.executeTool(toolCall.name, toolCall.args, { signal });
          } catch (toolErr) {
            result = { error: toolErr?.message ?? String(toolErr) };
          }

          onToolResult(toolCall.name, result);


          // Append tool result to history using 'user' role for maximum API compatibility with XML tool calls.
          this._pushHistory({
            role: 'user',
            content: `[Tool Result: ${toolCall.name}]\nRESULT: ${JSON.stringify(result)}`,
          });
        }

        // Loop back to send the tool results to the LLM.
      }

      // Reached max iterations.
      const maxIterErr = new Error(
        `AgencyEngine: reached maximum iteration limit (${MAX_ITERATIONS}).`
      );
      onError(maxIterErr);
    } catch (err) {
      // Swallow abort errors silently (they are intentional), surface the rest.
      if (err?.name !== 'AbortError') {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      this._abortController = null;
    }
  }

  /**
   * Abort the currently running task, if any.
   */
  abort() {
    if (this._abortController) {
      this._abortController.abort();
    }
  }

  /**
   * Reset the conversation history.
   */
  clearHistory() {
    this._history = [];
  }

  /**
   * Return a shallow copy of the current conversation history.
   * @returns {Array<{role: string, content: string}>}
   */
  getHistory() {
    return [...this._history];
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Append an entry to conversation history.
   * @param {{role: string, content: string}} entry
   */
  _pushHistory(entry) {
    this._history.push(entry);
  }

  /**
   * Build the full messages array to send to the LLM.
   * @returns {Array<{role: string, content: string}>}
   */
  _buildMessages() {
    const systemPrompt = this._provider.getSystemPrompt();
    return [
      { role: 'system', content: systemPrompt },
      ...this._history,
    ];
  }

  /**
   * If the estimated character count of the history exceeds the configured
   * fraction of the context limit, drop old entries, keeping only the most
   * recent {@link HISTORY_KEEP_ENTRIES}.
   */
  _maybetruncateHistory() {
    const config = getLLMConfig();
    const contextLimit = config?.contextLimit ?? 0;

    if (contextLimit <= 0) return; // No limit configured – skip.

    const threshold = contextLimit * CONTEXT_LIMIT_FRACTION;
    const totalChars = this._history.reduce(
      (sum, entry) => sum + (entry.content?.length ?? 0),
      0
    );

    if (totalChars > threshold) {
      // Keep only the most recent entries.
      this._history = this._history.slice(-HISTORY_KEEP_ENTRIES);
    }
  }

  /**
   * Extract all tool calls from an LLM response string.
   *
   * Expected format:
   *   <tool_call>{"name": "toolName", "args": {...}}</tool_call>
   *
   * @param {string} text
   * @returns {Array<{name: string, args: object}>}
   */
  _parseToolCalls(text) {
    const calls = [];
    // Reset lastIndex in case the regex is stateful across calls.
    TOOL_CALL_REGEX.lastIndex = 0;

    let match;
    while ((match = TOOL_CALL_REGEX.exec(text)) !== null) {
      const raw = match[1].trim();
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.name === 'string') {
          calls.push({
            name: parsed.name,
            args: parsed.args ?? {},
          });
        }
      } catch (parseErr) {
        // Malformed JSON inside <tool_call> – skip silently.
        console.warn('[AgencyEngine] Failed to parse tool_call JSON:', raw, parseErr);
      }
    }

    return calls;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Convenience factory that creates and returns an {@link AgencyEngine}.
 *
 * @param {import('./types.js').IContextProvider} provider
 * @returns {AgencyEngine}
 */
export function createEngine(provider) {
  return new AgencyEngine(provider);
}
