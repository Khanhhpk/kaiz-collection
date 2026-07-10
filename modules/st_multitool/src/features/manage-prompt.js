import { escapeHtml } from '../utils.js';
import { showLoader, hideLoader, showSubView } from '../ui.js';

let $promptListContainer;
let $saveBtn;

export function initManagePrompt() {
  $promptListContainer = $('#st-multitool-prompt-list-container');
  $saveBtn = $('#st-multitool-save-prompt-btn');

  $('#st-multitool-manage-prompt-btn').on('click', () => {
    showSubView('st-multitool-manage-prompt-view');
    renderPromptBlocks();
    if (window.lucide) {
      window.lucide.createIcons();
    }
    renderPromptBlocks();
  });

  $saveBtn.on('click', savePromptBlocks);
}

function getPowerUser() {
  if (window.power_user && window.power_user.instruct) return window.power_user;
  if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
    const ctx = window.SillyTavern.getContext();
    if (ctx && ctx.power_user && ctx.power_user.instruct) return ctx.power_user;
    if (ctx && ctx.powerUserSettings && ctx.powerUserSettings.instruct) return ctx.powerUserSettings;
  }
  // Optional search
  for (let key in window) {
    try {
      if (window[key] && window[key].instruct && Array.isArray(window[key].instruct.prompts)) {
        return window[key];
      }
    } catch(e) {}
  }
  return null;
}

export function renderPromptBlocks() {
  $promptListContainer.empty();
  
  const pu = getPowerUser();
  if (!pu || !pu.instruct || !Array.isArray(pu.instruct.prompts)) {
    let debugInfo = 'N/A';
    try {
      const ctx = window.SillyTavern ? window.SillyTavern.getContext() : {};
      debugInfo = Object.keys(ctx).join(', ');
    } catch (e) {
      debugInfo = e.message;
    }
    $promptListContainer.html(`<p style="color:#f28b82; text-align:center;">Không tìm thấy cấu trúc Prompt AI trong hệ thống SillyTavern.</p><p style="color:#aaa; font-size:12px; word-break:break-all;">Debug Context Keys: ${debugInfo}</p>`);
    return;
  }

  const prompts = pu.instruct.prompts;
  
  if (prompts.length === 0) {
    $promptListContainer.html('<p style="text-align:center;">Preset hiện tại không có khối Prompt nào.</p>');
    return;
  }

  prompts.forEach((block, idx) => {
    const isEnabled = block.enabled;
    const blockHtml = `
      <div class="st-multitool-wb-item" data-idx="${idx}">
        <div class="st-multitool-wb-item-header">
          <div class="st-multitool-wb-item-title-col">
            <span class="st-multitool-wb-item-title" style="font-weight: 600;">${escapeHtml(block.name || 'Unnamed Block')}</span>
            <span class="st-multitool-wb-item-desc">Role: ${escapeHtml(block.role || '')} | Depth: ${block.injection_depth} | ID: ${escapeHtml(block.identifier || '')}</span>
          </div>
          <div class="st-multitool-wb-item-controls">
            <button class="st-multitool-btn-icon st-multitool-toggle-advanced" title="Cài đặt nâng cao">
              <i data-lucide="settings"></i>
            </button>
            <label class="st-multitool-toggle-switch">
              <input type="checkbox" class="st-multitool-prompt-enabled" ${isEnabled ? 'checked' : ''}>
              <span class="st-multitool-toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="st-multitool-prompt-advanced-settings" style="display: none; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px; margin: 10px 0; font-size: 0.9em; border: 1px solid var(--st-multitool-border);">
          <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
            <div style="flex: 1; min-width: 120px;">
              <label style="display: block; margin-bottom: 4px; color: var(--st-multitool-text-muted);">Position</label>
              <input type="number" class="st-multitool-input st-prompt-pos" value="${block.injection_position}" style="width: 100%;">
            </div>
            <div style="flex: 1; min-width: 120px;">
              <label style="display: block; margin-bottom: 4px; color: var(--st-multitool-text-muted);">Depth</label>
              <input type="number" class="st-multitool-input st-prompt-depth" value="${block.injection_depth}" style="width: 100%;">
            </div>
            <div style="flex: 1; min-width: 120px;">
              <label style="display: block; margin-bottom: 4px; color: var(--st-multitool-text-muted);">Order</label>
              <input type="number" class="st-multitool-input st-prompt-order" value="${block.injection_order}" style="width: 100%;">
            </div>
            <div style="flex: 1; min-width: 120px;">
              <label style="display: block; margin-bottom: 4px; color: var(--st-multitool-text-muted);">Role</label>
              <select class="st-multitool-input st-prompt-role" style="width: 100%;">
                <option value="system" ${block.role === 'system' ? 'selected' : ''}>System</option>
                <option value="user" ${block.role === 'user' ? 'selected' : ''}>User</option>
                <option value="assistant" ${block.role === 'assistant' ? 'selected' : ''}>Assistant</option>
              </select>
            </div>
          </div>
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <label class="st-multitool-checkbox-label">
              <input type="checkbox" class="st-prompt-sys" ${block.system_prompt ? 'checked' : ''}> System Prompt
            </label>
            <label class="st-multitool-checkbox-label">
              <input type="checkbox" class="st-prompt-marker" ${block.marker ? 'checked' : ''}> Marker
            </label>
            <label class="st-multitool-checkbox-label">
              <input type="checkbox" class="st-prompt-forbid" ${block.forbid_overrides ? 'checked' : ''}> Forbid Overrides
            </label>
          </div>
        </div>

        <div class="st-multitool-wb-item-body" style="display: block; margin-top: 10px;">
          <textarea class="st-multitool-input st-multitool-prompt-content" style="width: 100%; min-height: 80px; resize: vertical; font-family: monospace; padding: 10px; line-height: 1.4;" placeholder="Nội dung prompt...">${escapeHtml(block.content || '')}</textarea>
        </div>
      </div>
    `;
    
    $promptListContainer.append(blockHtml);
  });

  // Attach auto-resize to textareas
  $promptListContainer.find('.st-multitool-prompt-content').each(function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight + 2) + 'px';
  }).on('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight + 2) + 'px';
  });

  // Attach advanced toggle
  $promptListContainer.find('.st-multitool-toggle-advanced').on('click', function(e) {
    e.stopPropagation();
    $(this).closest('.st-multitool-wb-item').find('.st-multitool-prompt-advanced-settings').slideToggle(200);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function savePromptBlocks() {
  const pu = getPowerUser();
  if (!pu || !pu.instruct || !Array.isArray(pu.instruct.prompts)) {
    toastr.error('Không tìm thấy cấu trúc Prompt AI trong hệ thống.');
    return;
  }

  showLoader();
  try {
    const newPrompts = [];
    const originalPrompts = pu.instruct.prompts;

    $promptListContainer.find('.st-multitool-wb-item').each(function() {
      const $item = $(this);
      const idx = parseInt($item.data('idx'), 10);
      const originalBlock = originalPrompts[idx];

      const newBlock = {
        ...originalBlock,
        enabled: $item.find('.st-multitool-prompt-enabled').is(':checked'),
        content: $item.find('.st-multitool-prompt-content').val(),
        injection_position: parseInt($item.find('.st-prompt-pos').val(), 10) || 0,
        injection_depth: parseInt($item.find('.st-prompt-depth').val(), 10) || 0,
        injection_order: parseInt($item.find('.st-prompt-order').val(), 10) || 100,
        role: $item.find('.st-prompt-role').val(),
        system_prompt: $item.find('.st-prompt-sys').is(':checked'),
        marker: $item.find('.st-prompt-marker').is(':checked'),
        forbid_overrides: $item.find('.st-prompt-forbid').is(':checked'),
      };
      
      newPrompts.push(newBlock);
    });

    pu.instruct.prompts = newPrompts;

    // Optional: Try to call ST's internal save function if available
    if (typeof window.saveSettingsDebounced === 'function') {
      window.saveSettingsDebounced();
    }

    toastr.success('Lưu cấu hình Prompt thành công! Các thay đổi đã được áp dụng ngay lập tức.');
  } catch (err) {
    console.error(err);
    toastr.error('Lưu thất bại: ' + err.message);
  } finally {
    hideLoader();
  }
}
