import { escapeHtml, refreshIcons } from '../utils.js';
import { showLoader, hideLoader, showSubView } from '../ui.js';
import { getPendingVarChanges, clearPendingVarChanges, applyVarChangesToContent, refreshVarInspector } from './var-inspector.js';

let $promptListContainer;
let $saveBtn;

// ─── Pending Add / Delete (chỉ áp dụng khi bấm Lưu) ────────────────────────
let _pendingAdds = [];           // [{ block, addToLinked, insertTop }]
let _pendingDeletes = new Set(); // Set<identifier string>
let _originalSnapshot = null;

function clearPendingBlockChanges() {
  _pendingAdds = [];
  _pendingDeletes.clear();
}

function captureOriginalSnapshot() {
  const container = getPromptContainer();
  if (container && Array.isArray(container.prompts)) {
    _originalSnapshot = {
      prompts: JSON.parse(JSON.stringify(container.prompts)),
      prompt_order: container.prompt_order ? JSON.parse(JSON.stringify(container.prompt_order)) : null
    };
  }
}

function restoreOriginalSnapshot() {
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

/**
 * Tạo block mới (pending) — chưa ghi vào ST context.
 * Cấu trúc khớp với preset JSON thực của SillyTavern.
 */
export function addPromptBlock(blockData = {}, addToLinked = false, insertTop = false) {
  const identifier = 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const newBlock = {
    identifier,
    id: identifier,           // ST yêu cầu id === identifier
    name: blockData.name || 'New Block',
    content: blockData.content || '',
    enabled: blockData.enabled !== undefined ? blockData.enabled : true,
    role: blockData.role || 'system',
    system_prompt: blockData.system_prompt ?? false,
    marker: blockData.marker ?? false,
    forbid_overrides: blockData.forbid_overrides ?? false,
    injection_position: blockData.injection_position ?? 0,
    injection_depth: blockData.injection_depth ?? 4,
    injection_order: blockData.injection_order ?? 100,
  };

  _pendingAdds.push({ block: newBlock, addToLinked, insertTop });
  renderPromptBlocks();
  refreshIcons($promptListContainer[0]);
  return newBlock;
}

/**
 * Toggle xóa block (pending) — chưa ghi vào ST context.
 * Nếu là pending add thì hủy luôn. Nếu là block thật thì toggle mark xóa.
 */
export function deletePromptBlock(identifier) {
  const addIdx = _pendingAdds.findIndex(p => p.block.identifier === identifier);
  if (addIdx !== -1) {
    _pendingAdds.splice(addIdx, 1);
    renderPromptBlocks();
    refreshIcons($promptListContainer[0]);
    return;
  }

  // Toggle pending delete visual
  if (_pendingDeletes.has(identifier)) {
    _pendingDeletes.delete(identifier);
    _applyDeleteVisual(identifier, false);
  } else {
    _pendingDeletes.add(identifier);
    _applyDeleteVisual(identifier, true);
  }
}

function _applyDeleteVisual(identifier, isDeleting) {
  const $item = $promptListContainer.find(`[data-id="${identifier}"]`);
  if (!$item.length) return;
  if (isDeleting) {
    $item.css({ opacity: 0.4, outline: '1px solid rgba(248,113,113,0.4)' });
    $item.find('.st-multitool-item-title-text').css({ textDecoration: 'line-through', color: '#f87171' });
    if (!$item.find('.st-multitool-delete-badge').length) {
      $item.find('.st-multitool-wb-item-title').append('<span class="st-multitool-delete-badge" style="font-size:10px;background:rgba(248,113,113,0.2);color:#f87171;border:1px solid rgba(248,113,113,0.3);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle;">Đánh dấu xóa</span>');
    }
    $item.find('.st-multitool-delete-prompt-btn').attr('title', 'Hoàn tác xóa').css({ color: '#facc15', opacity: 1 });
  } else {
    $item.css({ opacity: '', outline: '' });
    $item.find('.st-multitool-item-title-text').css({ textDecoration: '', color: '' });
    $item.find('.st-multitool-delete-badge').remove();
    $item.find('.st-multitool-delete-prompt-btn').attr('title', 'Xóa block này').css({ color: '', opacity: '' });
  }
}

export function initManagePrompt() {
  $promptListContainer = $('#st-multitool-prompt-list-container');
  $saveBtn = $('#st-multitool-save-prompt-btn');

  $('#st-multitool-manage-prompt-btn').on('click', () => {
    showSubView('st-multitool-manage-prompt-view');
    showLoader();
    setTimeout(() => {
      try {
        clearPendingBlockChanges();
        clearPendingVarChanges();
        if ($saveBtn && $saveBtn.length) {
          $saveBtn.html('<i data-lucide="save"></i> Lưu Preset');
        }
        captureOriginalSnapshot();
        renderPromptBlocks();
        $('#st-multitool-prompt-search').val('').trigger('input');
        refreshIcons(document.getElementById('st-multitool-manage-prompt-view'));
      } finally {
        hideLoader();
      }
    }, 50);
  });

  $('#st-multitool-ai-agency-toggle-btn').on('click', () => {
    window._stMultitoolAgency?.toggle();
  });


  // ── Add Block Modal ──────────────────────────────────────────────────
  $('#st-multitool-add-prompt-btn').on('click', () => {
    $('#st-multitool-new-prompt-name').val('');
    $('#st-multitool-new-prompt-content').val('');
    $('#st-multitool-new-prompt-role').val('system');
    $('#st-multitool-add-prompt-modal').slideDown(200);
    setTimeout(() => $('#st-multitool-new-prompt-name').focus(), 210);
  });

  $('#st-multitool-new-prompt-cancel-btn').on('click', () => {
    $('#st-multitool-add-prompt-modal').slideUp(200);
  });

  const doAddBlock = (addToLinked) => {
    const name = $('#st-multitool-new-prompt-name').val().trim();
    if (!name) { toastr.warning('Vui lòng nhập tên block!'); return; }
    const insertTop = $('#st-multitool-new-prompt-insert-pos').val() === 'top';
    addPromptBlock({
      name,
      role: $('#st-multitool-new-prompt-role').val(),
      content: $('#st-multitool-new-prompt-content').val(),
    }, addToLinked, insertTop);
    $('#st-multitool-add-prompt-modal').slideUp(200);
  };

  $('#st-multitool-new-prompt-linked-btn').on('click', () => doAddBlock(true));
  $('#st-multitool-new-prompt-unlinked-btn').on('click', () => doAddBlock(false));

  // ── Delete Block (event delegation) ─────────────────────────────────
  $promptListContainer.on('click', '.st-multitool-delete-prompt-btn', function(e) {
    e.stopPropagation();
    const identifier = $(this).closest('.st-multitool-wb-item').attr('data-id');
    deletePromptBlock(identifier);
  });

  // ── Save ─────────────────────────────────────────────────────────────
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

  // ── Undo (hoàn tác add/delete chưa lưu) ─────────────────────────────
  $('#st-multitool-reset-prompt-btn').on('click', () => {
    showLoader();
    setTimeout(() => {
      try {
        restoreOriginalSnapshot();
        clearPendingBlockChanges();
        clearPendingVarChanges();
        if ($saveBtn && $saveBtn.length) {
          $saveBtn.html('<i data-lucide="save"></i> Lưu Preset');
          refreshIcons($saveBtn[0]);
        }
        renderPromptBlocks();
        if (typeof refreshVarInspector === 'function') refreshVarInspector();
        $('#st-multitool-prompt-search').val('').trigger('input');
        toastr.info('Đã hoàn tác các thay đổi chưa lưu.');
      } finally {
        hideLoader();
      }
    }, 50);
  });

  // ── Auto-save preset toggle ──────────────────────────────────────────
  const autoSaveToggle = $('#st-multitool-auto-save-preset-toggle');
  if (autoSaveToggle.length) {
    const saved = localStorage.getItem('st-multitool-auto-save-preset');
    autoSaveToggle.prop('checked', saved === null ? true : saved === 'true');
    autoSaveToggle.on('change', function() {
      localStorage.setItem('st-multitool-auto-save-preset', String($(this).prop('checked')));
    });
  }

  // ── Search / Highlight ───────────────────────────────────────────────
  const performSearch = () => {
    const searchTerm = $('#st-multitool-prompt-search').val().trim().toLowerCase();
    const enableHighlight = $('#st-multitool-prompt-search-highlight-toggle').is(':checked');

    // Tắt kéo thả khi đang tìm kiếm để tránh lỗi thứ tự
    const $sortableLists = $promptListContainer.find('.st-multitool-prompt-sortable-list');
    if (typeof $sortableLists.sortable === 'function') {
      $sortableLists.sortable(searchTerm === '' ? 'enable' : 'disable');
    }

    if (searchTerm === '') {
      if (!$promptListContainer.data('is-filtered')) return;
      const items = $promptListContainer[0].getElementsByClassName('st-multitool-wb-item');
      for (let i = 0; i < items.length; i++) items[i].style.display = 'block';
      if ($promptListContainer.data('is-highlighted')) {
        $promptListContainer.find('.st-multitool-wb-item').each(function() {
          const $item = $(this);
          const origTitle = $item.attr('data-orig-title');
          if (origTitle != null) $item.find('.st-multitool-item-title-text').text(origTitle);
          const $textarea = $item.find('.st-multitool-prompt-content');
          let content = $textarea.val();
          if (content && content.endsWith('\n')) content += ' ';
          $item.find('.st-multitool-highlight-backdrop').text(content);
        });
        $promptListContainer.data('is-highlighted', false);
      }
      $promptListContainer.data('is-filtered', false);
      return;
    }

    $promptListContainer.data('is-filtered', true);
    if (enableHighlight) $promptListContainer.data('is-highlighted', true);

    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const highlightRegex = enableHighlight ? new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi') : null;

    const safeHighlight = (text, transparent = true) => {
      if (!text) return '';
      if (!highlightRegex) return escapeHtml(text);
      return text.split(highlightRegex).map((part, i) => {
        if (i % 2 === 1) {
          const colorStyle = transparent ? 'color: transparent;' : 'color: inherit;';
          return `<mark style="background-color: rgba(255, 255, 0, 0.35); ${colorStyle} border-radius: 2px;">${escapeHtml(part)}</mark>`;
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
      if (content.endsWith('\n')) content += ' ';

      const isMatch = origTitle.toLowerCase().includes(searchTerm)
        || origDesc.toLowerCase().includes(searchTerm)
        || content.toLowerCase().includes(searchTerm);

      $item.css('display', isMatch ? 'block' : 'none');

      if (isMatch && enableHighlight) {
        $titleSpan.html(origTitle.toLowerCase().includes(searchTerm)
          ? safeHighlight(origTitle, false) : escapeHtml(origTitle));
        const $backdrop = $item.find('.st-multitool-highlight-backdrop');
        $backdrop.html(content.toLowerCase().includes(searchTerm)
          ? safeHighlight(content, true) : escapeHtml(content));
      }
    });
  };

  $('#st-multitool-prompt-search-btn').on('click', performSearch);
  $('#st-multitool-prompt-search').on('input', function() {
    $('#st-multitool-prompt-search-clear').css('display', $(this).val().length > 0 ? 'block' : 'none');
  }).on('keypress', function(e) {
    if (e.which === 13) performSearch();
  });
  $('#st-multitool-prompt-search-clear').on('click', function() {
    $('#st-multitool-prompt-search').val('').trigger('input');
    performSearch();
  });

  const highlightToggle = $('#st-multitool-prompt-search-highlight-toggle');
  const isHighlightEnabled = localStorage.getItem('st-multitool-prompt-search-highlight');
  highlightToggle.prop('checked', isHighlightEnabled === 'true');
  highlightToggle.on('change', function() {
    localStorage.setItem('st-multitool-prompt-search-highlight', String($(this).prop('checked')));
    performSearch();
  });
}

// ─── Get ST prompt container ──────────────────────────────────────────────────
function getPromptContainer() {
  if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
    const ctx = window.SillyTavern.getContext();
    if (ctx?.chatCompletionSettings && Array.isArray(ctx.chatCompletionSettings.prompts))
      return ctx.chatCompletionSettings;
    if (ctx?.power_user?.instruct && Array.isArray(ctx.power_user.instruct.prompts))
      return ctx.power_user.instruct;
    if (ctx?.powerUserSettings?.instruct && Array.isArray(ctx.powerUserSettings.instruct.prompts))
      return ctx.powerUserSettings.instruct;
  }
  if (window.power_user?.instruct && Array.isArray(window.power_user.instruct.prompts))
    return window.power_user.instruct;
  if (window.chatCompletionSettings && Array.isArray(window.chatCompletionSettings.prompts))
    return window.chatCompletionSettings;
  for (const key in window) {
    try {
      if (window[key]?.instruct && Array.isArray(window[key].instruct.prompts)) return window[key].instruct;
      if (window[key] && Array.isArray(window[key].prompts) && window[key].prompts[0]
          && typeof window[key].prompts[0].system_prompt !== 'undefined') return window[key];
    } catch(e) {}
  }
  return null;
}

// ─── Render ───────────────────────────────────────────────────────────────────
export function renderPromptBlocks() {
  $promptListContainer.empty();

  const container = getPromptContainer();
  if (!container || !Array.isArray(container.prompts)) {
    let debugInfo = 'N/A';
    try {
      const ctx = window.SillyTavern ? window.SillyTavern.getContext() : {};
      debugInfo = Object.keys(ctx).join(', ');
    } catch (e) { debugInfo = e.message; }
    $promptListContainer.html(`<p style="color:#f28b82; text-align:center;">Không tìm thấy cấu trúc Prompt AI trong hệ thống SillyTavern.</p><p style="color:#aaa; font-size:12px; word-break:break-all;">Debug Context Keys: ${debugInfo}</p>`);
    return;
  }

  const prompts = container.prompts;

  // Parse prompt_order thành mảng identifier strings
  const rawOrder = container.prompt_order || [];
  let promptOrder = [];
  if (Array.isArray(rawOrder) && rawOrder.length > 0) {
    if (typeof rawOrder[0] === 'object' && Array.isArray(rawOrder[0].order)) {
      // ST 1.18+ format: [{ character_id, order: [{identifier, enabled}] }]
      promptOrder = (rawOrder[0].order || []).map(item => item.identifier).filter(Boolean);
    } else {
      promptOrder = rawOrder.map(item => (typeof item === 'string' ? item : item.identifier)).filter(Boolean);
    }
  }

  const orderSet = new Set(promptOrder);

  let activeHtml = '';
  let inactiveHtml = '';

  const renderBlock = (block, idx, isPendingDelete = false, isPendingAdd = false) => {
    const pendingStyle = isPendingDelete
      ? 'opacity:0.4; outline:1px solid rgba(248,113,113,0.35); border-radius:8px;'
      : isPendingAdd
        ? 'outline:1.5px solid rgba(52,211,153,0.5); border-radius:8px;'
        : '';
    const pendingBadge = isPendingDelete
      ? `<span class="st-multitool-delete-badge" style="font-size:10px;background:rgba(248,113,113,0.2);color:#f87171;border:1px solid rgba(248,113,113,0.3);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle;">Đánh dấu xóa</span>`
      : isPendingAdd
        ? `<span class="st-multitool-delete-badge" style="font-size:10px;background:rgba(52,211,153,0.15);color:#34d399;border:1px solid rgba(52,211,153,0.3);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle;">Chưa lưu</span>`
        : '';
    const titleStyle    = isPendingDelete ? 'text-decoration:line-through;color:#f87171;' : '';
    const deleteTitle   = isPendingDelete ? 'Hoàn tác xóa' : 'Xóa block này';
    const deleteColor   = isPendingDelete ? '#facc15' : 'var(--st-multitool-danger)';
    const deleteOpacity = isPendingDelete ? '1' : '0.45';
    return `
      <div class="st-multitool-wb-item" data-idx="${idx}" data-id="${escapeHtml(block.identifier || '')}" style="${pendingStyle}">
        <div class="st-multitool-wb-item-header st-multitool-accordion-header" style="cursor: pointer; user-select: none;">
          <div class="st-multitool-wb-item-title-col">
            <span class="st-multitool-drag-handle" style="cursor: grab; color: #888; margin-right: 8px;" title="Kéo thả để sắp xếp">
              <i data-lucide="grip-vertical" style="width: 16px; height: 16px;"></i>
            </span>
            <span class="st-multitool-wb-item-title" style="font-weight: 600;"><span class="st-multitool-item-title-text" style="${titleStyle}">${escapeHtml(block.name || 'Unnamed Block')}</span>${pendingBadge}</span>
            <span class="st-multitool-wb-item-desc">Role: ${escapeHtml(block.role || '')} | Depth: ${block.injection_depth ?? '-'} | ID: ${escapeHtml(block.identifier || '')}</span>
          </div>
          <div class="st-multitool-wb-item-controls">
            <label class="st-multitool-toggle-switch" style="margin-right: 10px;" title="Bật/Tắt khối Prompt này">
              <input type="checkbox" class="st-multitool-prompt-enabled" ${block.enabled ? 'checked' : ''}>
              <span class="st-multitool-toggle-slider"></span>
            </label>
            <button class="st-multitool-delete-prompt-btn" title="${deleteTitle}" style="background:none; border:none; color: ${deleteColor}; cursor:pointer; padding:3px 5px; border-radius:4px; opacity:${deleteOpacity}; transition:opacity 0.2s, background 0.2s; margin-right:4px; flex-shrink:0;" onmouseenter="this.style.opacity='1';this.style.background='rgba(255,92,92,0.12)'" onmouseleave="this.style.opacity='${deleteOpacity}';this.style.background='none'">
              <i data-lucide="trash-2" style="width:13px; height:13px; pointer-events:none;"></i>
            </button>
            <i data-lucide="chevron-down" class="st-multitool-accordion-icon" style="color: #888; transition: transform 0.2s; width: 16px; height: 16px;"></i>
          </div>
        </div>

        <div class="st-multitool-accordion-body" style="display: none; padding-top: 10px;">
          <div class="st-multitool-prompt-advanced-settings" style="padding: 14px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--st-multitool-border);">

            <!-- Row 1: Name / Role / Triggers -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:var(--st-multitool-text); margin-bottom:5px;">Name</label>
                <input type="text" class="st-multitool-input st-prompt-name" value="${escapeHtml(block.name || 'Unnamed Block')}" style="width:100%; font-size:13px;">
                <div style="font-size:11px; color:var(--st-multitool-text-muted); margin-top:4px;">A name for this prompt.</div>
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:var(--st-multitool-text); margin-bottom:5px;">Role</label>
                <select class="st-multitool-input st-prompt-role" style="width:100%; font-size:13px; background:rgba(20,24,32,0.8); color:#fff; cursor:pointer;">
                  <option value="system"    ${block.role === 'system'    ? 'selected' : ''}>System</option>
                  <option value="user"      ${block.role === 'user'      ? 'selected' : ''}>User</option>
                  <option value="assistant" ${block.role === 'assistant' ? 'selected' : ''}>AI Assistant</option>
                </select>
                <div style="font-size:11px; color:var(--st-multitool-text-muted); margin-top:4px;">To whom this message will be attributed.</div>
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:var(--st-multitool-text); margin-bottom:5px;">Triggers</label>
                <input type="text" class="st-multitool-input" placeholder="All types (default)" style="width:100%; font-size:13px;" disabled title="Triggers chưa được hỗ trợ">
                <div style="font-size:11px; color:var(--st-multitool-text-muted); margin-top:4px;">Filter to specific generation types.</div>
              </div>
            </div>

            <!-- Row 2: Position + conditional Depth + Order -->
            <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; align-items:flex-start;">
              <div style="min-width:180px; flex:0 0 auto;">
                <label style="display:block; font-size:12px; font-weight:600; color:var(--st-multitool-text); margin-bottom:5px;">Position</label>
                <select class="st-multitool-input st-prompt-pos-select" style="width:100%; font-size:13px; background:rgba(20,24,32,0.8); color:#fff; cursor:pointer;">
                  <option value="0" ${(block.injection_position == null || block.injection_position == 0) ? 'selected' : ''}>Relative</option>
                  <option value="1" ${block.injection_position == 1 ? 'selected' : ''}>In-chat</option>
                </select>
                <div class="st-prompt-pos-hint" style="font-size:11px; color:var(--st-multitool-text-muted); margin-top:4px;">
                  ${block.injection_position == 1 ? 'Inserted at a specific <b style="color:#aaa">Depth</b> within the chat history.' : 'Relative (to other prompts in prompt manager) or In-chat @ Depth.'}
                </div>
              </div>
              <div class="st-prompt-depth-wrap" style="min-width:130px; flex:0 0 auto; display:${block.injection_position == 1 ? 'block' : 'none'};">
                <label style="display:block; font-size:12px; font-weight:600; color:var(--st-multitool-text); margin-bottom:5px;">Depth</label>
                <input type="number" class="st-multitool-input st-prompt-depth" value="${block.injection_depth ?? 4}" min="0" style="width:100%; font-size:13px;">
                <div style="font-size:11px; color:var(--st-multitool-text-muted); margin-top:4px;">0 = after last message, 1 = before last, etc.</div>
              </div>
              <div class="st-prompt-order-wrap" style="min-width:130px; flex:0 0 auto; display:${block.injection_position == 1 ? 'block' : 'none'};">
                <label style="display:block; font-size:12px; font-weight:600; color:var(--st-multitool-text); margin-bottom:5px;">Order</label>
                <input type="number" class="st-multitool-input st-prompt-order" value="${block.injection_order ?? 100}" style="width:100%; font-size:13px;">
                <div style="font-size:11px; color:var(--st-multitool-text-muted); margin-top:4px;">Ordered low/top → high/bottom.</div>
              </div>
              <!-- Hidden to preserve pos value for save logic -->
              <input type="hidden" class="st-prompt-pos" value="${block.injection_position || 0}">
            </div>

            <!-- Row 3: Boolean flags -->
            <div style="display:flex; gap:20px; flex-wrap:wrap; padding-top:10px; border-top:1px solid var(--st-multitool-border);">
              <label class="st-multitool-checkbox-label" style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                <input type="checkbox" class="st-prompt-sys" ${block.system_prompt ? 'checked' : ''}> System Prompt
              </label>
              <label class="st-multitool-checkbox-label" style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                <input type="checkbox" class="st-prompt-marker" ${block.marker ? 'checked' : ''}> Marker
              </label>
              <label class="st-multitool-checkbox-label" style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
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

  // Pending adds (linked) — đầu danh sách
  _pendingAdds.filter(p => p.addToLinked && p.insertTop).forEach(p => {
    activeHtml += renderBlock(p.block, -1, false, true);
  });

  // Linked prompts theo thứ tự prompt_order
  promptOrder.forEach(id => {
    if (_pendingDeletes.has(id)) {
      // Hiển thị với dấu xóa
      const idx = prompts.findIndex(p => p.identifier === id);
      if (idx !== -1) activeHtml += renderBlock(prompts[idx], idx, true);
      return;
    }
    const idx = prompts.findIndex(p => p.identifier === id);
    if (idx !== -1) activeHtml += renderBlock(prompts[idx], idx);
  });

  // Pending adds (linked) — cuối danh sách
  _pendingAdds.filter(p => p.addToLinked && !p.insertTop).forEach(p => {
    activeHtml += renderBlock(p.block, -1, false, true);
  });

  // Pending adds (unlinked) — đầu
  _pendingAdds.filter(p => !p.addToLinked && p.insertTop).forEach(p => {
    inactiveHtml += renderBlock(p.block, -1, false, true);
  });

  // Unlinked prompts (không có trong prompt_order)
  prompts.forEach((block, idx) => {
    if (orderSet.has(block.identifier)) return;
    inactiveHtml += renderBlock(block, idx, _pendingDeletes.has(block.identifier));
  });

  // Pending adds (unlinked) — cuối
  _pendingAdds.filter(p => !p.addToLinked && !p.insertTop).forEach(p => {
    inactiveHtml += renderBlock(p.block, -1, false, true);
  });

  $promptListContainer.html(`
    <h5 style="margin: 0 0 10px 0; color: #34d399; font-size: 0.95em; flex-shrink: 0; display: flex; align-items: center; gap: 6px;"><i data-lucide="link" style="width: 16px; height: 16px;"></i> Linked Prompts (In Order)</h5>
    <div id="st-multitool-prompt-list-active" class="st-multitool-prompt-sortable-list" style="flex-shrink: 0; min-height: 50px; border: 1px dashed rgba(52, 211, 153, 0.2); border-radius: 8px; padding: 10px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; background: rgba(0,0,0,0.15);">
      ${activeHtml}
    </div>
    <h5 style="margin: 0 0 10px 0; color: #aaa; font-size: 0.95em; flex-shrink: 0; display: flex; align-items: center; gap: 6px;"><i data-lucide="unlink" style="width: 16px; height: 16px;"></i> Unlinked Prompts</h5>
    <div id="st-multitool-prompt-list-inactive" class="st-multitool-prompt-sortable-list" style="flex-shrink: 0; min-height: 50px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 10px; background: rgba(0,0,0,0.15);">
      ${inactiveHtml}
    </div>
  `);

  refreshIcons($promptListContainer[0]);

  // Accordion
  $promptListContainer.find('.st-multitool-accordion-header').on('click', function(e) {
    if ($(e.target).closest('.st-multitool-toggle-switch').length
      || $(e.target).closest('.st-multitool-drag-handle').length
      || $(e.target).closest('.st-multitool-delete-prompt-btn').length) return;
    const $body = $(this).next('.st-multitool-accordion-body');
    const $icon = $(this).find('.st-multitool-accordion-icon');
    $body.slideToggle(200);
    $icon.css('transform', $body.is(':visible') ? 'rotate(180deg)' : 'rotate(0deg)');
  });

  // Position dropdown: hiện/ẩn Depth + Order
  $promptListContainer.on('change', '.st-prompt-pos-select', function() {
    const val = $(this).val();
    const $settings = $(this).closest('.st-multitool-prompt-advanced-settings');
    $settings.find('.st-prompt-pos').val(val);
    $settings.find('.st-prompt-depth-wrap, .st-prompt-order-wrap').toggle(val === '1');
    $settings.find('.st-prompt-pos-hint').html(val === '1'
      ? 'Inserted at a specific <b style="color:#aaa">Depth</b> within the chat history.'
      : 'Relative (to other prompts in prompt manager) or In-chat @ Depth.');
  });

  // Backdrop highlight sync
  const updateBackdrop = ($textarea) => {
    let content = $textarea.val();
    if (content.endsWith('\n')) content += ' ';
    const $backdrop = $textarea.siblings('.st-multitool-highlight-backdrop');
    const searchTerm = $('#st-multitool-prompt-search').val().trim().toLowerCase();
    const enableHighlight = $('#st-multitool-prompt-search-highlight-toggle').is(':checked');
    if (searchTerm && enableHighlight && content.toLowerCase().includes(searchTerm)) {
      const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
      $backdrop.html(content.split(regex).map((part, i) =>
        i % 2 === 1
          ? `<mark style="background-color: rgba(255, 255, 0, 0.35); color: transparent; border-radius: 2px;">${escapeHtml(part)}</mark>`
          : escapeHtml(part)
      ).join(''));
    } else {
      $backdrop.text(content);
    }
    $backdrop.scrollTop($textarea.scrollTop());
  };

  $promptListContainer.find('.st-multitool-prompt-content')
    .on('scroll', function() {
      $(this).siblings('.st-multitool-highlight-backdrop').scrollTop($(this).scrollTop());
    })
    .on('input', function() {
      const $el = $(this);
      if ($el.data('raf-id')) cancelAnimationFrame($el.data('raf-id'));
      $el.data('raf-id', requestAnimationFrame(() => updateBackdrop($el)));
    })
    .each(function() { updateBackdrop($(this)); });

  // Sync tên block lên header khi người dùng sửa
  $promptListContainer.find('.st-prompt-name').on('input', function() {
    const newName = $(this).val() || 'Unnamed Block';
    const $item = $(this).closest('.st-multitool-wb-item');
    $item.find('.st-multitool-item-title-text').text(newName);
    $item.attr('data-orig-title', newName);
  });

  // Sortable drag-drop (connected lists)
  if (typeof $promptListContainer.sortable === 'function') {
    $promptListContainer.find('.st-multitool-prompt-sortable-list').sortable({
      connectWith: '.st-multitool-prompt-sortable-list',
      handle: '.st-multitool-drag-handle',
    });
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────
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

    // Build map từ prompt_order cũ để bảo toàn các metadata (enabled, v.v.)
    const oldOrderMap = new Map();
    if (Array.isArray(container.prompt_order)) {
      const flatOrder = (typeof container.prompt_order[0] === 'object' && Array.isArray(container.prompt_order[0]?.order))
        ? container.prompt_order[0].order
        : container.prompt_order;
      flatOrder.forEach(item => {
        if (!item) return;
        const id = typeof item === 'string' ? item : item.identifier;
        if (id) oldOrderMap.set(id, item);
      });
    }

    const processItem = ($item, isActiveList) => {
      const identifier = $item.attr('data-id');
      if (!identifier || _pendingDeletes.has(identifier)) return;

      // Tìm block data: ưu tiên container.prompts, rồi mới _pendingAdds
      const originalBlock = originalPrompts.find(p => String(p.identifier) === String(identifier))
        || (_pendingAdds.find(p => p.block.identifier === identifier) || {}).block
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
        // Giữ lại object cũ nếu có, hoặc tạo mới với enabled từ block
        const oldEntry = oldOrderMap.get(newBlock.identifier);
        newPromptOrder.push(oldEntry
          ? { ...oldEntry, enabled: newBlock.enabled }
          : { identifier: newBlock.identifier, enabled: newBlock.enabled }
        );
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
      stContext?.eventSource?.emit?.('oai_preset_changed_after');

      setTimeout(() => {
        const autoSave = $('#st-multitool-auto-save-preset-toggle');
        const shouldAutoSave = autoSave.length ? autoSave.prop('checked') : true;

        if (shouldAutoSave) {
          const saveBtn = document.querySelector('#update_oai_preset')
            || document.querySelector('#chat_completion_save_preset')
            || document.querySelector('#preset_save_button');
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
