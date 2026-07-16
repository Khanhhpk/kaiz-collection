/**
 * regex-agency-ui.js
 * AI Agency UI Controller chuyên biệt cho quản lý Regex trong ST Multitool.
 * Học hỏi kiến trúc chat đa vòng lặp, Custom API, prefill & Staging Diff từ Preset Editor Agency.
 */

import { AgencyEngine } from './engine.js';
import { RegexContextProvider, getStagingSummary, flushStaging, clearStaging, applyStagedSingle, rejectStagedSingle, hasStagingChanges } from '../providers/regex-provider.js';
import { getLLMConfig, setLLMConfig, fetchModels } from './llm-client.js';
import { getDebugLogs, clearDebugLogs } from './debug-logger.js';
import { populateRegexAgencyDropdown, updateTargetRegexInfo } from '../../features/manage-regex.js';

let _engine = null;
let _$sidebar = null;
let _state = 'idle'; // idle | streaming | tool_calling | pending_confirm
let _isUserFollowingScroll = true;
let _injected = false;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function refreshIcons(container) {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons({ root: container });
  }
}

function setState(newState) {
  _state = newState;
  if (!_$sidebar) return;

  const $spinner = _$sidebar.find('.ai-spinner');
  const $sendBtn = _$sidebar.find('.ai-send-btn');
  const $stopBtn = _$sidebar.find('.ai-stop-btn');
  const $textarea = _$sidebar.find('.ai-input-textarea');

  if (_state === 'idle') {
    $spinner.hide();
    $sendBtn.show().prop('disabled', false);
    $stopBtn.hide();
    $textarea.prop('disabled', false);
  } else if (_state === 'streaming' || _state === 'tool_calling') {
    $spinner.show();
    $sendBtn.hide();
    $stopBtn.show();
    $textarea.prop('disabled', true);
  } else if (_state === 'pending_confirm') {
    $spinner.hide();
    $sendBtn.show().prop('disabled', false);
    $stopBtn.hide();
    $textarea.prop('disabled', false);
  }
}

function scrollToBottomIfFollowing($history, force = false) {
  if (!force && !_isUserFollowingScroll) return;
  const el = $history[0];
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}

// ─── Formatting Helper ────────────────────────────────────────────────────────

function protectCodeBlocks(text) {
  if (!text) return { protectedStr: '', map: [] };
  const map = [];
  let s = String(text).replace(/```[\s\S]*?```/g, (match) => {
    const key = `__ST_CODE_BLOCK_${map.length}__`;
    map.push({ key, value: match });
    return key;
  });
  s = s.replace(/`[^`\n]+`/g, (match) => {
    const key = `__ST_CODE_BLOCK_${map.length}__`;
    map.push({ key, value: match });
    return key;
  });
  return { protectedStr: s, map };
}

function restoreCodeBlocks(text, map) {
  if (!text) return '';
  if (!map || !map.length) return String(text);
  let s = String(text);
  for (let i = map.length - 1; i >= 0; i--) {
    s = s.split(map[i].key).join(map[i].value);
  }
  return s;
}

function cleanAssistantText(text) {
  if (!text) return '';
  const { protectedStr, map } = protectCodeBlocks(text);
  let s = protectedStr;

  // 1. Loại bỏ toàn bộ <tool_call>...</tool_call> (hoặc thẻ tool_call đang mở dở) outside code
  s = s.replace(/<tool_call>[\s\S]*?(<\/tool_call>|$)/gi, '');

  // 2. Loại bỏ CoT (<agency_cot>...</agency_cot> hoặc prefill) outside code
  if (s.includes('</agency_cot>')) {
    const parts = s.split('</agency_cot>');
    s = parts.slice(1).join('</agency_cot>');
  } else if (s.includes('<agency_cot>')) {
    s = s.replace(/<agency_cot>[\s\S]*?(<\/agency_cot>|$)/gi, '');
  }

  return restoreCodeBlocks(s.trim(), map);
}

function renderAiMarkdownHtml(rawText) {
  if (!rawText) return '';
  let s = String(rawText);

  // 1. Bảo vệ các thẻ UI an toàn (icon Lucide, span, b, strong, em, code, pre, details, summary, br) trước khi escape
  const safeTags = [];
  s = s.replace(/<(i data-lucide="[^"]+"[^>]*>|<\/i>|span[^>]*>|<\/span>|b>|<\/b>|strong[^>]*>|<\/strong>|em[^>]*>|<\/em>|code[^>]*>|<\/code>|pre[^>]*>|<\/pre>|details[^>]*>|<\/details>|summary[^>]*>|<\/summary>|br\s*\/?>)/gi, (match) => {
    const placeholder = `__ST_SAFE_UI_TAG_${safeTags.length}__`;
    safeTags.push(match);
    return placeholder;
  });

  // 2. Escape HTML cho phần văn bản còn lại (chống XSS từ AI / dữ liệu)
  s = typeof escapeHtml === 'function' ? escapeHtml(s) : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  // 3. Khôi phục lại các thẻ UI an toàn đã bảo vệ
  s = s.replace(/__ST_SAFE_UI_TAG_(\d+)__/g, (match, idx) => {
    return safeTags[Number(idx)] || match;
  });

  // 4. Kiểm tra thư viện marked toàn cục của SillyTavern nếu có (trên window)
  if (typeof window !== 'undefined' && window.marked && typeof window.marked.parse === 'function') {
    try {
      return window.marked.parse(s);
    } catch (e) {}
  }

  // 5. Fallback Markdown rành mạch (code blocks, inline code, headings, bold, italic, lists, newlines)
  // 5.1 Fenced Code Blocks
  s = s.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, codeContent) => {
    return `<pre class="ai-code-block" style="background:#0b1329;border:1px solid rgba(255,255,255,0.12);padding:8px 10px;border-radius:6px;overflow-x:auto;font-family:Consolas,monospace;font-size:11.5px;margin:6px 0;color:#e2e8f0;"><code>${codeContent}</code></pre>`;
  });

  // 5.2 Inline Code (`...`)
  s = s.replace(/`([^`\n]+)`/g, (match, code) => {
    return `<code style="background:rgba(255,255,255,0.12);padding:2px 5px;border-radius:4px;color:#38bdf8;font-family:Consolas,monospace;font-size:11px;">${code}</code>`;
  });

  // 5.3 Headings
  s = s.replace(/^###\s+(.+)$/gm, '<h3 style="color:#c084fc;margin:8px 0 4px 0;font-size:13.5px;font-weight:700;">$1</h3>');
  s = s.replace(/^##\s+(.+)$/gm, '<h2 style="color:#c084fc;margin:10px 0 4px 0;font-size:14.5px;font-weight:700;">$1</h2>');
  s = s.replace(/^#\s+(.+)$/gm, '<h1 style="color:#c084fc;margin:12px 0 6px 0;font-size:15.5px;font-weight:700;">$1</h1>');

  // 5.4 Bold (** hoặc __ across multiline)
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, '<strong style="color:#f8fafc;font-weight:700;">$1</strong>');
  s = s.replace(/__([\s\S]+?)__/g, '<strong style="color:#f8fafc;font-weight:700;">$1</strong>');

  // 5.5 Italic (* hoặc _ trong cùng dòng hoặc multiline ngắn)
  s = s.replace(/\*([^\*\n]+?)\*/g, '<em style="font-style:italic;">$1</em>');

  // 5.6 Bullet lists (- hoặc •)
  s = s.replace(/^\s*[-•]\s+(.+)$/gm, '<div style="display:flex;gap:6px;margin:3px 0;padding-left:4px;"><span style="color:#c084fc;font-weight:bold;">•</span><span>$1</span></div>');

  // 5.7 Numbered lists (1. 2.)
  s = s.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<div style="display:flex;gap:6px;margin:3px 0;padding-left:4px;"><span style="color:#38bdf8;font-weight:bold;">$1.</span><span>$2</span></div>');

  // 5.8 Chuyển đổi \n thành <br> (loại bỏ newlines bao quanh thẻ khối để tránh khoảng trắng thừa)
  s = s.replace(/\n(?=<div|<h[1-3]|<pre|<\/div>|<\/h[1-3]>|<\/pre>)/gi, '');
  s = s.replace(/(<\/div>|<\/h[1-3]>|<\/pre>)\n/gi, '$1');
  s = s.replace(/\n/g, '<br>');

  return s;
}

function formatAssistantBubbleHtml(rawText, isDev) {
  if (!rawText) return '';

  if (!isDev) {
    const cleaned = cleanAssistantText(rawText);
    if (!cleaned && /<tool_call>/i.test(rawText)) {
      return `<div style="color:#64748b;font-style:italic;font-size:11.5px;padding:2px 0;">[🤖 AI Agency đang thực thi thao tác Regex qua tool...]</div>`;
    }
    if (!cleaned) return '';
    return renderAiMarkdownHtml(cleaned);
  } else {
    // Dev Mode: Hiển thị đầy đủ CoT (<agency_cot>) và Tool Call (<tool_call>) đẹp, nổi bật
    const { protectedStr, map } = protectCodeBlocks(rawText);
    let s = protectedStr;
    let htmlParts = [];

    // 1. Tách CoT (<agency_cot>) nếu có
    if (s.includes('</agency_cot>')) {
      const parts = s.split('</agency_cot>');
      let cotText = parts[0].replace(/^.*<agency_cot>\n?/i, '').trim();
      if (!cotText) cotText = parts[0].trim();
      cotText = restoreCodeBlocks(cotText, map);

      htmlParts.push(
        `<div class="ai-dev-cot-box" style="margin:4px 0 8px 0;padding:8px 10px;background:rgba(234,179,8,0.1);border-left:3px solid #eab308;border-radius:4px;font-size:11px;color:#fef08a;">` +
        `<div style="color:#facc15;font-weight:bold;margin-bottom:4px;display:flex;align-items:center;gap:4px;"><i data-lucide="brain" style="width:13px;height:13px;vertical-align:-2px;"></i> [DEV VIEW: Chain of Thought (&lt;agency_cot&gt;)]</div>` +
        `<div style="white-space:pre-wrap;line-height:1.4;font-family:Consolas,monospace;">${typeof escapeHtml === 'function' ? escapeHtml(cotText) : cotText}</div>` +
        `</div>`
      );
      s = parts.slice(1).join('</agency_cot>').trim();
    } else if (s.includes('<agency_cot>')) {
      const parts = s.split('<agency_cot>');
      let cotText = parts.slice(1).join('<agency_cot>').trim();
      cotText = restoreCodeBlocks(cotText, map);
      htmlParts.push(
        `<div class="ai-dev-cot-box" style="margin:4px 0 8px 0;padding:8px 10px;background:rgba(234,179,8,0.1);border-left:3px solid #eab308;border-radius:4px;font-size:11px;color:#fef08a;">` +
        `<div style="color:#facc15;font-weight:bold;margin-bottom:4px;display:flex;align-items:center;gap:4px;"><i data-lucide="brain" style="width:13px;height:13px;vertical-align:-2px;"></i> [DEV VIEW: Chain of Thought (&lt;agency_cot&gt;)]</div>` +
        `<div style="white-space:pre-wrap;line-height:1.4;font-family:Consolas,monospace;">${typeof escapeHtml === 'function' ? escapeHtml(cotText) : cotText}</div>` +
        `</div>`
      );
      s = parts[0].trim();
    }

    // 2. Format từng phần text chính và thẻ <tool_call>
    const toolCallRegex = /<tool_call>([\s\S]*?)(<\/tool_call>|$)/gi;
    let lastIndex = 0;
    let match;

    while ((match = toolCallRegex.exec(s)) !== null) {
      const textBefore = restoreCodeBlocks(s.slice(lastIndex, match.index).trim(), map);
      if (textBefore) {
        htmlParts.push(
          `<div style="margin-bottom:8px;">` +
          renderAiMarkdownHtml(textBefore) +
          `</div>`
        );
      }

      const jsonStr = restoreCodeBlocks(match[1].trim(), map);
      htmlParts.push(
        `<div class="ai-dev-tool-box" style="margin:6px 0 8px 0;padding:8px 10px;background:rgba(168,85,247,0.12);border-left:3px solid #a855f7;border-radius:4px;font-family:Consolas,monospace;font-size:11px;color:#e9d5ff;">` +
        `<div style="color:#c084fc;font-weight:bold;margin-bottom:4px;display:flex;align-items:center;gap:4px;"><i data-lucide="wrench" style="width:13px;height:13px;vertical-align:-2px;"></i> [DEV VIEW: Raw Tool Call]</div>` +
        `<div style="white-space:pre-wrap;word-break:break-all;">${typeof escapeHtml === 'function' ? escapeHtml(jsonStr) : jsonStr}</div>` +
        `</div>`
      );

      lastIndex = toolCallRegex.lastIndex;
    }

    const textAfter = restoreCodeBlocks(s.slice(lastIndex).trim(), map);
    if (textAfter) {
      htmlParts.push(
        `<div style="margin-top:4px;">` +
        renderAiMarkdownHtml(textAfter) +
        `</div>`
      );
    }

    if (htmlParts.length === 0 && s) {
      htmlParts.push(renderAiMarkdownHtml(s));
    }

    return htmlParts.join('');
  }
}

function appendBubble(role, content, opts = {}) {
  const $history = _$sidebar.find('.ai-chat-history');
  let bubbleHtml = '';

  if (role === 'user') {
    const parsed = typeof marked !== 'undefined' && marked.parse ? marked.parse(content || '') : escapeHtml(content || '');
    bubbleHtml = `
      <div class="ai-bubble ai-bubble-user">
        <div class="ai-bubble-content">${parsed}</div>
      </div>`;
  } else if (role === 'tool') {
    const icon = opts.ok
      ? '<i data-lucide="check-circle-2" style="width:13px;height:13px;color:#34d399;vertical-align:-2px;margin-right:4px;"></i>'
      : '<i data-lucide="alert-triangle" style="width:13px;height:13px;color:#fbbf24;vertical-align:-2px;margin-right:4px;"></i>';
    bubbleHtml = `
      <div class="ai-bubble ai-bubble-tool">
        <span class="ai-tool-label">${icon}<b>${escapeHtml(opts.toolName || 'tool')}</b></span>
        <div class="ai-tool-result">${escapeHtml(typeof content === 'string' ? content : JSON.stringify(content))}</div>
      </div>`;
  } else {
    const rawEncoded = encodeURIComponent(content || '');
    bubbleHtml = `
      <div class="ai-bubble ai-bubble-assistant" id="ai-regex-bubble-${Date.now()}" data-raw-content="${rawEncoded}">
        <div class="ai-bubble-content ai-streaming-content"></div>
      </div>`;
  }

  $history.append(bubbleHtml);
  const $lastBubble = $history.children().last();
  if (role === 'assistant' && content) {
    updateAssistantBubbleHtml($lastBubble, content);
    $lastBubble.find('.ai-bubble-content').removeClass('ai-streaming-content');
  }
  refreshIcons($lastBubble[0]);
  scrollToBottomIfFollowing($history, role === 'user' || opts.forceScroll);
  return $lastBubble;
}

function updateAssistantBubbleHtml($bubble, fullRawText) {
  if (!$bubble || !$bubble.length) return;
  $bubble.attr('data-raw-content', encodeURIComponent(fullRawText || ''));
  const isDev = _$sidebar.find('.ai-dev-toggle-btn').hasClass('active');
  const html = formatAssistantBubbleHtml(fullRawText, isDev);
  $bubble.find('.ai-bubble-content').html(html);
}

function renderStreamingBuffer(buffer) {
  const $history = _$sidebar.find('.ai-chat-history');
  const $last = $history.find('.ai-bubble-assistant').last();
  if (!$last.length) return;
  updateAssistantBubbleHtml($last, buffer);
  scrollToBottomIfFollowing($history, false);
}

function finalizeStreamingBubble(finalText) {
  const $history = _$sidebar.find('.ai-chat-history');
  const $last = $history.find('.ai-bubble-assistant').last();
  if (!$last.length) return;
  $last.find('.ai-bubble-content').removeClass('ai-streaming-content');
  updateAssistantBubbleHtml($last, finalText);
  scrollToBottomIfFollowing($history, true);
}

// ─── Tool Preview & Staging Diff ──────────────────────────────────────────────

function renderRegexToolPreview() {
  const summary = getStagingSummary();
  const $preview = _$sidebar.find('.ai-tool-preview');
  if (summary.length === 0) {
    $preview.hide();
    return;
  }

  let diffHtml = '';
  summary.forEach(diff => {
    const color = diff.type === 'create' ? '#34d399' : (diff.type === 'delete' ? '#f87171' : '#38bdf8');
    const bg = diff.type === 'create' ? 'rgba(52,211,153,0.06)' : (diff.type === 'delete' ? 'rgba(248,113,113,0.06)' : 'rgba(56,189,248,0.06)');
    const border = diff.type === 'create' ? 'rgba(52,211,153,0.25)' : (diff.type === 'delete' ? 'rgba(248,113,113,0.25)' : 'rgba(56,189,248,0.25)');

    let changesDetailsHtml = '';
    diff.changes.forEach(ch => {
      changesDetailsHtml += `
        <div style="margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:4px;">
          <span style="color:#94a3b8;font-size:10.5px;font-weight:bold;">${escapeHtml(ch.field)}:</span>
          ${ch.field.includes('Pattern') || ch.field.includes('Replace String') ? `
            <div style="background:#0b1329;padding:4px 6px;border-radius:4px;font-family:Consolas,monospace;color:${color};margin-top:2px;word-break:break-all;">${escapeHtml(ch.newVal)}</div>
          ` : `
            <span style="color:#e2e8f0;margin-left:4px;">${escapeHtml(ch.newVal)}</span>
          `}
        </div>`;
    });

    diffHtml += `
      <div class="ai-diff-item ai-staged-item" data-type="${diff.type}" data-key="${escapeHtml(diff.key)}" style="background:${bg};border:1px solid ${border};border-radius:6px;padding:8px;margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
          <div class="ai-staged-toggle-diff" style="cursor:pointer;display:flex;align-items:center;gap:6px;flex:1;">
            <i data-lucide="${diff.type === 'create' ? 'plus-circle' : diff.type === 'delete' ? 'trash-2' : 'edit-3'}" style="width:14px;height:14px;color:${color};"></i>
            <span style="color:#e2e8f0;font-weight:600;font-size:12px;">${escapeHtml(diff.title)}</span>
            <span style="font-size:11px;color:${color};text-decoration:underline;margin-left:auto;">👁️ Chi tiết</span>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="ai-single-apply-btn" data-type="${diff.type}" data-key="${escapeHtml(diff.key)}" style="background:rgba(52,211,153,0.15);border:1px solid #34d399;color:#34d399;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600;">Áp dụng riêng</button>
            <button class="ai-single-reject-btn" data-type="${diff.type}" data-key="${escapeHtml(diff.key)}" style="background:rgba(248,113,113,0.15);border:1px solid #f87171;color:#f87171;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600;">Bỏ</button>
          </div>
        </div>
        <div class="ai-staged-diff-box" style="display:none;margin-top:8px;padding:8px;background:#0f172a;border-radius:4px;font-size:11px;color:#e2e8f0;">
          ${changesDetailsHtml}
        </div>
      </div>`;
  });

  _$sidebar.find('.ai-preview-stats').html(`<i data-lucide="clipboard-list" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> ${summary.length} thay đổi Regex đang chờ xác nhận (Bấm vào từng mục để xem chi tiết)`);
  _$sidebar.find('.ai-preview-diff').html(diffHtml);
  refreshIcons($preview[0]);
  $preview.show();
}

// ─── Config & Debug Panel Render ──────────────────────────────────────────────

function renderRegexConfigPanel() {
  const cfg = getLLMConfig();
  _$sidebar.find('#regex-ai-cfg-endpoint').val(cfg.endpoint);
  _$sidebar.find('#regex-ai-cfg-apikey').val(cfg.apiKey);
  _$sidebar.find('#regex-ai-cfg-context').val(cfg.contextLimit);
  _$sidebar.find('#regex-ai-cfg-maxout').val(cfg.maxOutput);
  _$sidebar.find('#regex-ai-cfg-maxiter').val(cfg.maxIterations ?? 30);
  _$sidebar.find('#regex-ai-cfg-retries').val(cfg.maxRetries ?? 3);

  const $modelSelect = _$sidebar.find('#regex-ai-cfg-model');
  if ($modelSelect.find(`option[value="${cfg.model}"]`).length === 0 && cfg.model) {
    $modelSelect.append(`<option value="${cfg.model}" selected>${cfg.model}</option>`);
  } else {
    $modelSelect.val(cfg.model);
  }
}

function renderRegexDebugPanel() {
  const logs = getDebugLogs();
  const $content = _$sidebar.find('.ai-debug-content');
  if (logs.length === 0) {
    $content.html('<div style="color:#888;font-style:italic;padding:8px 0;">Chưa có log API nào cho Regex Agency. Hãy gửi yêu cầu để xem chi tiết payload gửi cho AI.</div>');
    return;
  }

  let html = '';
  logs.forEach(l => {
    const statusColor = l.status === 'DONE' ? '#34d399' : (l.status === 'ERROR' ? '#f87171' : '#60a5fa');
    const fullPayload = JSON.stringify({ model: l.model, options: l.options, messages: l.messages }, null, 2);

    html += `
      <div style="border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px;margin-bottom:8px;background:rgba(0,0,0,0.3);font-size:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="color:#e2e8f0;font-weight:bold;">🕒 ${l.time} (${l.mode.toUpperCase()})</span>
          <span style="color:${statusColor};font-weight:bold;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.05);">${l.status} ${l.duration ? `(${l.duration}ms)` : ''}</span>
        </div>
        <div style="color:#94a3b8;font-size:11px;margin-bottom:4px;">📌 Endpoint: ${escapeHtml(l.endpoint)} | Model: ${escapeHtml(l.model)}</div>
        <details style="margin-top:6px;cursor:pointer;">
          <summary style="color:#38bdf8;font-weight:500;">📤 Tải trọng gửi đi (${(l.messages || []).length} layers)</summary>
          <pre style="background:#0f172a;padding:8px;border-radius:4px;overflow-x:auto;max-height:220px;color:#a5f3fc;font-family:monospace;font-size:11px;margin-top:4px;white-space:pre-wrap;">${escapeHtml(fullPayload)}</pre>
        </details>
        ${l.error ? `
        <div style="margin-top:6px;padding:6px;background:rgba(239,68,68,0.15);border-left:3px solid #ef4444;color:#fca5a5;font-family:monospace;font-size:11px;">
          <b>⚠️ Lỗi API:</b> ${escapeHtml(l.error)}
        </div>` : ''}
        ${l.response && !l.error ? `
        <details style="margin-top:4px;cursor:pointer;">
          <summary style="color:#a7f3d0;font-weight:500;">📥 Phản hồi nhận về (${l.response.length} chars)</summary>
          <pre style="background:#0f172a;padding:8px;border-radius:4px;overflow-x:auto;max-height:180px;color:#d1fae5;font-family:monospace;font-size:11px;margin-top:4px;white-space:pre-wrap;">${escapeHtml(l.response)}</pre>
        </details>` : ''}
      </div>`;
  });

  $content.html(html);
}

// ─── Build Sidebar Markup ─────────────────────────────────────────────────────

function buildRegexSidebarHTML() {
  return `
    <div class="ai-agency-sidebar" id="st-multitool-regex-agency-sidebar">
      <!-- Header -->
      <div class="ai-header">
        <span class="ai-header-title">
          <i data-lucide="bot" style="width:18px;height:18px;margin-right:6px;vertical-align:-3px;color:#c084fc;"></i> AI Agency Regex
          <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;background:rgba(168,85,247,0.25);color:#d8b4fe;border:1px solid rgba(192,132,252,0.5);margin-left:6px;">Side Agency</span>
        </span>
        <div class="ai-header-actions">
          <button class="ai-icon-btn ai-dev-toggle-btn" title="Chế độ nhà phát triển (Xem CoT & Tool calls)">
            <i data-lucide="code" style="width:14px;height:14px;"></i>
          </button>
          <button class="ai-icon-btn ai-debug-btn" title="LLM Debug Logs (>_)">
            <i data-lucide="terminal" style="width:14px;height:14px;"></i>
          </button>
          <button class="ai-icon-btn ai-clear-btn" title="Xóa lịch sử trò chuyện">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
          </button>
          <button class="ai-icon-btn ai-cfg-btn" title="Cài đặt API & Model">
            <i data-lucide="settings" style="width:14px;height:14px;"></i>
          </button>
          <button id="st-multitool-regex-agency-close-btn" class="ai-icon-btn ai-close-btn" title="Đóng AI Agency Regex">
            <i data-lucide="x" style="width:16px;height:16px;"></i>
          </button>
        </div>
      </div>

      <!-- Config Panel (hidden by default) -->
      <div class="ai-config-panel" style="display:none;padding:12px;border-bottom:1px solid rgba(255,255,255,0.1);background:rgba(15,23,42,0.95);">
        <div style="font-weight:bold;color:#c084fc;margin-bottom:8px;font-size:13px;display:flex;align-items:center;gap:6px;">
          <i data-lucide="sliders" style="width:14px;height:14px;"></i> Cài đặt Custom API & Model (Chung cho AI Agency)
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Endpoint</label>
          <input type="text" id="regex-ai-cfg-endpoint" class="ai-cfg-input" placeholder="http://127.0.0.1:5001/v1">
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">API Key</label>
          <input type="password" id="regex-ai-cfg-apikey" class="ai-cfg-input" placeholder="sk-...">
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Model</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <select id="regex-ai-cfg-model" class="ai-cfg-input" style="flex:1;"></select>
            <button class="ai-icon-btn ai-fetch-models-btn" title="Tải danh sách model từ Endpoint">
              <i data-lucide="refresh-cw" style="width:13px;height:13px;"></i>
            </button>
          </div>
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Context limit</label>
          <input type="number" id="regex-ai-cfg-context" class="ai-cfg-input" style="width:100px;" value="32000"> tokens
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Max output</label>
          <input type="number" id="regex-ai-cfg-maxout" class="ai-cfg-input" style="width:100px;" value="4000"> tokens
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Max Auto Agent</label>
          <input type="number" id="regex-ai-cfg-maxiter" class="ai-cfg-input" style="width:100px;" value="30" min="1" max="200"> Số Call/1 task
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Max retries</label>
          <input type="number" id="regex-ai-cfg-retries" class="ai-cfg-input" style="width:100px;" value="3" min="0" max="15"> lần
        </div>
        <button class="ai-save-cfg-btn" style="width:100%;background:linear-gradient(135deg,#c084fc,#818cf8);color:#0f172a;font-weight:bold;padding:8px;border-radius:6px;border:none;cursor:pointer;margin-top:6px;">
          <i data-lucide="save" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Lưu cài đặt
        </button>
      </div>

      <!-- Debug Log Panel (hidden by default) -->
      <div class="ai-debug-panel" style="display:none;padding:12px;border-bottom:1px solid rgba(255,255,255,0.1);max-height:340px;overflow-y:auto;background:rgba(15,23,42,0.95);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <span style="font-weight:bold;color:#34d399;font-size:13px;"><i data-lucide="file-text" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> LLM Debug Logs & Tải Trọng Gửi Đi</span>
          <button class="ai-clear-debug-btn" style="background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.5);color:#fca5a5;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;"><i data-lucide="trash-2" style="width:12px;height:12px;vertical-align:-1px;margin-right:3px;"></i> Xóa log</button>
        </div>
        <div class="ai-debug-content"></div>
      </div>

      <!-- Target Regex Selector Bar pinned below header -->
      <div style="padding:10px 14px;background:rgba(15,23,42,0.6);border-bottom:1px solid rgba(192,132,252,0.2);display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <i data-lucide="target" style="width:14px;height:14px;color:#c084fc;"></i>
          <span style="font-size:12px;font-weight:700;color:#e2e8f0;">Regex mục tiêu:</span>
          <select id="st-multitool-regex-agency-target-select" class="st-multitool-select" style="flex:1;background:rgba(15,23,42,0.9);border:1px solid rgba(192,132,252,0.4);color:#f8fafc;font-weight:600;border-radius:6px;padding:6px 10px;font-size:12px;">
            <option value="__AUTO__">🤖 Regex Agency Tự động (Auto / Global Mode)</option>
          </select>
          <button id="st-multitool-regex-agency-refresh-targets" type="button" style="background:rgba(192,132,252,0.15);border:1px solid rgba(192,132,252,0.4);color:#d8b4fe;border-radius:6px;padding:6px 8px;cursor:pointer;" title="Làm mới danh sách Regex"><i data-lucide="refresh-cw" style="width:13px;height:13px;"></i></button>
        </div>
        <div id="st-multitool-regex-agency-target-info" style="font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:6px;">
          <i data-lucide="bot" style="width:14px;height:14px;color:#a855f7;flex-shrink:0;"></i> Chế độ: <b>Tự động toàn quyền</b> (Hoạt động rộng và chung lên toàn bộ Regex hiện có).
        </div>
      </div>

      <!-- Chat History -->
      <div class="ai-chat-history"></div>

      <!-- Streaming indicator -->
      <div class="ai-spinner" style="display:none;">
        <span class="ai-spinner-dot"></span><span class="ai-spinner-dot"></span><span class="ai-spinner-dot"></span>
      </div>

      <!-- Tool Preview Card -->
      <div class="ai-tool-preview" style="display:none;">
        <div class="ai-preview-stats"></div>
        <div class="ai-preview-diff"></div>
        <div class="ai-preview-actions">
          <button class="ai-apply-btn"><i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Áp dụng tất cả</button>
          <button class="ai-reject-btn"><i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Hủy tất cả</button>
        </div>
      </div>
      <!-- Input Area -->
      <div class="ai-input-area">
        <textarea class="ai-input-textarea" placeholder="Nhập yêu cầu Regex cho AI Agent... (Shift+Enter xuống dòng)" rows="2"></textarea>
        <div class="ai-input-controls">
          <button class="ai-send-btn" title="Gửi (Enter)">
            <i data-lucide="send" style="width:15px;height:15px;"></i> Gửi
          </button>
          <button class="ai-stop-btn" style="display:none;" title="Dừng">
            <i data-lucide="square" style="width:15px;height:15px;"></i> Dừng
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Bind Events ──────────────────────────────────────────────────────────────

function _bindEvents() {
  const $history = _$sidebar.find('.ai-chat-history');

  $history.on('scroll', () => {
    const el = $history[0];
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    _isUserFollowingScroll = isAtBottom;
  });

  // Toggle Dev mode
  _$sidebar.find('.ai-dev-toggle-btn').on('click', function() {
    $(this).toggleClass('active');
    const isDev = $(this).hasClass('active');
    if (isDev) {
      $(this).css('background', 'rgba(168,85,247,0.3)').css('color', '#d8b4fe');
      toastr.info('Đã bật Chế độ Nhà phát triển (Xem CoT & Tool Calls)');
    } else {
      $(this).css('background', '').css('color', '');
    }
    $history.find('.ai-bubble-assistant').each(function() {
      const rawEncoded = $(this).attr('data-raw-content') || '';
      if (rawEncoded) {
        const rawText = decodeURIComponent(rawEncoded);
        $(this).find('.ai-bubble-content').html(formatAssistantBubbleHtml(rawText, isDev));
      }
    });
    refreshIcons($history[0]);
  });

  // Toggle Config
  _$sidebar.find('.ai-cfg-btn').on('click', () => {
    const $panel = _$sidebar.find('.ai-config-panel');
    const isVisible = $panel.is(':visible');
    _$sidebar.find('.ai-debug-panel').hide();
    if (!isVisible) {
      renderRegexConfigPanel();
      $panel.slideDown(200);
    } else {
      $panel.slideUp(200);
    }
  });

  // Toggle Debug Logs
  _$sidebar.find('.ai-debug-btn').on('click', () => {
    const $panel = _$sidebar.find('.ai-debug-panel');
    const isVisible = $panel.is(':visible');
    _$sidebar.find('.ai-config-panel').hide();
    if (!isVisible) {
      renderRegexDebugPanel();
      $panel.slideDown(200);
    } else {
      $panel.slideUp(200);
    }
  });

  // Close button
  _$sidebar.find('.ai-close-btn').on('click', () => {
    _$sidebar.css('display', '');
    $('#st-multitool-manage-regex-view').removeClass('ai-agency-active');
    $('#st-multitool-regex-ai-agency-toggle-btn-inline').css('background', 'linear-gradient(135deg, rgba(192,132,252,0.18), rgba(56,189,248,0.18))');
  });

  // Clear Debug
  _$sidebar.find('.ai-clear-debug-btn').on('click', () => {
    clearDebugLogs();
    renderRegexDebugPanel();
  });

  window.addEventListener('st-multitool-ai-debug-update', () => {
    if (_$sidebar && _$sidebar.find('.ai-debug-panel').is(':visible')) {
      renderRegexDebugPanel();
    }
  });

  // Fetch models
  _$sidebar.find('.ai-fetch-models-btn').on('click', async () => {
    const endpoint = _$sidebar.find('#regex-ai-cfg-endpoint').val().trim();
    const apiKey = _$sidebar.find('#regex-ai-cfg-apikey').val().trim();
    if (!endpoint) { toastr.warning('Nhập Endpoint trước.'); return; }
    try {
      toastr.info('Đang tải danh sách model...');
      const models = await fetchModels(endpoint, apiKey);
      const $select = _$sidebar.find('#regex-ai-cfg-model');
      $select.empty();
      models.forEach(m => $select.append(`<option value="${m.id}">${m.name}</option>`));
      toastr.success(`Tải được ${models.length} model.`);
    } catch (e) {
      toastr.error('Lỗi tải model: ' + e.message);
    }
  });

  // Save config
  _$sidebar.find('.ai-save-cfg-btn').on('click', () => {
    const parsedRetries = parseInt(_$sidebar.find('#regex-ai-cfg-retries').val(), 10);
    setLLMConfig({
      mode: 'custom',
      endpoint: _$sidebar.find('#regex-ai-cfg-endpoint').val().trim(),
      apiKey: _$sidebar.find('#regex-ai-cfg-apikey').val().trim(),
      model: _$sidebar.find('#regex-ai-cfg-model').val() || 'gpt-4o-mini',
      contextLimit: parseInt(_$sidebar.find('#regex-ai-cfg-context').val(), 10) || 32000,
      maxOutput: parseInt(_$sidebar.find('#regex-ai-cfg-maxout').val(), 10) || 4000,
      maxIterations: parseInt(_$sidebar.find('#regex-ai-cfg-maxiter').val(), 10) || 30,
      maxRetries: !isNaN(parsedRetries) && parsedRetries >= 0 ? parsedRetries : 3,
    });
    window._stMultitoolLLMConfig = getLLMConfig();
    toastr.success('Đã lưu cấu hình AI cho Regex Agency.');
    _$sidebar.find('.ai-config-panel').slideUp(200);
  });

  // Target select change -> update info and sync provider mode
  _$sidebar.find('#st-multitool-regex-agency-target-select').on('change', function() {
    const val = $(this).val();
    updateTargetRegexInfo();
    if (_engine && _engine._provider && typeof _engine._provider.setTargetRegexId === 'function') {
      _engine._provider.setTargetRegexId(val);
    }
  });

  // Refresh targets
  _$sidebar.find('#st-multitool-regex-agency-refresh-targets').on('click', () => {
    populateRegexAgencyDropdown();
    toastr.info('Đã làm mới danh sách Regex mục tiêu.');
  });
  // Clear history
  _$sidebar.find('.ai-clear-btn').on('click', () => {
    _engine.clearHistory();
    $history.empty();
    _isUserFollowingScroll = true;
    appendBubble('assistant', '<i data-lucide="trash-2" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Đã xóa lịch sử. Bắt đầu cuộc trò chuyện mới.');
  });

  // Send message
  const sendMessage = async () => {
    if (_state !== 'idle') return;
    let text = _$sidebar.find('.ai-input-textarea').val().trim();
    if (!text) return;

    // Kèm thêm ngữ cảnh Regex mục tiêu đang chọn và đồng bộ chế độ provider
    const targetId = _$sidebar.find('#st-multitool-regex-agency-target-select').val();
    const targetName = _$sidebar.find('#st-multitool-regex-agency-target-select').find('option:selected').data('name');
    if (_engine && _engine._provider && typeof _engine._provider.setTargetRegexId === 'function') {
      _engine._provider.setTargetRegexId(targetId);
    }

    let contextPrefix = '';
    if (targetId === '__AUTO__' || !targetId) {
      contextPrefix = `[Ngữ cảnh: Người dùng đang ở chế độ Tự động toàn quyền (Auto / Global Mode), cho phép quản lý toàn bộ Regex hiện có] `;
    } else if (targetId === '__NEW__') {
      contextPrefix = `[Ngữ cảnh: Người dùng đang ở chế độ Tạo mới Regex từ đầu (Create New Mode)] `;
    } else {
      contextPrefix = `[Ngữ cảnh: Người dùng đang chọn chỉnh sửa độc quyền cho Regex mục tiêu ID "${targetId}" (${targetName || ''})] `;
    }

    _isUserFollowingScroll = true;
    _$sidebar.find('.ai-input-textarea').val('');
    appendBubble('user', text, { forceScroll: true });

    let currentAssistantBubble = null;
    let streamBuffer = '';

    setState('streaming');

    await _engine.runTask(contextPrefix + text, {
      onChunk: (token) => {
        if (!currentAssistantBubble) {
          currentAssistantBubble = appendBubble('assistant', '');
        }
        streamBuffer += token;
        renderStreamingBuffer(streamBuffer);
      },
      onToolCall: (toolCall) => {
        setState('tool_calling');
        if (currentAssistantBubble && streamBuffer) {
          finalizeStreamingBubble(streamBuffer);
          streamBuffer = '';
          currentAssistantBubble = null;
        }
        appendBubble('tool', `Đang gọi: ${toolCall.name}`, { toolName: toolCall.name, ok: true });
      },
      onToolResult: (toolName, result) => {
        const $last = _$sidebar.find('.ai-bubble-tool').last().find('.ai-tool-result');
        let summaryText = '';
        if (typeof result?.summary === 'string') {
          summaryText = result.summary;
        } else if (result?.message) {
          summaryText = result.message;
        } else if (result?.ok) {
          summaryText = '✓ Hoàn tất thành công';
        } else {
          summaryText = typeof result === 'string' ? result : JSON.stringify(result).slice(0, 80);
        }
        $last.text(summaryText);

        if (toolName === 'save_regex_changes' || result?.pending_review) {
          renderRegexToolPreview();
          setState('pending_confirm');
        } else {
          setState('streaming');
        }
        currentAssistantBubble = null;
        streamBuffer = '';
      },
      onDone: (finalText) => {
        if (streamBuffer) {
          finalizeStreamingBubble(streamBuffer);
          streamBuffer = '';
        } else if (finalText && !currentAssistantBubble) {
          const cleaned = cleanAssistantText(finalText);
          if (cleaned) {
            currentAssistantBubble = appendBubble('assistant', '');
            finalizeStreamingBubble(finalText);
          }
        } else if (!finalText && !currentAssistantBubble) {
          currentAssistantBubble = appendBubble('assistant', '');
          finalizeStreamingBubble('<i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;color:#fbbf24;"></i> **API trả về phản hồi rỗng (0 tokens).**\n\n💡 Bấm vào nút **[<i data-lucide="terminal" style="width:13px;height:13px;vertical-align:-2px;"></i> Debug Logs]** trên thanh tiêu đề để xem chi tiết tải trọng hoặc lỗi từ API.');
        }
        if (hasStagingChanges()) renderRegexToolPreview();
        setState('idle');
      },
      onError: (err) => {
        if (err?.name === 'AbortError') {
          appendBubble('assistant', '<i data-lucide="square" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Đã dừng.');
        } else {
          const errMsg = err?.message || String(err);
          if (!currentAssistantBubble) {
            appendBubble('assistant', `<i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;color:#fbbf24;"></i> **Lỗi thực thi LLM:** ${errMsg}\n\n💡 Bấm vào nút **[<i data-lucide="terminal" style="width:13px;height:13px;vertical-align:-2px;"></i> Debug Logs]** để kiểm tra.`);
          } else {
            finalizeStreamingBubble(streamBuffer + `\n\n<i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;color:#fbbf24;"></i> **Lỗi:** ${errMsg}`);
            streamBuffer = '';
            currentAssistantBubble = null;
          }
        }
        if (hasStagingChanges()) renderRegexToolPreview();
        setState('idle');
      }
    });
  };

  _$sidebar.find('.ai-send-btn').on('click', sendMessage);
  _$sidebar.find('.ai-input-textarea').on('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  _$sidebar.find('.ai-stop-btn').on('click', () => {
    _engine.abort();
    setState('idle');
    appendBubble('assistant', '<i data-lucide="square" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Đã dừng theo yêu cầu.');
  });

  // Apply all staging
  _$sidebar.find('.ai-apply-btn').on('click', async () => {
    try {
      await flushStaging();
      _$sidebar.find('.ai-tool-preview').hide();
      setState('idle');
      toastr.success('Đã áp dụng thay đổi vào Quản lý Regex (Sandbox)!');
      appendBubble('assistant', '<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;color:#34d399;"></i> Đã áp dụng các thay đổi vào danh sách Quản lý Regex (Sandbox). Hãy bấm nút **"Lưu tất cả Regex"** trên thanh công cụ khi bạn muốn chính thức lưu vào SillyTavern.');
      _engine?.addMessage('user', '[Hệ thống: Người dùng đã bấm Chấp Nhận (Apply) tất cả các thay đổi staged vào danh sách Quản lý Regex (Sandbox). Hãy ghi nhận trạng thái này và hỗ trợ tiếp nếu người dùng yêu cầu.]');
    } catch (e) {
      toastr.error('Lỗi khi áp dụng: ' + e.message);
    }
  });

  // Reject all staging
  _$sidebar.find('.ai-reject-btn').on('click', () => {
    clearStaging();
    _$sidebar.find('.ai-tool-preview').hide();
    setState('idle');
    appendBubble('assistant', '<i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;color:#f87171;"></i> Đã hủy tất cả thay đổi nháp Regex đang chờ.');
    _engine?.addMessage('user', '[Hệ thống: Người dùng đã bấm Từ Chối (Reject) / Hủy bỏ toàn bộ đề xuất thay đổi Regex staged vừa rồi.]');
  });

  // Single apply/reject
  _$sidebar.on('click', '.ai-staged-toggle-diff', function() {
    $(this).closest('.ai-staged-item').find('.ai-staged-diff-box').slideToggle(150);
  });

  _$sidebar.on('click', '.ai-single-apply-btn', async function(e) {
    e.stopPropagation();
    const type = $(this).attr('data-type');
    const key = $(this).attr('data-key');
    try {
      await applyStagedSingle(type, key);
      toastr.success('Đã áp dụng riêng thay đổi Regex được chọn!');
      if (!hasStagingChanges()) {
        _$sidebar.find('.ai-tool-preview').hide();
        setState('idle');
      } else {
        renderRegexToolPreview();
      }
    } catch (err) {
      toastr.error('Lỗi áp dụng riêng: ' + err.message);
    }
  });

  _$sidebar.on('click', '.ai-single-reject-btn', function(e) {
    e.stopPropagation();
    const type = $(this).attr('data-type');
    const key = $(this).attr('data-key');
    rejectStagedSingle(type, key);
    toastr.info('Đã bỏ thay đổi Regex được chọn.');
    if (!hasStagingChanges()) {
      _$sidebar.find('.ai-tool-preview').hide();
      setState('idle');
    } else {
      renderRegexToolPreview();
    }
  });
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export function initRegexAgencyUI() {
  if (_injected) return;
  const $container = $('#st-multitool-manage-regex-view');
  if (!$container.length) return;

  if (!_engine) {
    _engine = new AgencyEngine(new RegexContextProvider());
  }

  const $existing = $('#st-multitool-regex-agency-sidebar');
  if ($existing.length) {
    $existing.replaceWith(buildRegexSidebarHTML());
  } else {
    $container.append(buildRegexSidebarHTML());
  }

  _$sidebar = $('#st-multitool-regex-agency-sidebar');
  _injected = true;

  renderRegexConfigPanel();
  window._stMultitoolLLMConfig = getLLMConfig();
  populateRegexAgencyDropdown('__AUTO__');
  if (_engine && _engine._provider && typeof _engine._provider.setTargetRegexId === 'function') {
    _engine._provider.setTargetRegexId($('#st-multitool-regex-agency-target-select').val());
  }
  refreshIcons(_$sidebar[0]);
  _bindEvents();

  // Chào hỏi ban đầu nếu chưa có tin nhắn
  if (_$sidebar.find('.ai-chat-history').children().length === 0) {
    appendBubble('assistant', `👋 **Xin chào! Tôi là AI Agency Trợ lý Kỹ thuật Regex.**\n\nTôi có thể giúp bạn:\n• ⚡ **Tạo mới Regex từ mô tả tự nhiên** (ví dụ: lọc thẻ \`<think>\`, chuyển đổi ảnh Markdown...)\n• 🛡️ **Rà soát & tối ưu hiệu năng** chống giật lag (*Catastrophic Backtracking*)\n• 💡 **Giải thích cú pháp và cờ** chi tiết\n\nHãy chọn Regex mục tiêu ở trên và nhập yêu cầu của bạn để bắt đầu ngay!`);
  }
}

export function openRegexAgencyPanel() {
  if (!_injected || !$('#st-multitool-regex-agency-sidebar').length) {
    initRegexAgencyUI();
  }
  const $sidebar = $('#st-multitool-regex-agency-sidebar');
  $sidebar.css('display', '');
  $('#st-multitool-manage-regex-view').addClass('ai-agency-active');
  $('#st-multitool-regex-ai-agency-toggle-btn-inline').css('background', 'linear-gradient(135deg, rgba(192,132,252,0.35), rgba(56,189,248,0.35))');
  const currentVal = $('#st-multitool-regex-agency-target-select').val();
  populateRegexAgencyDropdown(!currentVal || currentVal === '__NEW__' ? '__AUTO__' : currentVal);
  if (_engine && _engine._provider && typeof _engine._provider.setTargetRegexId === 'function') {
    _engine._provider.setTargetRegexId($('#st-multitool-regex-agency-target-select').val());
  }
}
