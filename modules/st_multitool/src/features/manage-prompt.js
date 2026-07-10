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

function getPromptContainer() {
  if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
    const ctx = window.SillyTavern.getContext();
    // ST 1.18.0+
    if (ctx && ctx.chatCompletionSettings && Array.isArray(ctx.chatCompletionSettings.prompts)) {
      return ctx.chatCompletionSettings;
    }
    // ST < 1.18.0
    if (ctx && ctx.power_user && ctx.power_user.instruct && Array.isArray(ctx.power_user.instruct.prompts)) {
      return ctx.power_user.instruct;
    }
    if (ctx && ctx.powerUserSettings && ctx.powerUserSettings.instruct && Array.isArray(ctx.powerUserSettings.instruct.prompts)) {
      return ctx.powerUserSettings.instruct;
    }
  }
  // Global fallbacks
  if (window.power_user && window.power_user.instruct && Array.isArray(window.power_user.instruct.prompts)) return window.power_user.instruct;
  if (window.chatCompletionSettings && Array.isArray(window.chatCompletionSettings.prompts)) return window.chatCompletionSettings;
  
  for (let key in window) {
    try {
      if (window[key] && window[key].instruct && Array.isArray(window[key].instruct.prompts)) {
        return window[key].instruct;
      }
      if (window[key] && Array.isArray(window[key].prompts) && window[key].prompts[0] && typeof window[key].prompts[0].system_prompt !== 'undefined') {
        return window[key];
      }
    } catch(e) {}
  }
  return null;
}

export function renderPromptBlocks() {
  $promptListContainer.empty();
  
  const container = getPromptContainer();
  if (!container || !Array.isArray(container.prompts)) {
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

  const prompts = container.prompts;
  
  if (prompts.length === 0) {
    $promptListContainer.html('<p style="text-align:center;">Preset hiện tại không có khối Prompt nào.</p>');
    return;
  }

  let activeHtml = '';
  let inactiveHtml = '';

  prompts.forEach((block, idx) => {
    const isEnabled = block.enabled;
    const blockHtml = `
      <div class="st-multitool-wb-item" data-idx="${idx}" style="${isEnabled ? '' : 'opacity: 0.75;'}">
        <div class="st-multitool-wb-item-header st-multitool-accordion-header" style="cursor: pointer; user-select: none;">
          <div class="st-multitool-wb-item-title-col">
            <span class="st-multitool-drag-handle" style="cursor: grab; color: #888; margin-right: 8px;" title="Kéo thả để sắp xếp">
              <i class="fa-solid fa-grip-vertical"></i>
            </span>
            <span class="st-multitool-wb-item-title" style="font-weight: 600;">${escapeHtml(block.name || 'Unnamed Block')}</span>
            <span class="st-multitool-wb-item-desc">Role: ${escapeHtml(block.role || '')} | Depth: ${block.injection_depth} | ID: ${escapeHtml(block.identifier || '')}</span>
          </div>
          <div class="st-multitool-wb-item-controls">
            <label class="st-multitool-toggle-switch" style="margin-right: 10px;" title="Bật/Tắt khối Prompt này">
              <input type="checkbox" class="st-multitool-prompt-enabled" ${isEnabled ? 'checked' : ''}>
              <span class="st-multitool-toggle-slider"></span>
            </label>
            <i class="fa-solid fa-chevron-down st-multitool-accordion-icon" style="color: #888; transition: transform 0.2s;"></i>
          </div>
        </div>
        
        <div class="st-multitool-accordion-body" style="display: none; padding-top: 10px;">
          <div class="st-multitool-prompt-advanced-settings" style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px; margin-bottom: 10px; font-size: 0.9em; border: 1px solid var(--st-multitool-border);">
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
      </div>
    `;
    
    if (isEnabled) activeHtml += blockHtml;
    else inactiveHtml += blockHtml;
  });

  const layoutHtml = `
    <h5 style="margin: 0 0 10px 0; color: #34d399; font-size: 0.95em;"><i class="fa-solid fa-link"></i> Linked / Active Prompts</h5>
    <div id="st-multitool-prompt-list-active" class="st-multitool-prompt-sortable-list" style="min-height: 50px; border: 1px dashed rgba(52, 211, 153, 0.2); border-radius: 8px; padding: 10px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; background: rgba(0,0,0,0.15);">
      ${activeHtml}
    </div>
    <h5 style="margin: 0 0 10px 0; color: #aaa; font-size: 0.95em;"><i class="fa-solid fa-unlink"></i> Unlinked / Inactive Prompts</h5>
    <div id="st-multitool-prompt-list-inactive" class="st-multitool-prompt-sortable-list" style="min-height: 50px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 10px; background: rgba(0,0,0,0.15);">
      ${inactiveHtml}
    </div>
  `;

  $promptListContainer.html(layoutHtml);

  // Bind accordion click
  $promptListContainer.find('.st-multitool-accordion-header').on('click', function(e) {
    if ($(e.target).closest('.st-multitool-toggle-switch').length || $(e.target).closest('.st-multitool-drag-handle').length) return; // Ignore click on toggle switch or drag handle
    const $body = $(this).next('.st-multitool-accordion-body');
    const $icon = $(this).find('.st-multitool-accordion-icon');
    $body.slideToggle(200);
    $icon.css('transform', $body.is(':visible') ? 'rotate(180deg)' : 'rotate(0deg)');
  });

  // Attach auto-resize to textareas
  $promptListContainer.find('.st-multitool-prompt-content').each(function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight + 2) + 'px';
  }).on('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight + 2) + 'px';
  });

  // Handle manual toggle switch click to move between lists
  $promptListContainer.find('.st-multitool-prompt-enabled').on('change', function(e) {
    const isChecked = $(this).is(':checked');
    const $item = $(this).closest('.st-multitool-wb-item');
    if (isChecked) {
      $item.css('opacity', '1');
      $('#st-multitool-prompt-list-active').append($item);
    } else {
      $item.css('opacity', '0.75');
      $('#st-multitool-prompt-list-inactive').append($item);
    }
    savePromptBlocks();
  });

  // Enable Sortable with connected lists
  if (typeof $promptListContainer.sortable === 'function') {
    $promptListContainer.find('.st-multitool-prompt-sortable-list').sortable({
      connectWith: '.st-multitool-prompt-sortable-list',
      handle: '.st-multitool-drag-handle',
      receive: function(event, ui) {
        // Fired when an item is dropped into a different list
        const isNowActive = $(this).attr('id') === 'st-multitool-prompt-list-active';
        ui.item.find('.st-multitool-prompt-enabled').prop('checked', isNowActive);
        ui.item.css('opacity', isNowActive ? '1' : '0.75');
        savePromptBlocks();
      },
      update: function(event, ui) {
        // Prevent double saving when moving between lists
        if (!ui.sender) {
          savePromptBlocks(); 
        }
      }
    });
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function savePromptBlocks() {
  const container = getPromptContainer();
  if (!container || !Array.isArray(container.prompts)) {
    toastr.error('Không tìm thấy cấu trúc Prompt AI trong hệ thống.');
    return;
  }
  showLoader();
  try {
    const newPrompts = [];
    const originalPrompts = container.prompts;

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

    container.prompts = newPrompts;

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
