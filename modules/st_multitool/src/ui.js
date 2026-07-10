import { getAllLorebooks, getLorebookSettings } from './api.js';
import { escapeHtml } from './utils.js';
import { renderPresets } from './features/presets.js';
import { renderWorldBooks } from './features/worldbook.js';
import { populateModifyWorldbookSelect } from './features/entries.js';
import { populateTransferSelects } from './features/entries.js';
import { populateSyncWorldbooks } from './features/sync.js';
import { populateDuplicateSelect, populateRenameSelect, renderDeleteView } from './features/worldbook.js';
import { renderManageWorldbookList } from './features/manage-worldbook.js';
import { renderManageScriptLists } from './features/manage-scripts.js';
import { renderManageRegexLists } from './features/manage-regex.js';

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
    overlay: $('#st-multitool-popup-overlay'),
  };
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

  $('#st-multitool-header-title').text('ST Multitool - Menu chính');
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
  ].forEach(v => v && v.hide());

  let title = 'ST Multitool';
  if (viewId === 'st-multitool-select-view') {
    title = '✅ Chọn Sổ thế giới cần bật';
    renderWorldBooks();
  }
  if (viewId === 'st-multitool-modify-view') {
    title = '📝 Chỉnh sửa mục của Sổ thế giới';
    populateModifyWorldbookSelect();
  }
  if (viewId === 'st-multitool-transfer-view') {
    title = '🔄 Chuyển mục';
    populateTransferSelects();
  }
  if (viewId === 'st-multitool-sync-view') {
    title = '⚡ Đồng bộ Sổ thế giới';
    populateSyncWorldbooks();
  }
  if (viewId === 'st-multitool-duplicate-view') {
    title = '📑 Sao chép Sổ thế giới';
    populateDuplicateSelect();
  }
  if (viewId === 'st-multitool-rename-view') {
    title = '✏️ Đổi tên';
    populateRenameSelect();
  }
  if (viewId === 'st-multitool-delete-view') {
    title = '🗑️ Xóa Sổ thế giới và mục';
    renderDeleteView();
  }
  if (viewId === 'st-multitool-frontend-view') title = '💻 Trình đồng bộ frontend';
  if (viewId === 'st-multitool-script-sync-view') title = '💻 Trình đồng bộ script';
  if (viewId === 'st-multitool-create-regex-view') {
    title = '💻 Tạo script regex';
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#st-multitool-cr-import-character-btn').show();
    } else {
      $('#st-multitool-cr-import-character-btn').hide();
    }
  }
  if (viewId === 'st-multitool-create-script-view') {
    title = '💻 Tạo script Trợ lý Tavern';
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#st-multitool-cs-import-character-script-btn').show();
    } else {
      $('#st-multitool-cs-import-character-script-btn').hide();
    }
  }
  if (viewId === 'st-multitool-settings-view') title = '⚙️ Cài đặt tiện ích';
  if (viewId === 'st-multitool-manage-wb-view') {
    title = '📚 Quản lý Sổ thế giới';
    renderManageWorldbookList();
    $('#st-multitool-manage-wb-refresh-btn').show();
  } else {
    $('#st-multitool-manage-wb-refresh-btn').hide();
  }
  if (viewId === 'st-multitool-manage-script-view') {
    title = '🤖 Quản lý script Trợ lý Tavern';
    renderManageScriptLists();
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
    title = '📋 Quản lý script regex';
    renderManageRegexLists();
    $('#st-multitool-manage-regex-refresh-btn').show();
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#st-multitool-manage-regex-character-list').closest('.st-multitool-manage-script-card').show();
    } else {
      $('#st-multitool-manage-regex-character-list').closest('.st-multitool-manage-script-card').hide();
    }
  } else {
    $('#st-multitool-manage-regex-refresh-btn').hide();
  }

  $('#st-multitool-header-title').text(title);
  $('#st-multitool-popup-back-btn').show();
  $(`#${viewId}`).show();
  localStorage.setItem(STORAGE_KEY_LAST_VIEW, viewId);
  setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 100);
}

$(document).on('input', '.st-multitool-search-input', function() {
    const targetId = $(this).data('target');
    const searchTerm = $(this).val().toLowerCase();
    const $target = $(`#${targetId}`);
    
    if ($target.is('select')) {
        $target.find('option').each(function() {
            if ($(this).val() === '') return; // Skip placeholder
            const text = $(this).text().toLowerCase();
            if (text.includes(searchTerm)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    } else {
        $target.children().each(function() {
            const text = $(this).text().toLowerCase();
            if (text.includes(searchTerm)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }
});
