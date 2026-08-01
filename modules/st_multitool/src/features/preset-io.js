import { escapeHtml, refreshIcons } from '../utils.js';
import { getPendingVarChanges, clearPendingVarChanges, applyVarChangesToContent, refreshVarInspector } from './var-inspector.js';
import { getPendingDeletes, getPendingAdds, clearPendingBlockChanges, renderPromptBlocks } from './manage-prompt.js';

let _originalSnapshot = null;

export function captureOriginalSnapshot() {
  const container = getPromptContainer();
  if (container && Array.isArray(container.prompts)) {
    // 1. Lấy trạng thái enabled từ prompt_order (ưu tiên ST 1.18+)
    const orderEnabledMap = new Map();
    if (Array.isArray(container.prompt_order) && container.prompt_order.length > 0) {
      const flatOrder = (typeof container.prompt_order[0] === 'object' && Array.isArray(container.prompt_order[0]?.order))
        ? container.prompt_order[0].order
        : container.prompt_order;
      flatOrder.forEach(item => {
        if (typeof item === 'object' && item.identifier) {
          orderEnabledMap.set(item.identifier, item.enabled !== false); // default to true if undefined
        }
      });
    }

    // 2. Cập nhật trạng thái enabled vào container.prompts
    container.prompts.forEach(p => {
      if (orderEnabledMap.has(p.identifier)) {
        p.enabled = orderEnabledMap.get(p.identifier);
      }
    });

    _originalSnapshot = {
      prompts: JSON.parse(JSON.stringify(container.prompts)),
      prompt_order: container.prompt_order ? JSON.parse(JSON.stringify(container.prompt_order)) : null
    };
  }
}

export function restoreOriginalSnapshot() {
  const container = getPromptContainer();
  if (container && _originalSnapshot && Array.isArray(_originalSnapshot.prompts)) {
    container.prompts.length = 0;
    _originalSnapshot.prompts.forEach(p => container.prompts.push(JSON.parse(JSON.stringify(p))));
    if (_originalSnapshot.prompt_order !== null) {
      if (Array.isArray(container.prompt_order) && container.prompt_order.length > 0 && typeof container.prompt_order[0] === 'object' && Array.isArray(container.prompt_order[0]?.order)) {
        const ctx = window.SillyTavern?.getContext?.() || {};
        const charId = ctx.characterId;
        let targetObj = container.prompt_order.find(o => o.character_id === charId) || container.prompt_order[0];
        if (targetObj && Array.isArray(_originalSnapshot.prompt_order)) {
          if (typeof _originalSnapshot.prompt_order[0] === 'object' && Array.isArray(_originalSnapshot.prompt_order[0]?.order)) {
            let snapTarget = _originalSnapshot.prompt_order.find(o => o.character_id === charId) || _originalSnapshot.prompt_order[0];
            if (snapTarget) targetObj.order = JSON.parse(JSON.stringify(snapTarget.order));
          } else {
            targetObj.order = JSON.parse(JSON.stringify(_originalSnapshot.prompt_order));
          }
        }
      } else {
        container.prompt_order = JSON.parse(JSON.stringify(_originalSnapshot.prompt_order));
      }
    }
  }
}

// ─── Active API Context Helper ────────────────────────────────────────────────
export function getActiveApiContext() {
  if (typeof window === 'undefined' || !window.SillyTavern || typeof window.SillyTavern.getContext !== 'function') {
    return { container: null, isChatApi: true };
  }
  
  const ctx = window.SillyTavern.getContext();
  return {
    container: ctx.chatCompletionSettings,
    isChatApi: true
  };
}

// ─── Get ST prompt container (Legacy Alias) ──────────────────────────────────
export function getPromptContainer() {
  return getActiveApiContext().container;
}

// ─── Live Editor Snapshot (cho AI Agency đọc trạng thái làm việc real-time) ────
export function getCurrentEditorSnapshot() {
  const container = getPromptContainer();
  if (!container || !Array.isArray(container.prompts)) return { prompts: [], prompt_order: [] };

  const { renames = {}, valuesBySource = {} } = getPendingVarChanges() || {};
  const hasVarChanges = Object.keys(renames).length > 0 || Object.keys(valuesBySource).length > 0;

  const $activeItems = $('#st-multitool-prompt-list-active .st-multitool-wb-item');
  const $inactiveItems = $('#st-multitool-prompt-list-inactive .st-multitool-wb-item');
  const hasDomItems = $activeItems.length > 0 || $inactiveItems.length > 0;

  const newPrompts = [];
  const newPromptOrder = [];
  const originalPrompts = container.prompts;

  if (hasDomItems) {
    const processItem = ($item, isActiveList) => {
      const identifier = $item.attr('data-id');
      if (!identifier || getPendingDeletes().has(identifier)) return;

      const originalBlock = originalPrompts.find(p => String(p.identifier) === String(identifier))
        || (getPendingAdds().find(p => p.block.identifier === identifier) || {}).block
        || null;

      if (!originalBlock?.identifier) return;

      let content = $item.find('.st-multitool-prompt-content').val() ?? originalBlock.content ?? '';
      if (hasVarChanges) content = applyVarChangesToContent(content, identifier, renames, valuesBySource);

      const injPos = parseInt($item.find('.st-prompt-pos').val(), 10);
      const depthVal = parseInt($item.find('.st-prompt-depth').val(), 10) || originalBlock.injection_depth || 0;
      const orderVal = parseInt($item.find('.st-prompt-order').val(), 10) || originalBlock.injection_order || 100;

      const newBlock = {
        ...originalBlock,
        identifier: originalBlock.identifier,
        id: originalBlock.identifier,
        name: $item.find('.st-prompt-name').val() || originalBlock.name || 'Unnamed Block',
        enabled: $item.find('.st-multitool-prompt-enabled').is(':checked'),
        content,
        role: $item.find('.st-prompt-role').val() || originalBlock.role || 'system',
        system_prompt: $item.find('.st-prompt-sys').is(':checked'),
        marker: $item.find('.st-prompt-marker').is(':checked'),
        forbid_overrides: $item.find('.st-prompt-forbid').is(':checked'),
        injection_position: isNaN(injPos) ? (originalBlock.injection_position ?? 0) : injPos,
        injection_depth: depthVal,
        injection_order: orderVal,
      };

      newPrompts.push(newBlock);

      if (isActiveList) {
        newPromptOrder.push(newBlock.identifier);
      }
    };

    $activeItems.each(function() { processItem($(this), true); });
    $inactiveItems.each(function() { processItem($(this), false); });
  } else {
    originalPrompts.forEach(p => {
      if (getPendingDeletes().has(p.identifier)) return;
      let content = p.content || '';
      if (hasVarChanges) content = applyVarChangesToContent(content, p.identifier, renames, valuesBySource);
      newPrompts.push({ ...p, content });
    });
    getPendingAdds().forEach(p => {
      if (getPendingDeletes().has(p.block.identifier)) return;
      let content = p.block.content || '';
      if (hasVarChanges) content = applyVarChangesToContent(content, p.block.identifier, renames, valuesBySource);
      newPrompts.push({ ...p.block, content });
    });

    let promptOrder = [];
    if (Array.isArray(container.prompt_order)) {
      const flatOrder = (typeof container.prompt_order[0] === 'object' && Array.isArray(container.prompt_order[0]?.order))
        ? container.prompt_order[0].order
        : container.prompt_order;
      promptOrder = flatOrder.map(item => typeof item === 'string' ? item : item?.identifier).filter(Boolean);
    }
    newPromptOrder.push(...promptOrder.filter(id => !getPendingDeletes().has(id)));
    getPendingAdds().forEach(p => {
      if (p.addToLinked && !getPendingDeletes().has(p.block.identifier)) {
        if (typeof p.position === 'number' && p.position >= 0 && p.position <= newPromptOrder.length) newPromptOrder.splice(p.position, 0, p.block.identifier);
        else if (p.insertTop) newPromptOrder.unshift(p.block.identifier);
        else newPromptOrder.push(p.block.identifier);
      }
    });
  }

  return { prompts: newPrompts, prompt_order: newPromptOrder };
}

// ─── Save ─────────────────────────────────────────────────────────────────────
export function savePromptBlocks() {
  const { container, isChatApi } = getActiveApiContext();
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

    // Build map từ prompt_order cũ để bảo toàn các metadata (enabled, v.v.)
    const oldOrderMap = new Map();
    let isStringFormat = false;
    if (Array.isArray(container.prompt_order)) {
      const flatOrder = (typeof container.prompt_order[0] === 'object' && Array.isArray(container.prompt_order[0]?.order))
        ? container.prompt_order[0].order
        : container.prompt_order;
      
      if (flatOrder.length > 0 && typeof flatOrder[0] === 'string') {
        isStringFormat = true;
      }
      
      flatOrder.forEach(item => {
        if (!item) return;
        const id = typeof item === 'string' ? item : item.identifier;
        if (id) oldOrderMap.set(id, item);
      });
    }

    const processItem = ($item, isActiveList) => {
      const identifier = $item.attr('data-id');
      if (!identifier || getPendingDeletes().has(identifier)) return;

      // Tìm block data: ưu tiên container.prompts, rồi mới _pendingAdds
      const originalBlock = originalPrompts.find(p => String(p.identifier) === String(identifier))
        || (getPendingAdds().find(p => p.block.identifier === identifier) || {}).block
        || null;

      if (!originalBlock?.identifier) {
        console.warn('[ST Multitool] processItem: block không tìm được, bỏ qua identifier:', identifier);
        return;
      }

      let content = $item.find('.st-multitool-prompt-content').val() ?? originalBlock.content ?? '';
      if (hasVarChanges) content = applyVarChangesToContent(content, identifier, renames, valuesBySource);

      const injPos = parseInt($item.find('.st-prompt-pos').val(), 10);
      const depthVal = parseInt($item.find('.st-prompt-depth').val(), 10) || originalBlock.injection_depth || 0;
      const orderVal = parseInt($item.find('.st-prompt-order').val(), 10) || originalBlock.injection_order || 100;

      const newBlock = {
        ...originalBlock,
        identifier: originalBlock.identifier,  // luôn giữ nguyên
        id: originalBlock.identifier,           // ST yêu cầu id === identifier
        name: $item.find('.st-prompt-name').val() || originalBlock.name || 'Unnamed Block',
        enabled: $item.find('.st-multitool-prompt-enabled').is(':checked'),
        content,
        role: $item.find('.st-prompt-role').val() || originalBlock.role || 'system',
        system_prompt: $item.find('.st-prompt-sys').is(':checked'),
        marker: $item.find('.st-prompt-marker').is(':checked'),
        forbid_overrides: $item.find('.st-prompt-forbid').is(':checked'),
        injection_position: isNaN(injPos) ? (originalBlock.injection_position ?? 0) : injPos,
        injection_depth: depthVal,
        injection_order: orderVal,
      };

      newPrompts.push(newBlock);

      if (isActiveList) {
        if (isStringFormat) {
          newPromptOrder.push(newBlock.identifier);
        } else {
          // Giữ lại object cũ nếu có, hoặc tạo mới với enabled từ block
          const oldEntry = oldOrderMap.get(newBlock.identifier);
          newPromptOrder.push(
            (oldEntry && typeof oldEntry === 'object')
              ? { ...oldEntry, enabled: newBlock.enabled }
              : { identifier: newBlock.identifier, enabled: newBlock.enabled }
          );
        }
      }
    };

    $('#st-multitool-prompt-list-active .st-multitool-wb-item').each(function() { processItem($(this), true); });
    $('#st-multitool-prompt-list-inactive .st-multitool-wb-item').each(function() { processItem($(this), false); });

    // Ghi vào bộ nhớ tạm của ST
    container.prompts.length = 0;
    newPrompts.forEach(p => container.prompts.push(p));

    // Ghi prompt_order (xử lý cả ST 1.18+ format lẫn flat format)
    if (Array.isArray(container.prompt_order) && container.prompt_order.length > 0
        && typeof container.prompt_order[0] === 'object' && Array.isArray(container.prompt_order[0]?.order)) {
      // ST 1.18+ nested format
      const ctx = window.SillyTavern?.getContext?.() || {};
      const charId = ctx.characterId;
      let targetObj = container.prompt_order.find(o => o.character_id === charId) || container.prompt_order[0];
      if (targetObj) targetObj.order = newPromptOrder;
    } else {
      container.prompt_order = newPromptOrder;
    }

    // Yêu cầu ST cập nhật UI và lưu file
    if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
      const stContext = window.SillyTavern.getContext();
      if (isChatApi) {
        stContext?.eventSource?.emit?.('oai_preset_changed_after');
      }

      setTimeout(() => {
        const autoSave = $('#st-multitool-auto-save-preset-toggle');
        const shouldAutoSave = autoSave.length ? autoSave.prop('checked') : true;

        if (shouldAutoSave) {
          let saveBtn = null;
          if (isChatApi) {
            saveBtn = document.querySelector('#update_oai_preset') || document.querySelector('#chat_completion_save_preset');
          } else {
            saveBtn = document.querySelector('#preset_save_button');
          }
          
          if (!saveBtn) {
            // Fallback to any available if specific one not found
            saveBtn = document.querySelector('#update_oai_preset')
            || document.querySelector('#chat_completion_save_preset')
            || document.querySelector('#preset_save_button');
          }

          if (saveBtn) {
            saveBtn.click();
          } else {
            console.warn('[ST Multitool] Không tìm thấy nút Lưu ST, fallback saveSettingsDebounced.');
          }
        }

        (stContext?.saveSettingsDebounced || window.saveSettingsDebounced)?.();
      }, 1500);
    }

    clearPendingVarChanges();
    clearPendingBlockChanges();
    $('#st-multitool-save-prompt-btn').html('<i data-lucide="save"></i> Lưu Preset');
    refreshIcons(document.getElementById('st-multitool-save-prompt-btn'));
    if (typeof refreshVarInspector === 'function') refreshVarInspector();

    captureOriginalSnapshot();
    renderPromptBlocks();
    toastr.success('Đã lưu các thay đổi block Prompt vào ST.');
  } catch (err) {
    console.error('[ST Multitool] Lỗi savePromptBlocks:', err);
    toastr.error('Có lỗi xảy ra khi lưu Prompt AI.');
  }
}
