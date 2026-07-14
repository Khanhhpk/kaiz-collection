/**
 * agency-ui.js
 * Chat sidebar UI cho AI Agency trong Preset Editor.
 * State machine: idle → streaming → tool_calling → pending_confirm → idle
 */

import { createEngine } from './engine.js';
import { getLLMConfig, setLLMConfig, fetchModels } from './llm-client.js';
import { PresetContextProvider, getStagingSummary, hasStagingChanges, clearStaging, flushStaging } from '../providers/preset-provider.js';
import { getDebugLogs, clearDebugLogs } from './debug-logger.js';
import { refreshIcons } from '../../utils.js';

let _engine = null;
let _provider = null;
let _state = 'idle'; // idle | streaming | tool_calling | pending_confirm | error
let _$sidebar = null;
let _devView = localStorage.getItem('st-multitool-ai-devview') === 'true';
let _isUserFollowingScroll = true;

function scrollToBottomIfFollowing($history, force = false) {
  if (!$history || !$history.length || !$history[0]) return;
  if (force) {
    _isUserFollowingScroll = true;
  }
  if (_isUserFollowingScroll) {
    $history[0].scrollTop = $history[0].scrollHeight;
  }
}

function getDevButtonStyle() {
  return _devView
    ? 'font-size:11px;padding:2px 6px;display:flex;align-items:center;gap:3px;border:1px solid #38bdf8;border-radius:4px;color:#38bdf8;background:rgba(56,189,248,0.15);font-weight:bold;'
    : 'font-size:11px;padding:2px 6px;display:flex;align-items:center;gap:3px;border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#94a3b8;background:transparent;';
}

// ─── State Machine ────────────────────────────────────────────────────────────

function setState(s) {
  _state = s;
  const $input  = _$sidebar.find('.ai-input-textarea');
  const $sendBtn = _$sidebar.find('.ai-send-btn');
  const $stopBtn = _$sidebar.find('.ai-stop-btn');
  const $spinner = _$sidebar.find('.ai-spinner');

  $input.prop('disabled', s !== 'idle');
  $sendBtn.toggle(s === 'idle');
  $stopBtn.toggle(s === 'streaming' || s === 'tool_calling');
  $spinner.toggle(s === 'streaming' || s === 'tool_calling');
}

// ─── Chat History Renderer ────────────────────────────────────────────────────

function appendBubble(role, content, opts = {}) {
  const $history = _$sidebar.find('.ai-chat-history');

  let bubbleHtml;
  if (role === 'user') {
    bubbleHtml = `
      <div class="ai-bubble ai-bubble-user">
        <div class="ai-bubble-content">${escapeHtml(content)}</div>
      </div>`;
  } else if (role === 'tool') {
    const icon = opts.ok
      ? '<i data-lucide="check-circle" style="width:13px;height:13px;color:#34d399;vertical-align:-2px;margin-right:4px;"></i>'
      : '<i data-lucide="alert-triangle" style="width:13px;height:13px;color:#fbbf24;vertical-align:-2px;margin-right:4px;"></i>';
    bubbleHtml = `
      <div class="ai-bubble ai-bubble-tool">
        <span class="ai-tool-label">${icon}<b>${escapeHtml(opts.toolName || 'tool')}</b></span>
        <div class="ai-tool-result">${escapeHtml(typeof content === 'string' ? content : JSON.stringify(content))}</div>
      </div>`;
  } else {
    // assistant
    const rawEncoded = encodeURIComponent(content || '');
    bubbleHtml = `
      <div class="ai-bubble ai-bubble-assistant" id="ai-bubble-${Date.now()}" data-raw-content="${rawEncoded}">
        <div class="ai-bubble-content ai-streaming-content"></div>
      </div>`;
  }

  $history.append(bubbleHtml);
  const $lastBubble = $history.children().last();
  if (role === 'assistant' && content) {
    updateAssistantBubbleHtml($lastBubble, content);
    $lastBubble.find('.ai-bubble-content').removeClass('ai-streaming-content');
  }
  if (typeof refreshIcons === 'function' && $lastBubble[0]) {
    refreshIcons($lastBubble[0]);
  }
  scrollToBottomIfFollowing($history, role === 'user' || opts.forceScroll);

  return $lastBubble;
}

function cleanAssistantText(text) {
  if (!text) return '';
  let s = String(text);
  // 1. Loại bỏ toàn bộ <tool_call>...</tool_call> (hoặc thẻ tool_call đang mở dở)
  s = s.replace(/<tool_call>[\s\S]*?(<\/tool_call>|$)/gi, '');
  
  // 2. Loại bỏ CoT (<cot>...</cot> hoặc prefill bắt đầu trước </cot>)
  if (s.includes('</cot>')) {
    const parts = s.split('</cot>');
    s = parts.slice(1).join('</cot>');
  } else if (s.includes('<cot>')) {
    s = s.replace(/<cot>[\s\S]*?(<\/cot>|$)/gi, '');
  }
  
  return s.trim();
}

function formatAssistantBubbleHtml(rawText, isDev) {
  if (!rawText) return '';
  if (!isDev) {
    const cleaned = cleanAssistantText(rawText);
    return escapeHtml(cleaned)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>');
  }

  // Trong chế độ Dev View (isDev = true): Hiển thị đầy đủ CoT và Tool Call
  let s = rawText;
  let htmlParts = [];

  // 1. Tách CoT nếu có (hoặc phần trước </cot>)
  if (s.includes('</cot>')) {
    const parts = s.split('</cot>');
    let cotText = parts[0].replace(/^.*<cot>\n?/i, '').trim();
    if (!cotText) cotText = parts[0].trim();
    
    htmlParts.push(
      `<div class="ai-dev-cot-box" style="margin:4px 0 8px 0;padding:8px 10px;background:rgba(234,179,8,0.1);border-left:3px solid #eab308;border-radius:4px;font-size:11px;color:#fef08a;">` +
      `<div style="color:#facc15;font-weight:bold;margin-bottom:4px;display:flex;align-items:center;gap:4px;"><i data-lucide="brain" style="width:13px;height:13px;vertical-align:-2px;"></i> [DEV VIEW: Chain of Thought]</div>` +
      `<div style="white-space:pre-wrap;line-height:1.4;font-family:monospace;">${escapeHtml(cotText)}</div>` +
      `</div>`
    );
    s = parts.slice(1).join('</cot>').trim();
  } else if (s.includes('<cot>')) {
    const parts = s.split('<cot>');
    let cotText = parts.slice(1).join('<cot>').trim();
    htmlParts.push(
      `<div class="ai-dev-cot-box" style="margin:4px 0 8px 0;padding:8px 10px;background:rgba(234,179,8,0.1);border-left:3px solid #eab308;border-radius:4px;font-size:11px;color:#fef08a;">` +
      `<div style="color:#facc15;font-weight:bold;margin-bottom:4px;display:flex;align-items:center;gap:4px;"><i data-lucide="brain" style="width:13px;height:13px;vertical-align:-2px;"></i> [DEV VIEW: Chain of Thought]</div>` +
      `<div style="white-space:pre-wrap;line-height:1.4;font-family:monospace;">${escapeHtml(cotText)}</div>` +
      `</div>`
    );
    s = parts[0].trim();
  }

  // 2. Format từng phần text chính và thẻ <tool_call>
  const toolCallRegex = /<tool_call>([\s\S]*?)(<\/tool_call>|$)/gi;
  let lastIndex = 0;
  let match;

  while ((match = toolCallRegex.exec(s)) !== null) {
    const textBefore = s.slice(lastIndex, match.index).trim();
    if (textBefore) {
      htmlParts.push(
        `<div style="margin-bottom:8px;">` +
        escapeHtml(textBefore).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') +
        `</div>`
      );
    }

    const jsonStr = match[1].trim();
    htmlParts.push(
      `<div class="ai-dev-tool-box" style="margin:6px 0 8px 0;padding:8px 10px;background:rgba(168,85,247,0.12);border-left:3px solid #a855f7;border-radius:4px;font-family:monospace;font-size:11px;color:#e9d5ff;">` +
      `<div style="color:#c084fc;font-weight:bold;margin-bottom:4px;display:flex;align-items:center;gap:4px;"><i data-lucide="wrench" style="width:13px;height:13px;vertical-align:-2px;"></i> [DEV VIEW: Raw Tool Call]</div>` +
      `<div style="white-space:pre-wrap;word-break:break-all;">${escapeHtml(jsonStr)}</div>` +
      `</div>`
    );

    lastIndex = toolCallRegex.lastIndex;
  }

  const textAfter = s.slice(lastIndex).trim();
  if (textAfter) {
    htmlParts.push(
      `<div style="margin-top:4px;">` +
      escapeHtml(textAfter).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') +
      `</div>`
    );
  }

  if (htmlParts.length === 0 && s) {
    htmlParts.push(escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'));
  }

  return htmlParts.join('');
}

function updateAssistantBubbleHtml($bubble, rawText) {
  if (!$bubble || !$bubble.length) return;
  const $content = $bubble.find('.ai-bubble-content');
  
  if (_devView) {
    $bubble.show();
    $content.html(formatAssistantBubbleHtml(rawText, true));
  } else {
    const cleaned = cleanAssistantText(rawText);
    if (!cleaned) {
      $bubble.hide();
    } else {
      $bubble.show();
      $content.html(formatAssistantBubbleHtml(rawText, false));
    }
  }
  if (typeof refreshIcons === 'function' && $bubble[0]) {
    refreshIcons($bubble[0]);
  }
}

function refreshAllChatBubbles() {
  if (!_$sidebar) return;
  _$sidebar.find('.ai-bubble-assistant').each(function() {
    const $b = $(this);
    const rawEncoded = $b.attr('data-raw-content');
    if (rawEncoded !== undefined) {
      const rawText = decodeURIComponent(rawEncoded);
      updateAssistantBubbleHtml($b, rawText);
    }
  });
  const $history = _$sidebar.find('.ai-chat-history');
  scrollToBottomIfFollowing($history);
}

function renderStreamingBuffer(streamBuffer) {
  const $last = _$sidebar.find('.ai-streaming-content').last();
  if (!$last.length) return;
  
  const $bubble = $last.closest('.ai-bubble-assistant');
  $bubble.attr('data-raw-content', encodeURIComponent(streamBuffer));

  const $history = _$sidebar.find('.ai-chat-history');

  if (_devView) {
    $last.html(formatAssistantBubbleHtml(streamBuffer, true));
    if (typeof refreshIcons === 'function' && $last[0]) refreshIcons($last[0]);
    scrollToBottomIfFollowing($history);
    return;
  }

  // Nếu chưa gặp </cot> thì AI đang viết suy luận CoT (do prefill từ engine)
  if (!streamBuffer.includes('</cot>') && !streamBuffer.includes('<cot>')) {
    if (!$last.find('.ai-cot-streaming-indicator').length) {
      $last.html('<div class="ai-cot-streaming-indicator" style="color:#64748b;font-style:italic;display:flex;align-items:center;gap:6px;"><span class="ai-spinner-dot" style="background:#64748b;"></span><span class="ai-spinner-dot" style="background:#64748b;"></span> <i data-lucide="cpu" style="width:14px;height:14px;color:#64748b;"></i> Đang suy luận kỹ thuật (CoT)...</div>');
      if (typeof refreshIcons === 'function' && $last[0]) refreshIcons($last[0]);
    }
    scrollToBottomIfFollowing($history);
    return;
  }

  const cleaned = cleanAssistantText(streamBuffer);
  if (!cleaned) {
    if (!$last.find('.ai-cot-streaming-indicator').length) {
      $last.html('<div class="ai-cot-streaming-indicator" style="color:#64748b;font-style:italic;display:flex;align-items:center;gap:6px;"><span class="ai-spinner-dot" style="background:#64748b;"></span><span class="ai-spinner-dot" style="background:#64748b;"></span> <i data-lucide="cpu" style="width:14px;height:14px;color:#64748b;"></i> Đang suy luận kỹ thuật (CoT)...</div>');
      if (typeof refreshIcons === 'function' && $last[0]) refreshIcons($last[0]);
    }
    scrollToBottomIfFollowing($history);
    return;
  }

  // Render markdown-lite
  const html = formatAssistantBubbleHtml(streamBuffer, false);
  $last.html(html);
  if (typeof refreshIcons === 'function' && $last[0]) refreshIcons($last[0]);
  scrollToBottomIfFollowing($history);
}

function finalizeStreamingBubble(fullText) {
  const $last = _$sidebar.find('.ai-streaming-content').last();
  if ($last.length) {
    const $bubble = $last.closest('.ai-bubble-assistant');
    $bubble.attr('data-raw-content', encodeURIComponent(fullText));
    updateAssistantBubbleHtml($bubble, fullText);
    $last.removeClass('ai-streaming-content');
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Tool Preview (Staging Diff) ─────────────────────────────────────────────

function renderToolPreview() {
  const summary = getStagingSummary();
  if (summary.totalChanges === 0) {
    _$sidebar.find('.ai-tool-preview').hide();
    return;
  }

  let diffHtml = '';
  for (const upd of summary.updates) {
    if (upd.identifier === '__ORDER__' || upd.identifier === '__VARS__' || upd.identifier === '__VAR_RENAMES__') continue;
    diffHtml += `
      <div class="ai-diff-item">
        <div class="ai-diff-name"><i data-lucide="file-edit" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;"></i> Cập nhật block: <b>${escapeHtml(upd.name)}</b> <span class="ai-diff-fields">[${upd.fields.join(', ')}]</span></div>
      </div>`;
  }
  if (summary.varUpdates && summary.varUpdates.length > 0) {
    for (const v of summary.varUpdates) {
      diffHtml += `
        <div class="ai-diff-item" style="border-left: 3px solid #fde68a; background: rgba(253,230,138,0.08);">
          <div class="ai-diff-name" style="color:#fde68a;"><i data-lucide="edit-3" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;"></i> Cập nhật biến: <b>{{setvar::${escapeHtml(v.varName)}::...}}</b></div>
          ${v.newValueExcerpt ? `<div style="font-size:11px;color:#cbd5e1;margin-top:2px;">"${escapeHtml(v.newValueExcerpt)}"</div>` : ''}
        </div>`;
    }
  }
  if (summary.varRenames && summary.varRenames.length > 0) {
    for (const r of summary.varRenames) {
      diffHtml += `
        <div class="ai-diff-item" style="border-left: 3px solid #c084fc; background: rgba(192,132,252,0.08);">
          <div class="ai-diff-name" style="color:#e9d5ff;"><i data-lucide="tag" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;"></i> Đổi tên biến: <b style="color:#f87171;">${escapeHtml(r.oldName)}</b> ➔ <b style="color:#34d399;">${escapeHtml(r.newName)}</b></div>
        </div>`;
    }
  }
  if (summary.reorder && summary.reorder.length > 0) {
    diffHtml += `
      <div class="ai-diff-item" style="border-left: 3px solid #38bdf8; background: rgba(56,189,248,0.08);">
        <div class="ai-diff-name" style="color:#38bdf8;"><i data-lucide="arrow-up-down" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;"></i> Sắp xếp lại thứ tự ${summary.reorder.length} prompt blocks</div>
      </div>`;
  }
  for (const c of summary.creates) {
    diffHtml += `<div class="ai-diff-item ai-diff-create"><i data-lucide="plus-circle" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;color:#34d399;"></i> Tạo mới block: <b>${escapeHtml(c.name)}</b></div>`;
  }
  for (const d of summary.deletes) {
    diffHtml += `<div class="ai-diff-item ai-diff-delete"><i data-lucide="trash-2" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;color:#f87171;"></i> Xóa block: <b>${escapeHtml(d.name)}</b></div>`;
  }

  _$sidebar.find('.ai-preview-stats').html(`<i data-lucide="clipboard-list" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> ${summary.totalChanges} thay đổi đang chờ xác nhận`);
  _$sidebar.find('.ai-preview-diff').html(diffHtml);
  if (typeof refreshIcons === 'function' && _$sidebar.find('.ai-tool-preview')[0]) {
    refreshIcons(_$sidebar.find('.ai-tool-preview')[0]);
  }
  _$sidebar.find('.ai-tool-preview').show();
}

// ─── Config Panel & Debug Panel ─────────────────────────────────────────────

function renderDebugPanel() {
  const logs = getDebugLogs();
  const $content = _$sidebar.find('.ai-debug-content');
  if (logs.length === 0) {
    $content.html('<div style="color:#888;font-style:italic;padding:8px 0;">Chưa có log API nào. Hãy gửi yêu cầu để xem chi tiết tải trọng (payload) gửi cho AI.</div>');
    return;
  }

  let html = '';
  logs.forEach(l => {
    const statusColor = l.status === 'DONE' ? '#34d399' : (l.status === 'ERROR' ? '#f87171' : '#60a5fa');
    const messagesSummary = (l.messages || []).map(m => `[${m.role.toUpperCase()}]: ${String(m.content).slice(0, 100)}...`).join('\n');
    const fullPayload = JSON.stringify({ model: l.model, options: l.options, messages: l.messages }, null, 2);

    html += `
      <div style="border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px;margin-bottom:8px;background:rgba(0,0,0,0.3);font-size:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="color:#e2e8f0;font-weight:bold;">🕒 ${l.time} (${l.mode.toUpperCase()})</span>
          <span style="color:${statusColor};font-weight:bold;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.05);">${l.status} ${l.duration ? `(${l.duration}ms)` : ''}</span>
        </div>
        <div style="color:#94a3b8;font-size:11px;margin-bottom:4px;">📌 Endpoint: ${escapeHtml(l.endpoint)} | Model: ${escapeHtml(l.model)}</div>
        <details style="margin-top:6px;cursor:pointer;">
          <summary style="color:#38bdf8;font-weight:500;">📤 Tải trọng gửi đi (${(l.messages || []).length} blocks/layers)</summary>
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
      </div>
    `;
  });

  $content.html(html);
}

function renderConfigPanel() {
  const cfg = getLLMConfig();
  _$sidebar.find('#ai-cfg-endpoint').val(cfg.endpoint);
  _$sidebar.find('#ai-cfg-apikey').val(cfg.apiKey);
  _$sidebar.find('#ai-cfg-context').val(cfg.contextLimit);
  _$sidebar.find('#ai-cfg-maxout').val(cfg.maxOutput);
  _$sidebar.find('#ai-cfg-maxiter').val(cfg.maxIterations ?? 30);
  _$sidebar.find('#ai-cfg-retries').val(cfg.maxRetries ?? 3);
  // Đồng bộ option model hiện tại vào select nếu chưa có
  const $modelSelect = _$sidebar.find('#ai-cfg-model');
  if ($modelSelect.find(`option[value="${cfg.model}"]`).length === 0 && cfg.model) {
    $modelSelect.append(`<option value="${cfg.model}" selected>${cfg.model}</option>`);
  } else {
    $modelSelect.val(cfg.model);
  }
}

function saveConfigFromPanel() {
  const parsedRetries = parseInt(_$sidebar.find('#ai-cfg-retries').val(), 10);
  setLLMConfig({
    mode: 'custom',
    endpoint: _$sidebar.find('#ai-cfg-endpoint').val().trim(),
    apiKey: _$sidebar.find('#ai-cfg-apikey').val().trim(),
    model: _$sidebar.find('#ai-cfg-model').val() || 'gpt-4o-mini',
    contextLimit: parseInt(_$sidebar.find('#ai-cfg-context').val(), 10) || 32000,
    maxOutput: parseInt(_$sidebar.find('#ai-cfg-maxout').val(), 10) || 4000,
    maxIterations: parseInt(_$sidebar.find('#ai-cfg-maxiter').val(), 10) || 30,
    maxRetries: !isNaN(parsedRetries) && parsedRetries >= 0 ? parsedRetries : 3,
  });
  window._stMultitoolLLMConfig = getLLMConfig();
  toastr.success('Đã lưu cấu hình AI (Custom Endpoint - Bypass Filter Mode).');
}

// ─── Build Sidebar HTML ───────────────────────────────────────────────────────

function buildSidebarHTML() {
  return `
    <div class="ai-agency-sidebar" id="st-multitool-ai-agency-sidebar">
      <!-- Header -->
      <div class="ai-header">
        <span class="ai-header-title"><i data-lucide="bot" style="width:18px;height:18px;margin-right:6px;vertical-align:-3px;color:#38bdf8;"></i> AI Agency</span>
        <div class="ai-header-actions">
          <button class="ai-icon-btn ai-dev-view-btn" title="Chế độ Dev View (Hiển thị CoT & Thẻ Tool Call)" style="${getDevButtonStyle()}">
            <i data-lucide="code" style="width:13px;height:13px;"></i> <span>Dev</span>
          </button>
          <button class="ai-icon-btn ai-debug-btn" title="Xem Debug Logs & Tải Trọng Gửi AI">
            <i data-lucide="terminal" style="width:14px;height:14px;"></i>
          </button>
          <button class="ai-icon-btn ai-clear-btn" title="Xóa lịch sử hội thoại">
            <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i>
          </button>
          <button class="ai-icon-btn ai-cfg-btn" title="Cài đặt LLM">
            <i data-lucide="sliders" style="width:14px;height:14px;"></i>
          </button>
          <button class="ai-icon-btn ai-close-btn" title="Đóng AI Agency">
            <i data-lucide="x" style="width:14px;height:14px;"></i>
          </button>
        </div>
      </div>

      <!-- Config Panel (hidden by default) -->
      <div class="ai-config-panel" style="display:none;">
        <div style="font-size:11px;color:#38bdf8;margin-bottom:8px;padding:4px 6px;background:rgba(56,189,248,0.1);border-left:2px solid #38bdf8;border-radius:4px;">
          <i data-lucide="zap" style="width:13px;height:13px;color:#38bdf8;vertical-align:-2px;margin-right:4px;"></i> <b>Chế độ API Custom:</b> Đảm bảo chèn chính xác 3 Lớp Role (<code>system</code>, <code>user</code>, <code>assistant prefill</code>) để vượt rào (bypass safety filter) 100%.
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Endpoint</label>
          <input type="text" id="ai-cfg-endpoint" class="ai-cfg-input" placeholder="https://api.openai.com/v1">
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">API Key</label>
          <input type="password" id="ai-cfg-apikey" class="ai-cfg-input" placeholder="sk-...">
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Model</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <select id="ai-cfg-model" class="ai-cfg-input" style="flex:1;"></select>
            <button class="ai-icon-btn ai-fetch-models-btn" title="Tải danh sách model từ Endpoint">
              <i data-lucide="refresh-cw" style="width:13px;height:13px;"></i>
            </button>
          </div>
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Context limit</label>
          <input type="number" id="ai-cfg-context" class="ai-cfg-input" style="width:100px;" value="32000"> tokens
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Max output</label>
          <input type="number" id="ai-cfg-maxout" class="ai-cfg-input" style="width:100px;" value="4000"> tokens
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Max Auto Agent</label>
          <input type="number" id="ai-cfg-maxiter" class="ai-cfg-input" style="width:100px;" value="30" min="1" max="200"> Số Call/1 task
        </div>
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">Max retries (lỗi API)</label>
          <input type="number" id="ai-cfg-retries" class="ai-cfg-input" style="width:100px;" value="3" min="0" max="15"> lần
        </div>
        <button class="ai-save-cfg-btn"><i data-lucide="save" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Lưu cài đặt</button>
      </div>

      <!-- Debug Log Panel (hidden by default) -->
      <div class="ai-debug-panel" style="display:none;padding:12px;border-bottom:1px solid rgba(255,255,255,0.1);max-height:340px;overflow-y:auto;background:rgba(15,23,42,0.95);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <span style="font-weight:bold;color:#34d399;font-size:13px;"><i data-lucide="file-text" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> LLM Debug Logs & Tải Trọng Gửi Đi</span>
          <button class="ai-clear-debug-btn" style="background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.5);color:#fca5a5;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;"><i data-lucide="trash-2" style="width:12px;height:12px;vertical-align:-1px;margin-right:3px;"></i> Xóa log</button>
        </div>
        <div class="ai-debug-content"></div>
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
          <button class="ai-apply-btn"><i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Áp dụng</button>
          <button class="ai-reject-btn"><i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Hủy</button>
        </div>
      </div>

      <!-- Input Area -->
      <div class="ai-input-area">
        <textarea class="ai-input-textarea" placeholder="Nhập yêu cầu... (Shift+Enter để xuống dòng)" rows="2"></textarea>
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

// ─── Init ─────────────────────────────────────────────────────────────────────

let _injected = false;
let _isOpen = false;

function _injectSidebar() {
  if (_injected) return;
  const $view = $('#st-multitool-manage-prompt-view');
  if (!$view.length) return;

  // Nếu panel.html chưa có sẵn .ai-prompt-list-panel (bản cũ), bọc lại làm fallback
  if (!$view.find('.ai-prompt-list-panel').length) {
    $view.children(':not(.ai-agency-sidebar)').wrapAll('<div class="ai-prompt-list-panel"></div>');
  }
  if (!$('#st-multitool-ai-agency-sidebar').length) {
    $view.append(buildSidebarHTML());
  } else {
    $('#st-multitool-ai-agency-sidebar').replaceWith(buildSidebarHTML());
  }
  _$sidebar = $('#st-multitool-ai-agency-sidebar');
  _injected = true;

  renderConfigPanel();
  window._stMultitoolLLMConfig = getLLMConfig();
  refreshIcons(_$sidebar[0]);
  _bindEvents();

  // Tin nhắn chào (chỉ một lần)
  appendBubble('assistant', '<i data-lucide="hand" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Xin chào! Tôi là AI Agency. Bạn muốn làm gì với Preset này?\n\nVí dụ:\n• "Dịch toàn bộ preset sang tiếng Việt"\n• "Tìm block nào có văn phong tự nhiên nhất"\n• "Tạo thêm block system prompt về ngôn ngữ"');
}

function _showSidebar() {
  _injectSidebar();
  const $popup = $('#st-multitool-popup, .st-multitool-popup-container');
  const $view = $('#st-multitool-manage-prompt-view');
  const $btn = $('#st-multitool-ai-agency-toggle-btn');

  $popup.addClass('ai-agency-expanded');
  
  // Sử dụng requestAnimationFrame để tách nhịp mở modal và hiển thị sidebar, tránh giật lag layout
  requestAnimationFrame(() => {
    $view.addClass('ai-agency-active');
    $btn.addClass('active').css({
      background: 'rgba(52, 211, 153, 0.3)',
      borderColor: '#34d399',
      boxShadow: '0 0 10px rgba(52, 211, 153, 0.3)'
    });
  });
  _isOpen = true;
}

function _hideSidebar() {
  $('#st-multitool-manage-prompt-view').removeClass('ai-agency-active');
  $('#st-multitool-popup, .st-multitool-popup-container').removeClass('ai-agency-expanded');
  $('#st-multitool-ai-agency-toggle-btn').removeClass('active').css({
    background: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
    boxShadow: 'none'
  });
  _isOpen = false;
}

function _toggleSidebar() {
  if (_isOpen) {
    _hideSidebar();
  } else {
    _showSidebar();
  }
}

export function initAIAgency() {
  _provider = new PresetContextProvider();
  _engine = createEngine(_provider);

  // Expose show/hide/toggle via window để tránh circular import
  window._stMultitoolAgency = { 
    show: _showSidebar, 
    hide: _hideSidebar, 
    toggle: _toggleSidebar,
    isOpen: () => _isOpen 
  };
}


function _bindEvents() {
  // Close button
  _$sidebar.find('.ai-close-btn').on('click', () => {
    _hideSidebar();
  });

  // Toggle Dev View mode
  _$sidebar.find('.ai-dev-view-btn').on('click', function() {
    _devView = !_devView;
    localStorage.setItem('st-multitool-ai-devview', String(_devView));
    $(this).attr('style', getDevButtonStyle());
    refreshAllChatBubbles();
    toastr.info(_devView ? '🛠️ Dev View: BẬT (Hiện đầy đủ CoT & Thẻ Tool Call)' : '👁️ Dev View: TẮT (Giao diện sạch CoT & Tool Call)');
  });

  // Toggle config panel
  _$sidebar.find('.ai-cfg-btn').on('click', () => {
    _$sidebar.find('.ai-config-panel').slideToggle(200);
    _$sidebar.find('.ai-debug-panel').slideUp(200);
  });

  // Toggle debug panel
  _$sidebar.find('.ai-debug-btn').on('click', () => {
    const $panel = _$sidebar.find('.ai-debug-panel');
    if ($panel.is(':hidden')) {
      renderDebugPanel();
      $panel.slideDown(200);
      _$sidebar.find('.ai-config-panel').slideUp(200);
    } else {
      $panel.slideUp(200);
    }
  });

  _$sidebar.find('.ai-clear-debug-btn').on('click', () => {
    clearDebugLogs();
    renderDebugPanel();
  });

  window.addEventListener('st-multitool-ai-debug-update', () => {
    if (_$sidebar && _$sidebar.find('.ai-debug-panel').is(':visible')) {
      renderDebugPanel();
    }
  });

  // Fetch models
  _$sidebar.find('.ai-fetch-models-btn').on('click', async () => {
    const endpoint = _$sidebar.find('#ai-cfg-endpoint').val().trim();
    const apiKey = _$sidebar.find('#ai-cfg-apikey').val().trim();
    if (!endpoint) { toastr.warning('Nhập Endpoint trước.'); return; }
    try {
      toastr.info('Đang tải danh sách model...');
      const models = await fetchModels(endpoint, apiKey);
      const $select = _$sidebar.find('#ai-cfg-model');
      $select.empty();
      models.forEach(m => $select.append(`<option value="${m.id}">${m.name}</option>`));
      toastr.success(`Tải được ${models.length} model.`);
    } catch (e) {
      toastr.error('Lỗi tải model: ' + e.message);
    }
  });

  // Save config
  _$sidebar.find('.ai-save-cfg-btn').on('click', () => {
    saveConfigFromPanel();
    _$sidebar.find('.ai-config-panel').slideUp(200);
  });

  // Theo dõi thao tác cuộn của người dùng (vuốt lên -> dừng cuộn tự động, vuốt xuống đáy -> bám theo streaming)
  _$sidebar.find('.ai-chat-history').on('scroll', function() {
    const el = this;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    _isUserFollowingScroll = (distanceToBottom < 60);
  });

  // Clear history
  _$sidebar.find('.ai-clear-btn').on('click', () => {
    _engine.clearHistory();
    _$sidebar.find('.ai-chat-history').empty();
    _isUserFollowingScroll = true;
    appendBubble('assistant', '<i data-lucide="trash-2" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Đã xóa lịch sử. Bắt đầu cuộc trò chuyện mới.');
  });

  // Send message
  const sendMessage = async () => {
    if (_state !== 'idle') return;
    const text = _$sidebar.find('.ai-input-textarea').val().trim();
    if (!text) return;

    _isUserFollowingScroll = true;
    _$sidebar.find('.ai-input-textarea').val('');
    appendBubble('user', text, { forceScroll: true });

    let currentAssistantBubble = null;
    let streamBuffer = '';

    setState('streaming');

    await _engine.runTask(text, {
      onChunk: (token) => {
        if (!currentAssistantBubble) {
          currentAssistantBubble = appendBubble('assistant', '');
        }
        streamBuffer += token;
        renderStreamingBuffer(streamBuffer);
      },
      onToolCall: (toolCall) => {
        setState('tool_calling');
        // Finalize any partial bubble trước
        if (currentAssistantBubble && streamBuffer) {
          finalizeStreamingBubble(streamBuffer);
          streamBuffer = '';
          currentAssistantBubble = null;
        }
        appendBubble('tool', `Đang gọi: ${toolCall.name}`, { toolName: toolCall.name, ok: true });
      },
      onToolResult: (toolName, result) => {
        // Cập nhật bubble tool với kết quả ngắn gọn
        const $last = _$sidebar.find('.ai-bubble-tool').last().find('.ai-tool-result');
        let summaryText = '';
        if (typeof result?.summary === 'string') {
          summaryText = result.summary;
        } else if (result?.message) {
          summaryText = result.message;
        } else if (result?.summary && typeof result.summary === 'object') {
          summaryText = `${result.summary.totalChanges || 0} thay đổi chờ xác nhận`;
        } else {
          summaryText = result?.ok ? '✓ OK' : (typeof result === 'string' ? result : JSON.stringify(result).slice(0, 80));
        }
        $last.text(summaryText);

        // Nếu tool trả pending_review → hiện preview
        if (result?.pending_review) {
          renderToolPreview();
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
          finalizeStreamingBubble('<i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;color:#fbbf24;"></i> **API trả về phản hồi rỗng (0 tokens).**\n\n💡 *Cách xử lý:* Bấm vào biểu tượng **[<i data-lucide="terminal" style="width:13px;height:13px;vertical-align:-2px;"></i> Debug Logs]** (`>_`) trên thanh tiêu đề của AI Agency để xem chính xác dữ liệu đã gửi đi và phản hồi/lỗi chi tiết từ SillyTavern hoặc API LLM.');
        }
        if (hasStagingChanges()) renderToolPreview();
        setState('idle');
      },
      onError: (err) => {
        if (err?.name === 'AbortError') {
          appendBubble('assistant', '<i data-lucide="square" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Đã dừng.');
        } else {
          const errMsg = err?.message || String(err);
          if (!currentAssistantBubble) {
            appendBubble('assistant', `<i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;color:#fbbf24;"></i> **Lỗi thực thi LLM:** ${errMsg}\n\n💡 Bấm vào nút **[<i data-lucide="terminal" style="width:13px;height:13px;vertical-align:-2px;"></i> Debug Logs]** trên thanh tiêu đề để xem chính xác lỗi và dữ liệu gửi đi.`);
          } else {
            finalizeStreamingBubble(streamBuffer + `\n\n<i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;color:#fbbf24;"></i> **Lỗi:** ${errMsg}`);
            streamBuffer = '';
            currentAssistantBubble = null;
          }
        }
        if (hasStagingChanges()) renderToolPreview();
        setState('idle');
      },
    });
  };

  _$sidebar.find('.ai-send-btn').on('click', sendMessage);

  _$sidebar.find('.ai-input-textarea').on('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Stop
  _$sidebar.find('.ai-stop-btn').on('click', () => {
    _engine.abort();
    setState('idle');
    appendBubble('assistant', '<i data-lucide="square" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Đã dừng theo yêu cầu.');
  });

  // Apply staging
  _$sidebar.find('.ai-apply-btn').on('click', async () => {
    try {
      await flushStaging();
      _$sidebar.find('.ai-tool-preview').hide();
      setState('idle');
      toastr.success('Đã áp dụng thay đổi vào Preset Editor!');
      appendBubble('assistant', '<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;color:#34d399;"></i> Đã áp dụng các thay đổi vào danh sách bên trái. Hãy bấm nút **"Lưu Preset"** khi bạn muốn chính thức lưu vào SillyTavern.');
      _engine?.addMessage('user', '[Hệ thống: Người dùng đã bấm Chấp Nhận (Apply) tất cả các thay đổi staged vào Preset Editor. Danh sách block bên trái đã cập nhật thành công. Hãy ghi nhận trạng thái này đã được xác nhận và hỗ trợ tiếp nếu người dùng yêu cầu.]');
    } catch (e) {
      toastr.error('Lỗi khi áp dụng: ' + e.message);
    }
  });

  // Reject staging
  _$sidebar.find('.ai-reject-btn').on('click', () => {
    clearStaging();
    _$sidebar.find('.ai-tool-preview').hide();
    setState('idle');
    appendBubble('assistant', '<i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;color:#f87171;"></i> Đã hủy tất cả thay đổi đang chờ.');
    _engine?.addMessage('user', '[Hệ thống: Người dùng đã bấm Từ Chối (Reject) / Hủy bỏ toàn bộ đề xuất thay đổi staged vừa rồi. Các thay đổi đã bị xóa bỏ hoàn toàn khỏi bộ nhớ tạm. Hãy tiếp tục trò chuyện hoặc hỏi ý kiến người dùng để làm phương án khác.]');
  });
}
