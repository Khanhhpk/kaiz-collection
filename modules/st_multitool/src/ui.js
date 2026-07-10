import { getAllLorebooks, getLorebookSettings } from './api.js';
import { escapeHtml } from './utils.js';
import { renderPresets } from './features/presets.js';
import { renderWorldBooks } from './features/worldbook.js';
import { populateModifyWorldbookSelect } from './features/entries.js';
import { populateTransferSelects } from './features/entries.js';
import { populateSyncWorldbooks } from './features/sync.js';
import { populateDuplicateSelect, populateRenameSelect, renderDeleteView } from './features/worldbook.js';
import { renderManageWorldbookList, restoreWbCardStates } from './features/manage-worldbook.js';
import { renderManageScriptLists, restoreScriptCardStates } from './features/manage-scripts.js';
import { renderManageRegexLists, restoreRegexCardStates } from './features/manage-regex.js';

export const STORAGE_KEY_LAST_VIEW = 'st-multitool-last-view';

export let elements = {};

export function initUIElements() {
  elements = {
    loader: $('#st-multitool-loader'),
    mainView: $('#st-multitool-main-view'),
    selectView: $('#st-multitool-select-view'),
    modifyView: $('#st-multitool-modify-view'),
    deleteView: $('#st-multitool-delete-view'),
    transferView: $('#st-multitool-transfer-view'),
    syncView: $('#st-multitool-sync-view'),
    duplicateView: $('#st-multitool-duplicate-view'),
    renameView: $('#st-multitool-rename-view'),
    frontendView: $('#st-multitool-frontend-view'),
    scriptSyncView: $('#st-multitool-script-sync-view'),
    createRegexView: $('#st-multitool-create-regex-view'),
    createScriptView: $('#st-multitool-create-script-view'),
    settingsView: $('#st-multitool-settings-view'),
    manageWbView: $('#st-multitool-manage-wb-view'),
    manageScriptView: $('#st-multitool-manage-script-view'),
    manageRegexView: $('#st-multitool-manage-regex-view'),
    managePromptView: $('#st-multitool-manage-prompt-view'),
    overlay: $('#st-multitool-popup-overlay'),
  };

  $('#st-multitool-popup').off('click touchend', '.st-multitool-nav-tab').on('click touchend', '.st-multitool-nav-tab', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $('.st-multitool-nav-tab').removeClass('active');
    $(this).addClass('active');
    const filter = $(this).data('filter');
    if (filter === 'all') {
      $('.st-multitool-dash-card').css('display', 'flex').hide().fadeIn(180);
    } else {
      $('.st-multitool-dash-card').hide();
      $(`.st-multitool-dash-card[data-category="${filter}"]`).css('display', 'flex').hide().fadeIn(180);
    }
  });
}

export function showLoader() {
  if (elements.loader) elements.loader.show();
}

export function hideLoader() {
  if (elements.loader) elements.loader.hide();
}

export function closePopup() {
  if (elements.overlay) elements.overlay.hide();
}

export function showPopup() {
  if (elements.overlay) elements.overlay.css('display', 'flex');
  const lastView = localStorage.getItem(STORAGE_KEY_LAST_VIEW);
  if (lastView && lastView !== 'st-multitool-main-view') {
    showSubView(lastView);
  } else {
    showMainView();
  }
}

export function showMainView() {
  elements.mainView.show();
  [
    elements.selectView,
    elements.modifyView,
    elements.deleteView,
    elements.transferView,
    elements.syncView,
    elements.duplicateView,
    elements.renameView,
    elements.frontendView,
    elements.createRegexView,
    elements.createScriptView,
    elements.scriptSyncView,
    elements.settingsView,
    elements.manageWbView,
    elements.manageScriptView,
    elements.manageRegexView,
  ].forEach(v => v && v.hide());
  
  $('#st-multitool-preset-list-container').hide();
  renderPresets(false);

  // Reset Dashboard V2 tabs & card visibility
  $('.st-multitool-nav-tab').removeClass('active');
  $('.st-multitool-nav-tab[data-filter="all"]').addClass('active');
  $('.st-multitool-dash-card').css('display', 'flex');

  $('#st-multitool-header-title').html('<i data-lucide="layout-dashboard" style="margin-right: 8px; vertical-align: -2px;"></i> ST Multitool - Menu chính');
  $('#st-multitool-popup-back-btn').hide();
  localStorage.setItem(STORAGE_KEY_LAST_VIEW, "st-multitool-main-view");
  setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 100);

  const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
  if (isCharacterSelected) {
    $('#st-multitool-main-import-script-character-btn').show();
    $('#st-multitool-main-import-regex-character-btn').show();
  } else {
    $('#st-multitool-main-import-script-character-btn').hide();
    $('#st-multitool-main-import-regex-character-btn').hide();
  }
}

export async function showSubView(viewId) {
  elements.mainView.hide();
  [
    elements.selectView,
    elements.modifyView,
    elements.deleteView,
    elements.transferView,
    elements.syncView,
    elements.duplicateView,
    elements.renameView,
    elements.frontendView,
    elements.createRegexView,
    elements.createScriptView,
    elements.scriptSyncView,
    elements.settingsView,
    elements.manageWbView,
    elements.manageScriptView,
    elements.manageRegexView,
    elements.managePromptView,
  ].forEach(v => v && v.hide());

  let title = 'ST Multitool';
  if (viewId === 'st-multitool-select-view') {
    title = '<i data-lucide="check-square" style="margin-right: 8px; vertical-align: -2px;"></i> Chọn Sổ thế giới cần bật';
    renderWorldBooks();
  }
  if (viewId === 'st-multitool-modify-view') {
    title = '<i data-lucide="file-edit" style="margin-right: 8px; vertical-align: -2px;"></i> Chỉnh sửa mục của Sổ thế giới';
    populateModifyWorldbookSelect();
  }
  if (viewId === 'st-multitool-transfer-view') {
    title = '<i data-lucide="arrow-right-left" style="margin-right: 8px; vertical-align: -2px;"></i> Chuyển mục Sổ thế giới';
    populateTransferSelects();
  }
  if (viewId === 'st-multitool-sync-view') {
    title = '<i data-lucide="refresh-cw" style="margin-right: 8px; vertical-align: -2px;"></i> Đồng bộ Sổ thế giới';
    populateSyncWorldbooks();
  }
  if (viewId === 'st-multitool-duplicate-view') {
    title = '<i data-lucide="copy" style="margin-right: 8px; vertical-align: -2px;"></i> Sao chép Sổ thế giới';
    populateDuplicateSelect();
  }
  if (viewId === 'st-multitool-rename-view') {
    title = '<i data-lucide="edit-2" style="margin-right: 8px; vertical-align: -2px;"></i> Đổi tên Sổ thế giới';
    populateRenameSelect();
  }
  if (viewId === 'st-multitool-delete-view') {
    title = '<i data-lucide="trash-2" style="margin-right: 8px; vertical-align: -2px;"></i> Xóa Sổ thế giới và mục';
    renderDeleteView();
  }
  if (viewId === 'st-multitool-frontend-view') title = '<i data-lucide="monitor" style="margin-right: 8px; vertical-align: -2px;"></i> Trình đồng bộ frontend';
  if (viewId === 'st-multitool-script-sync-view') title = '<i data-lucide="terminal" style="margin-right: 8px; vertical-align: -2px;"></i> Trình đồng bộ script';
  if (viewId === 'st-multitool-create-regex-view') {
    title = '<i data-lucide="file-plus-2" style="margin-right: 8px; vertical-align: -2px;"></i> Tạo script regex';
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#st-multitool-cr-import-character-btn').show();
    } else {
      $('#st-multitool-cr-import-character-btn').hide();
    }
  }
  if (viewId === 'st-multitool-create-script-view') {
    title = '<i data-lucide="file-code" style="margin-right: 8px; vertical-align: -2px;"></i> Tạo script Trợ lý Tavern';
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#st-multitool-cs-import-character-script-btn').show();
    } else {
      $('#st-multitool-cs-import-character-script-btn').hide();
    }
  }
  if (viewId === 'st-multitool-settings-view') title = '<i data-lucide="sliders" style="margin-right: 8px; vertical-align: -2px;"></i> Cài đặt tiện ích';
  if (viewId === 'st-multitool-manage-wb-view') {
    title = '<i data-lucide="library" style="margin-right: 8px; vertical-align: -2px;"></i> Quản lý Sổ thế giới';
    renderManageWorldbookList();
    restoreWbCardStates();
    $('#st-multitool-manage-wb-refresh-btn').show();
  } else {
    $('#st-multitool-manage-wb-refresh-btn').hide();
  }
  if (viewId === 'st-multitool-manage-script-view') {
    title = '<i data-lucide="cpu" style="margin-right: 8px; vertical-align: -2px;"></i> Quản lý script Trợ lý Tavern';
    renderManageScriptLists();
    restoreScriptCardStates();
    $('#st-multitool-manage-script-refresh-btn').show();
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#st-multitool-manage-script-character-list').closest('.st-multitool-manage-script-card').show();
    } else {
      $('#st-multitool-manage-script-character-list').closest('.st-multitool-manage-script-card').hide();
    }
  } else {
    $('#st-multitool-manage-script-refresh-btn').hide();
  }
  if (viewId === 'st-multitool-manage-regex-view') {
    title = '<i data-lucide="filter" style="margin-right: 8px; vertical-align: -2px;"></i> Quản lý script regex';
    renderManageRegexLists();
    restoreRegexCardStates();
    $('#st-multitool-manage-regex-refresh-btn').show();
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#st-multitool-manage-regex-character-list').closest('.st-multitool-manage-regex-card').show();
    } else {
      $('#st-multitool-manage-regex-character-list').closest('.st-multitool-manage-regex-card').hide();
    }
  } else {
    $('#st-multitool-manage-regex-refresh-btn').hide();
  }
  if (viewId === 'st-multitool-manage-prompt-view') {
    title = '<i data-lucide="bot" style="margin-right: 8px; vertical-align: -2px;"></i> Quản lý Prompt Preset';
  }

  $('#st-multitool-header-title').html(title);
  $('#st-multitool-popup-back-btn').show();
  $(`#${viewId}`).show();
  localStorage.setItem(STORAGE_KEY_LAST_VIEW, viewId);
  setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 100);
}

$(document).on('input', '.st-multitool-search-input', function() {
    const inputElem = this;
    const targetId = $(inputElem).data('target');
    const searchTerm = inputElem.value.toLowerCase().trim();
    
    if (inputElem._searchTimeout) clearTimeout(inputElem._searchTimeout);
    inputElem._searchTimeout = setTimeout(() => {
        const target = document.getElementById(targetId);
        if (!target) return;

        requestAnimationFrame(() => {
            if (target.tagName.toLowerCase() === 'select') {
                const options = target.options;
                const len = options.length;
                for (let i = 0; i < len; i++) {
                    const opt = options[i];
                    if (opt.value === '') continue; // Skip placeholder
                    const text = (opt.textContent || opt.innerText || '').toLowerCase();
                    const shouldShow = text.includes(searchTerm);
                    opt.style.display = shouldShow ? '' : 'none';
                    opt.hidden = !shouldShow;
                }
            } else {
                const children = target.children;
                const len = children.length;
                for (let i = 0; i < len; i++) {
                    const child = children[i];
                    const text = (child.textContent || child.innerText || '').toLowerCase();
                    child.style.display = text.includes(searchTerm) ? '' : 'none';
                }
            }
        });
    }, 120);
});

