/**
 * agency-ui.js
 * Chat sidebar UI cho AI Agency trong Preset Editor.
 * State machine: idle → streaming → tool_calling → pending_confirm → idle
 */

import { createEngine } from './engine.js';
import { getLLMConfig, setLLMConfig, fetchModels } from './llm-client.js';
import { PresetContextProvider, getStagingSummary, hasStagingChanges, clearStaging, flushStaging } from '../providers/preset-provider.js';

let _engine = null;
let _provider = null;
let _state = 'idle'; // idle | streaming | tool_calling | pending_confirm | error
let _$sidebar = null;

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
    const icon = opts.ok ? '⚡' : '⚠️';
    bubbleHtml = `
      <div class="ai-bubble ai-bubble-tool">
        <span class="ai-tool-label">${icon} <b>${escapeHtml(opts.toolName || 'tool')}</b></span>
        <div class="ai-tool-result">${escapeHtml(typeof content === 'string' ? content : JSON.stringify(content))}</div>
      </div>`;
  } else {
    // assistant
    bubbleHtml = `
      <div class="ai-bubble ai-bubble-assistant" id="ai-bubble-${Date.now()}">
        <div class="ai-bubble-content ai-streaming-content"></div>
      </div>`;
  }

  $history.append(bubbleHtml);
  $history.scrollTop($history[0].scrollHeight);

  return $history.children().last();
}

function appendToken(token) {
  const $last = _$sidebar.find('.ai-streaming-content').last();
  if ($last.length) {
    $last.text($last.text() + token);
    const $history = _$sidebar.find('.ai-chat-history');
    $history.scrollTop($history[0].scrollHeight);
  }
}

function finalizeStreamingBubble(fullText) {
  const $last = _$sidebar.find('.ai-streaming-content').last();
  if ($last.length) {
    // Render markdown-lite: xuống dòng, bold
    const html = escapeHtml(fullText)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>');
    $last.html(html).removeClass('ai-streaming-content');
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
        <div class="ai-diff-name">${escapeHtml(upd.name)} <span class="ai-diff-fields">[${upd.fields.join(', ')}]</span></div>
      </div>`;
  }
  for (const c of summary.creates) {
    diffHtml += `<div class="ai-diff-item ai-diff-create">➕ Tạo mới: <b>${escapeHtml(c.name)}</b></div>`;
  }
  for (const d of summary.deletes) {
    diffHtml += `<div class="ai-diff-item ai-diff-delete">🗑️ Xóa: <b>${escapeHtml(d.name)}</b></div>`;
  }

  _$sidebar.find('.ai-preview-stats').text(`📋 ${summary.totalChanges} thay đổi đang chờ xác nhận`);
  _$sidebar.find('.ai-preview-diff').html(diffHtml);
  _$sidebar.find('.ai-tool-preview').show();
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

function renderConfigPanel() {
  const cfg = getLLMConfig();
  _$sidebar.find('#ai-cfg-mode-st').prop('checked', cfg.mode === 'st');
  _$sidebar.find('#ai-cfg-mode-custom').prop('checked', cfg.mode === 'custom');
  _$sidebar.find('#ai-cfg-endpoint').val(cfg.endpoint);
  _$sidebar.find('#ai-cfg-apikey').val(cfg.apiKey);
  _$sidebar.find('#ai-cfg-context').val(cfg.contextLimit);
  _$sidebar.find('#ai-cfg-maxout').val(cfg.maxOutput);
  updateConfigPanelVisibility(cfg.mode);
}

function updateConfigPanelVisibility(mode) {
  const isCustom = mode === 'custom';
  _$sidebar.find('.ai-cfg-custom-only').toggle(isCustom);
}

function saveConfigFromPanel() {
  const mode = _$sidebar.find('#ai-cfg-mode-custom').is(':checked') ? 'custom' : 'st';
  setLLMConfig({
    mode,
    endpoint: _$sidebar.find('#ai-cfg-endpoint').val().trim(),
    apiKey: _$sidebar.find('#ai-cfg-apikey').val().trim(),
    model: _$sidebar.find('#ai-cfg-model').val(),
    contextLimit: parseInt(_$sidebar.find('#ai-cfg-context').val(), 10) || 32000,
    maxOutput: parseInt(_$sidebar.find('#ai-cfg-maxout').val(), 10) || 4000,
  });
  window._stMultitoolLLMConfig = getLLMConfig();
  toastr.success('Đã lưu cấu hình AI.');
}

// ─── Build Sidebar HTML ───────────────────────────────────────────────────────

function buildSidebarHTML() {
  return `
    <div class="ai-agency-sidebar" id="st-multitool-ai-agency-sidebar">
      <!-- Header -->
      <div class="ai-header">
        <span class="ai-header-title"><span class="ai-robot-icon">🤖</span> AI Agency</span>
        <div class="ai-header-actions">
          <button class="ai-icon-btn ai-clear-btn" title="Xóa lịch sử hội thoại">
            <i data-lucide="refresh-ccw" style="width:14px;height:14px;"></i>
          </button>
          <button class="ai-icon-btn ai-cfg-btn" title="Cài đặt LLM">
            <i data-lucide="settings-2" style="width:14px;height:14px;"></i>
          </button>
          <button class="ai-icon-btn ai-close-btn" title="Đóng AI Agency">
            <i data-lucide="x" style="width:14px;height:14px;"></i>
          </button>
        </div>
      </div>

      <!-- Config Panel (hidden by default) -->
      <div class="ai-config-panel" style="display:none;">
        <div class="ai-cfg-row">
          <label class="ai-cfg-label">LLM Mode</label>
          <div class="ai-cfg-radio-group">
            <label><input type="radio" name="ai-llm-mode" id="ai-cfg-mode-st" value="st"> SillyTavern API</label>
            <label><input type="radio" name="ai-llm-mode" id="ai-cfg-mode-custom" value="custom"> Custom Endpoint</label>
          </div>
        </div>
        <div class="ai-cfg-custom-only">
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
              <button class="ai-icon-btn ai-fetch-models-btn" title="Tải danh sách model">
                <i data-lucide="refresh-cw" style="width:13px;height:13px;"></i>
              </button>
            </div>
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
        <button class="ai-save-cfg-btn">💾 Lưu cài đặt</button>
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
          <button class="ai-apply-btn">✅ Áp dụng</button>
          <button class="ai-reject-btn">❌ Hủy</button>
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

  // Wrap only the prompt list content (not sidebar)
  $view.children(':not(.ai-agency-sidebar)').wrapAll('<div class="ai-prompt-list-panel"></div>');
  $view.append(buildSidebarHTML());
  _$sidebar = $('#st-multitool-ai-agency-sidebar');
  _injected = true;

  renderConfigPanel();
  window._stMultitoolLLMConfig = getLLMConfig();
  if (window.lucide) window.lucide.createIcons();
  _bindEvents();

  // Tin nhắn chào (chỉ một lần)
  appendBubble('assistant', '👋 Xin chào! Tôi là AI Agency. Bạn muốn làm gì với Preset này?\n\nVí dụ:\n• "Dịch toàn bộ preset sang tiếng Việt"\n• "Tìm block nào có văn phong tự nhiên nhất"\n• "Tạo thêm block system prompt về ngôn ngữ"');
}

function _showSidebar() {
  _injectSidebar();
  $('#st-multitool-manage-prompt-view').addClass('ai-agency-active');
  $('#st-multitool-popup, .st-multitool-popup-container').addClass('ai-agency-expanded');
  $('#st-multitool-ai-agency-toggle-btn').addClass('active').css({
    background: 'rgba(52, 211, 153, 0.3)',
    borderColor: '#34d399',
    boxShadow: '0 0 10px rgba(52, 211, 153, 0.3)'
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

  // Toggle config panel
  _$sidebar.find('.ai-cfg-btn').on('click', () => {
    _$sidebar.find('.ai-config-panel').slideToggle(200);
  });

  // Mode radio
  _$sidebar.on('change', 'input[name="ai-llm-mode"]', function() {
    updateConfigPanelVisibility($(this).val());
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

  // Clear history
  _$sidebar.find('.ai-clear-btn').on('click', () => {
    _engine.clearHistory();
    _$sidebar.find('.ai-chat-history').empty();
    appendBubble('assistant', '🗑️ Đã xóa lịch sử. Bắt đầu cuộc trò chuyện mới.');
  });

  // Send message
  const sendMessage = async () => {
    if (_state !== 'idle') return;
    const text = _$sidebar.find('.ai-input-textarea').val().trim();
    if (!text) return;

    _$sidebar.find('.ai-input-textarea').val('');
    appendBubble('user', text);

    let currentAssistantBubble = null;
    let streamBuffer = '';

    setState('streaming');

    await _engine.runTask(text, {
      onChunk: (token) => {
        if (!currentAssistantBubble) {
          currentAssistantBubble = appendBubble('assistant', '');
        }
        streamBuffer += token;
        appendToken(token);
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
        const summary = result?.summary || result?.message || (result?.ok ? '✓ OK' : JSON.stringify(result).slice(0, 80));
        $last.text(summary);

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
        }
        if (hasStagingChanges()) renderToolPreview();
        setState('idle');
      },
      onError: (err) => {
        if (err?.name === 'AbortError') {
          appendBubble('assistant', '⏹️ Đã dừng.');
        } else {
          appendBubble('assistant', `❌ Lỗi: ${err?.message || String(err)}`);
        }
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
    appendBubble('assistant', '⏹️ Đã dừng theo yêu cầu.');
  });

  // Apply staging
  _$sidebar.find('.ai-apply-btn').on('click', async () => {
    try {
      await flushStaging();
      _$sidebar.find('.ai-tool-preview').hide();
      setState('idle');
      toastr.success('Đã áp dụng thay đổi vào Preset Editor!');
      appendBubble('assistant', '✅ Đã áp dụng các thay đổi vào danh sách bên trái. Hãy bấm nút **"Lưu Preset"** khi bạn muốn chính thức lưu vào SillyTavern.');
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
    appendBubble('assistant', '❌ Đã hủy tất cả thay đổi đang chờ.');
    _engine?.addMessage('user', '[Hệ thống: Người dùng đã bấm Từ Chối (Reject) / Hủy bỏ toàn bộ đề xuất thay đổi staged vừa rồi. Các thay đổi đã bị xóa bỏ hoàn toàn khỏi bộ nhớ tạm. Hãy tiếp tục trò chuyện hoặc hỏi ý kiến người dùng để làm phương án khác.]');
  });
}
