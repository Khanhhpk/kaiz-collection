import { escapeHtml } from '../utils.js';
import { showLoader, hideLoader, showSubView } from '../ui.js';
import { getPendingVarChanges, clearPendingVarChanges, applyVarChangesToContent, refreshVarInspector } from './var-inspector.js';

let $promptListContainer;
let $saveBtn;

export function initManagePrompt() {
  $promptListContainer = $('#st-multitool-prompt-list-container');
  $saveBtn = $('#st-multitool-save-prompt-btn');

  $('#st-multitool-manage-prompt-btn').on('click', () => {
    showSubView('st-multitool-manage-prompt-view');
    showLoader();
    
    // Defer heavy DOM operations so the view and loader can render first
    setTimeout(() => {
      try {
        renderPromptBlocks();
        $('#st-multitool-prompt-search').val('').trigger('input'); // Clear search on open
        if (window.lucide) {
          window.lucide.createIcons();
        }
      } finally {
        hideLoader();
      }
    }, 50);
  });

  $saveBtn.on('click', () => {
    showLoader();
    setTimeout(() => {
      try {
        savePromptBlocks();
        if (window.refreshPromptList) window.refreshPromptList();
      } finally {
        hideLoader();
      }
    }, 50);
  });
  
  $('#st-multitool-reset-prompt-btn').on('click', () => {
    showLoader();
    setTimeout(() => {
      try {
        renderPromptBlocks();
        $('#st-multitool-prompt-search').val('').trigger('input'); // Clear search on reset
        toastr.info('Đã hoàn tác (undo) các thay đổi chưa lưu.');
      } finally {
        hideLoader();
      }
    }, 50);
  });

  const autoSaveToggle = $('#st-multitool-auto-save-preset-toggle');
  if (autoSaveToggle.length) {
    const isAutoSave = localStorage.getItem('st-multitool-auto-save-preset');
    if (isAutoSave !== null) {
      autoSaveToggle.prop('checked', isAutoSave === 'true');
    } else {
      autoSaveToggle.prop('checked', true); // Mặc định bật
    }

    autoSaveToggle.on('change', function() {
      localStorage.setItem('st-multitool-auto-save-preset', $(this).prop('checked'));
    });
  }

  const performSearch = () => {
    const searchTerm = $('#st-multitool-prompt-search').val().trim().toLowerCase();
    const enableHighlight = $('#st-multitool-prompt-search-highlight-toggle').is(':checked');
    
    // Tắt kéo thả khi đang tìm kiếm để tránh lỗi thứ tự
    const $sortableLists = $promptListContainer.find('.st-multitool-prompt-sortable-list');
    if (typeof $sortableLists.sortable === 'function') {
      if (searchTerm === '') {
        $sortableLists.sortable('enable');
      } else {
        $sortableLists.sortable('disable');
      }
    }

    if (searchTerm === '') {
      if (!$promptListContainer.data('is-filtered')) return; // Already clean
      
      // Fast path restore display
      const items = $promptListContainer[0].getElementsByClassName('st-multitool-wb-item');
      for (let i = 0; i < items.length; i++) {
        items[i].style.display = 'block';
      }
      
      // Fast path restore text if previously highlighted
      if ($promptListContainer.data('is-highlighted')) {
        $promptListContainer.find('.st-multitool-wb-item').each(function() {
          const $item = $(this);
          const origTitle = $item.attr('data-orig-title');
          if (origTitle != null) {
            $item.find('.st-multitool-item-title-text').text(origTitle);
          }
          const $backdrop = $item.find('.st-multitool-highlight-backdrop');
          const $textarea = $item.find('.st-multitool-prompt-content');
          let content = $textarea.val();
          if (content && content.endsWith('\n')) content += ' ';
          $backdrop.text(content);
        });
        $promptListContainer.data('is-highlighted', false);
      }
      $promptListContainer.data('is-filtered', false);
      return;
    }

    $promptListContainer.data('is-filtered', true);
    if (enableHighlight) $promptListContainer.data('is-highlighted', true);

    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const highlightRegex = enableHighlight ? new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi') : null;
    
    const safeHighlight = (text, isBackdrop = true) => {
      if (!text) return '';
      if (!highlightRegex) return escapeHtml(text);
      const parts = text.split(highlightRegex);
      return parts.map((part, i) => {
        if (i % 2 === 1) { // Captured match
          const colorStyle = isBackdrop ? 'color: transparent;' : 'color: inherit;';
          return `<mark style="background-color: rgba(255, 255, 0, 0.7); ${colorStyle} border-radius: 2px;">${escapeHtml(part)}</mark>`;
        }
        return escapeHtml(part);
      }).join('');
    };

    $promptListContainer.find('.st-multitool-wb-item').each(function() {
      const $item = $(this);
      const $titleSpan = $item.find('.st-multitool-item-title-text');
      const $textarea = $item.find('.st-multitool-prompt-content');

      if ($item.attr('data-orig-title') == null) {
        $item.attr('data-orig-title', $titleSpan.text());
        $item.attr('data-orig-desc', $item.find('.st-multitool-wb-item-desc').text());
      }
      
      const origTitle = $item.attr('data-orig-title');
      const origDesc = $item.attr('data-orig-desc');
      let content = $textarea.val();
      if (content.endsWith('\n')) content += ' '; // Fix trailing newline for backdrop

      const origTitleLower = origTitle.toLowerCase();
      const origDescLower = origDesc.toLowerCase();
      const contentLower = content.toLowerCase();

      const isMatch = origTitleLower.includes(searchTerm) || origDescLower.includes(searchTerm) || contentLower.includes(searchTerm);

      if (isMatch) {
        $item.css('display', 'block');
        
        if (enableHighlight) {
          if (origTitleLower.includes(searchTerm)) {
            $titleSpan.html(safeHighlight(origTitle, false));
          } else {
            $titleSpan.text(origTitle);
          }

          const $backdrop = $item.find('.st-multitool-highlight-backdrop');
          if (contentLower.includes(searchTerm)) {
            $backdrop.html(safeHighlight(content, true));
          } else {
            $backdrop.text(content);
          }
        }
      } else {
        $item.css('display', 'none');
      }
    });
  };

  $('#st-multitool-prompt-search-btn').on('click', performSearch);
  $('#st-multitool-prompt-search').on('input', function() {
    const val = $(this).val();
    $('#st-multitool-prompt-search-clear').css('display', val.length > 0 ? 'block' : 'none');
  }).on('keypress', function(e) {
    if (e.which === 13) {
      performSearch();
    }
  });
  
  $('#st-multitool-prompt-search-clear').on('click', function() {
    $('#st-multitool-prompt-search').val('').trigger('input');
    performSearch();
  });

  const highlightToggle = $('#st-multitool-prompt-search-highlight-toggle');
  const isHighlightEnabled = localStorage.getItem('st-multitool-prompt-search-highlight');
  highlightToggle.prop('checked', isHighlightEnabled === null ? false : isHighlightEnabled === 'true'); // Mặc định tắt
  highlightToggle.on('change', function() {
    localStorage.setItem('st-multitool-prompt-search-highlight', $(this).prop('checked'));
    performSearch();
  });
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
  
  const rawOrder = container.prompt_order || [];
  let promptOrder = [];
  
  if (Array.isArray(rawOrder) && rawOrder.length > 0) {
    if (typeof rawOrder[0] === 'object' && Array.isArray(rawOrder[0].order)) {
      // Lấy trực tiếp order từ phần tử đầu tiên, bỏ qua character_id
      let currentOrderObj = rawOrder[0];
      if (currentOrderObj && Array.isArray(currentOrderObj.order)) {
        promptOrder = currentOrderObj.order.map(item => item.identifier);
      }
    } else {
      promptOrder = rawOrder.map(item => (typeof item === 'string') ? item : item.identifier);
    }
  }

  const orderIdentifiers = promptOrder.filter(id => id != null);

  let activeHtml = '';
  let inactiveHtml = '';

  const renderBlock = (block, idx) => {
    const isEnabled = block.enabled;
    return `
      <div class="st-multitool-wb-item" data-idx="${idx}" data-id="${escapeHtml(block.identifier || '')}">
        <div class="st-multitool-wb-item-header st-multitool-accordion-header" style="cursor: pointer; user-select: none;">
          <div class="st-multitool-wb-item-title-col">
            <span class="st-multitool-drag-handle" style="cursor: grab; color: #888; margin-right: 8px;" title="Kéo thả để sắp xếp">
              <i data-lucide="grip-vertical" style="width: 16px; height: 16px;"></i>
            </span>
            <span class="st-multitool-wb-item-title" style="font-weight: 600;"><span class="st-multitool-item-title-text">${escapeHtml(block.name || 'Unnamed Block')}</span></span>
            <span class="st-multitool-wb-item-desc">Role: ${escapeHtml(block.role || '')} | Depth: ${block.injection_depth} | ID: ${escapeHtml(block.identifier || '')}</span>
          </div>
          <div class="st-multitool-wb-item-controls">
            <label class="st-multitool-toggle-switch" style="margin-right: 10px;" title="Bật/Tắt khối Prompt này">
              <input type="checkbox" class="st-multitool-prompt-enabled" ${isEnabled ? 'checked' : ''}>
              <span class="st-multitool-toggle-slider"></span>
            </label>
            <i data-lucide="chevron-down" class="st-multitool-accordion-icon" style="color: #888; transition: transform 0.2s; width: 16px; height: 16px;"></i>
          </div>
        </div>
        
        <div class="st-multitool-accordion-body" style="display: none; padding-top: 10px;">
          <div class="st-multitool-prompt-advanced-settings" style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px; margin-bottom: 10px; font-size: 0.9em; border: 1px solid var(--st-multitool-border);">
            <div style="margin-bottom: 12px;">
              <label style="display: block; margin-bottom: 4px; color: var(--st-multitool-text-muted);">Name</label>
              <input type="text" class="st-multitool-input st-prompt-name" value="${escapeHtml(block.name || 'Unnamed Block')}" style="width: 100%;">
            </div>
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

        <div class="st-multitool-wb-item-body" style="display: block; margin-top: 10px; position: relative;">
          <div class="st-multitool-textarea-container" style="position: relative; width: 100%;">
            <div class="st-multitool-input st-multitool-highlight-backdrop" style="position: absolute; top: -1px; left: 0; width: 100%; height: 100%; padding: 10px; font-family: monospace; font-size: 13px; line-height: 1.5; letter-spacing: normal; color: transparent; background: transparent; border-color: transparent; white-space: pre-wrap; word-break: break-word; overflow-y: auto; overflow-x: hidden; box-sizing: border-box; pointer-events: none; z-index: 1; resize: none; margin: 0;"></div>
            <textarea class="st-multitool-input st-multitool-prompt-content" style="position: relative; width: 100%; min-height: 150px; resize: vertical; font-family: monospace; font-size: 13px; line-height: 1.5; letter-spacing: normal; background: transparent; color: var(--st-multitool-text); z-index: 2; box-sizing: border-box; caret-color: var(--st-multitool-text); margin: 0; overflow-y: auto; overflow-x: hidden; white-space: pre-wrap; word-break: break-word;" placeholder="Nội dung prompt...">${escapeHtml(block.content || '')}</textarea>
          </div>
        </div>
        </div>
      </div>
    `;
  };

  // Build active list (maintaining prompt_order sequence)
  promptOrder.forEach(orderItem => {
    const id = (typeof orderItem === 'string') ? orderItem : orderItem.identifier;
    const idx = prompts.findIndex(p => p.identifier === id);
    if (idx !== -1) {
      activeHtml += renderBlock(prompts[idx], idx);
    }
  });

  // Build inactive list
  prompts.forEach((block, idx) => {
    if (!orderIdentifiers.includes(block.identifier)) {
      inactiveHtml += renderBlock(block, idx);
    }
  });

  const layoutHtml = `
    <h5 style="margin: 0 0 10px 0; color: #34d399; font-size: 0.95em; flex-shrink: 0; display: flex; align-items: center; gap: 6px;"><i data-lucide="link" style="width: 16px; height: 16px;"></i> Linked Prompts (In Order)</h5>
    <div id="st-multitool-prompt-list-active" class="st-multitool-prompt-sortable-list" style="flex-shrink: 0; min-height: 50px; border: 1px dashed rgba(52, 211, 153, 0.2); border-radius: 8px; padding: 10px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; background: rgba(0,0,0,0.15);">
      ${activeHtml}
    </div>
    <h5 style="margin: 0 0 10px 0; color: #aaa; font-size: 0.95em; flex-shrink: 0; display: flex; align-items: center; gap: 6px;"><i data-lucide="unlink" style="width: 16px; height: 16px;"></i> Unlinked Prompts</h5>
    <div id="st-multitool-prompt-list-inactive" class="st-multitool-prompt-sortable-list" style="flex-shrink: 0; min-height: 50px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 10px; background: rgba(0,0,0,0.15);">
      ${inactiveHtml}
    </div>
  `;

  $promptListContainer.html(layoutHtml);
  if (window.lucide) window.lucide.createIcons();

  // Bind accordion click
  $promptListContainer.find('.st-multitool-accordion-header').on('click', function(e) {
    if ($(e.target).closest('.st-multitool-toggle-switch').length || $(e.target).closest('.st-multitool-drag-handle').length) return; // Ignore click on toggle switch or drag handle
    const $body = $(this).next('.st-multitool-accordion-body');
    const $icon = $(this).find('.st-multitool-accordion-icon');
    $body.slideToggle(200);
    $icon.css('transform', $body.is(':visible') ? 'rotate(180deg)' : 'rotate(0deg)');
  });

  // Sync scroll and input for backdrop highlight
  const updateBackdrop = ($textarea) => {
    let content = $textarea.val();
    if (content.endsWith('\n')) content += ' '; // Fix trailing newline rendering in div
    const $backdrop = $textarea.siblings('.st-multitool-highlight-backdrop');
    
    // Check if we need to highlight
    const searchTerm = $('#st-multitool-prompt-search').val().trim().toLowerCase();
    const enableHighlight = $('#st-multitool-prompt-search-highlight-toggle').is(':checked');
    if (searchTerm && enableHighlight && content.toLowerCase().includes(searchTerm)) {
      const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const highlightRegex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
      const safeHighlight = (text) => {
        if (!text) return '';
        const parts = text.split(highlightRegex);
        return parts.map((part, i) => {
          if (i % 2 === 1) return `<mark style="background-color: rgba(255, 255, 0, 0.7); color: transparent; border-radius: 2px;">${escapeHtml(part)}</mark>`;
          return escapeHtml(part);
        }).join('');
      };
      $backdrop.html(safeHighlight(content));
    } else {
      $backdrop.text(content);
    }
    $backdrop.scrollTop($textarea.scrollTop());
  };

  $promptListContainer.find('.st-multitool-prompt-content').on('scroll', function() {
    $(this).siblings('.st-multitool-highlight-backdrop').scrollTop($(this).scrollTop());
  }).on('input', function() {
    updateBackdrop($(this));
  });
  
  // Initialize backdrops correctly on load
  $promptListContainer.find('.st-multitool-prompt-content').each(function() {
    updateBackdrop($(this));
  });

  $promptListContainer.find('.st-prompt-name').on('input', function() {
    const newName = $(this).val() || 'Unnamed Block';
    const $item = $(this).closest('.st-multitool-wb-item');
    $item.find('.st-multitool-item-title-text').text(newName);
    $item.attr('data-orig-title', newName); // Cập nhật luôn cho tính năng tìm kiếm
  });

  // Handle manual toggle switch click (only save state, don't move between lists)
  $promptListContainer.find('.st-multitool-prompt-enabled').on('change', function(e) {
    // Không tự động lưu nữa
  });

  // Enable Sortable with connected lists
  if (typeof $promptListContainer.sortable === 'function') {
    $promptListContainer.find('.st-multitool-prompt-sortable-list').sortable({
      connectWith: '.st-multitool-prompt-sortable-list',
      handle: '.st-multitool-drag-handle',
      receive: function(event, ui) {
        // Không tự động lưu nữa
      },
      update: function(event, ui) {
        // Không tự động lưu nữa
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
  
  try {
    const { renames, valuesBySource } = getPendingVarChanges();
    const hasVarChanges = Object.keys(renames).length > 0 || Object.keys(valuesBySource || {}).length > 0;
    
    const newPrompts = [];
    const newPromptOrder = [];
    const originalPrompts = container.prompts;

    const oldPromptOrderMap = new Map();
    if (Array.isArray(container.prompt_order)) {
      container.prompt_order.forEach(item => {
        if (item && item.identifier) {
          oldPromptOrderMap.set(item.identifier, item);
        } else if (typeof item === 'string') {
          oldPromptOrderMap.set(item, { identifier: item });
        }
      });
    }

    const processItem = ($item, isActiveList) => {
      const identifier = $item.attr('data-id');
      const originalBlock = originalPrompts.find(p => String(p.identifier) === String(identifier)) || {};

      let content = $item.find('.st-multitool-prompt-content').val();
      if (hasVarChanges) {
        content = applyVarChangesToContent(content, identifier, renames, valuesBySource);
      }

      const newBlock = {
        ...originalBlock,
        name: $item.find('.st-prompt-name').val() || 'Unnamed Block',
        enabled: $item.find('.st-multitool-prompt-enabled').is(':checked'),
        content: content,
        injection_position: parseInt($item.find('.st-prompt-pos').val(), 10) || 0,
        injection_depth: parseInt($item.find('.st-prompt-depth').val(), 10) || 0,
        injection_order: parseInt($item.find('.st-prompt-order').val(), 10) || 100,
        role: $item.find('.st-prompt-role').val(),
        system_prompt: $item.find('.st-prompt-sys').is(':checked'),
        marker: $item.find('.st-prompt-marker').is(':checked'),
        forbid_overrides: $item.find('.st-prompt-forbid').is(':checked'),
      };
      
      newPrompts.push(newBlock);

      if (isActiveList) {
        if (oldPromptOrderMap.has(newBlock.identifier)) {
          newPromptOrder.push(oldPromptOrderMap.get(newBlock.identifier));
        } else {
          newPromptOrder.push({ identifier: newBlock.identifier });
        }
      }
    };
    $('#st-multitool-prompt-list-active .st-multitool-wb-item').each(function() {
      processItem($(this), true);
    });

    $('#st-multitool-prompt-list-inactive .st-multitool-wb-item').each(function() {
      processItem($(this), false);
    });

    // 1. Cập nhật mảng trực tiếp vào bộ nhớ tạm của ST
    if (container.prompts && Array.isArray(container.prompts)) {
      container.prompts.length = 0;
      newPrompts.forEach(p => container.prompts.push(p));
    } else {
      container.prompts = newPrompts;
    }
    
    // Check if it was ST 1.18.0 format originally
    if (Array.isArray(container.prompt_order) && container.prompt_order.length > 0 && typeof container.prompt_order[0] === 'object' && Array.isArray(container.prompt_order[0].order)) {
      const ctx = window.SillyTavern && typeof window.SillyTavern.getContext === 'function' ? window.SillyTavern.getContext() : {};
      const charId = ctx.characterId;
      
      let targetOrderObj = container.prompt_order.find(o => o.character_id === charId);
      if (!targetOrderObj) targetOrderObj = container.prompt_order.length > 0 ? container.prompt_order[0] : null;

      if (targetOrderObj) {
        targetOrderObj.order = newPromptOrder.map(item => {
           const promptBlock = newPrompts.find(p => p.identifier === item.identifier);
           return { enabled: promptBlock ? promptBlock.enabled : true, identifier: item.identifier };
        });
      }
    } else {
      container.prompt_order = newPromptOrder;
    }
    
    // 2. Yêu cầu ST vẽ lại UI từ bộ nhớ tạm ra màn hình
    if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
      const stContext = window.SillyTavern.getContext();
      
      if (stContext && stContext.eventSource && typeof stContext.eventSource.emit === 'function') {
        stContext.eventSource.emit('oai_preset_changed_after');
      }
      
      // 3. Chờ 1.5 giây để ST hoàn tất việc vẽ UI mới
      setTimeout(() => {
        const autoSaveToggle = $('#st-multitool-auto-save-preset-toggle');
        const shouldAutoSave = autoSaveToggle.length ? autoSaveToggle.prop('checked') : true;

        if (shouldAutoSave) {
          // 4. Bấm nút lưu gốc của ST (Lưu từ màn hình xuống ổ cứng và chốt lớp tạm)
          const saveBtn = document.querySelector('#update_oai_preset') || document.querySelector('#chat_completion_save_preset') || document.querySelector('#preset_save_button');
          if (saveBtn && typeof saveBtn.click === 'function') {
              saveBtn.click();
              console.log("ST Multitool: Đã kích hoạt nút Lưu mặc định của ST để đồng bộ cả bộ nhớ tạm lẫn ổ cứng.");
          } else {
              console.warn("ST Multitool: Không tìm thấy nút Lưu mặc định của ST, chỉ gọi hàm saveSettingsDebounced.");
          }
        } else {
          console.log("ST Multitool: Bỏ qua kích hoạt nút Lưu mặc định của ST do người dùng tắt tuỳ chọn đồng bộ file gốc.");
        }
        
        // Cũng gọi lưu settings.json phòng hờ (để chốt lớp tạm vào bộ nhớ của user)
        if (stContext && typeof stContext.saveSettingsDebounced === 'function') {
            stContext.saveSettingsDebounced();
            console.log("ST Multitool: Đã gọi stContext.saveSettingsDebounced() để lưu lớp tạm.");
        } else if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
            console.log("ST Multitool: Đã gọi window.saveSettingsDebounced() để lưu lớp tạm.");
        }
      }, 1500);
    }

    if (hasVarChanges) {
      clearPendingVarChanges();
      $('#st-multitool-save-prompt-btn').html('<i data-lucide="save"></i> Lưu Preset');
      if (window.lucide) window.lucide.createIcons();
      refreshVarInspector();
      renderPromptBlocks();
    }

    toastr.success('Đã lưu cấu hình Prompt Preset.');
  } catch (err) {
    console.error(err);
    toastr.error('Lưu thất bại: ' + err.message);
  }
}
