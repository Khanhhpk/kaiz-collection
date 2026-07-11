import { escapeHtml } from '../utils.js';
import { isManageScriptCollapsed } from './settings.js';
import { getScriptTrees, updateScriptTreesWith } from '../api.js';

let $manageScriptGlobalList;
let $manageScriptPresetList;
let $manageScriptCharacterList;
let $manageScriptEditPanel;
let currentScripts = [];
let currentScriptId = '';
let currentScriptType = '';
let renderDebounceTimer = null;

export function initManageScripts() {
  $manageScriptGlobalList = $('#st-multitool-manage-script-global-list');
  $manageScriptPresetList = $('#st-multitool-manage-script-preset-list');
  $manageScriptCharacterList = $('#st-multitool-manage-script-character-list');
  $manageScriptEditPanel = $('#st-multitool-manage-script-edit-panel');

  $('#st-multitool-manage-script-refresh-btn').on('click', debouncedRender);
  $('#st-multitool-manage-script-save-btn').on('click', handleSaveScript);
  $('#st-multitool-manage-script-cancel-btn').on('click', hideScriptEditPanel);

  $('#st-multitool-manage-script-edit-panel .st-multitool-edit-panel-header').on('click', function(e) {
    if ($(e.target).closest('.st-multitool-card-header-actions').length) return;
    const $panel = $(this).closest('.st-multitool-edit-panel-collapsible');
    $panel.toggleClass('collapsed');
  });

  $('#st-multitool-manage-script-view').on('click', '.st-multitool-manage-script-card-header', function() {
    const targetId = $(this).data('target');
    if (targetId && targetId.startsWith('st-multitool-manage-script')) {
      const $card = $(this).closest('.st-multitool-manage-script-card');
      $card.toggleClass('collapsed');
      const isCollapsed = $card.hasClass('collapsed');
      localStorage.setItem(`st-multitool-script-card-${targetId}`, isCollapsed ? 'collapsed' : 'expanded');
    }
  });

  restoreScriptCardStates();

  $('#st-multitool-manage-script-view').on('click', '.st-multitool-manage-script-item', function(e) {
    if ($(e.target).hasClass('st-multitool-manage-script-enabled') || 
        $(e.target).closest('.st-multitool-manage-script-actions').length) {
      return;
    }
    const scriptId = $(this).data('script-id');
    const type = $(this).closest('.st-multitool-manage-script-card-content').attr('id').replace('st-multitool-manage-script-', '').replace('-list', '');
    openScriptEditPanel(scriptId, type);
  });

  $('#st-multitool-manage-script-view').on('change', '.st-multitool-manage-script-enabled', function(e) {
    e.stopPropagation();
    const scriptId = $(this).closest('.st-multitool-manage-script-item').data('script-id');
    const isEnabled = $(this).is(':checked');
    const type = $(this).closest('.st-multitool-manage-script-card-content').attr('id').replace('st-multitool-manage-script-', '').replace('-list', '');
    toggleScriptEnabled(scriptId, type, isEnabled);
  });

  $('#st-multitool-manage-script-view').on('click', '.st-multitool-manage-script-delete', function(e) {
    e.stopPropagation();
    const scriptId = $(this).closest('.st-multitool-manage-script-item').data('script-id');
    const type = $(this).closest('.st-multitool-manage-script-card-content').attr('id').replace('st-multitool-manage-script-', '').replace('-list', '');
    deleteScript(scriptId, type);
  });

  $('#st-multitool-manage-script-view').on('click', '.st-multitool-manage-script-download', function(e) {
    e.stopPropagation();
    const scriptId = $(this).closest('.st-multitool-manage-script-item').data('script-id');
    const type = $(this).closest('.st-multitool-manage-script-card-content').attr('id').replace('st-multitool-manage-script-', '').replace('-list', '');
    downloadScript(scriptId, type);
  });
}

function debouncedRender() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
  renderDebounceTimer = setTimeout(() => {
    renderManageScriptLists();
  }, 100);
}

export async function renderManageScriptLists() {
  try {
    const globalScripts = await getScriptTrees({ type: 'global' }) || [];
    const presetScripts = await getScriptTrees({ type: 'preset' }) || [];
    const characterScripts = await getScriptTrees({ type: 'character' }) || [];

    renderScriptList($manageScriptGlobalList, globalScripts, 'global');
    renderScriptList($manageScriptPresetList, presetScripts, 'preset');
    renderScriptList($manageScriptCharacterList, characterScripts, 'character');
  } catch (e) {
    console.error('Tải script thất bại:', e);
    $manageScriptGlobalList.html('<div class="st-multitool-empty-msg">Tải thất bại</div>');
    $manageScriptPresetList.html('<div class="st-multitool-empty-msg">Tải thất bại</div>');
    $manageScriptCharacterList.html('<div class="st-multitool-empty-msg">Tải thất bại</div>');
  }
}

function renderScriptList($container, scripts, type) {
  if (scripts.length === 0) {
    $container.html('<div class="st-multitool-empty-msg">Không có script.</div>');
    return;
  }

  const fragment = document.createDocumentFragment();
  scripts.forEach(script => {
    const div = document.createElement('div');
    div.className = 'st-multitool-manage-script-item';
    div.setAttribute('data-script-id', script.id);
    div.innerHTML = `
      <div class="st-multitool-manage-script-info">
        <input type="checkbox" class="st-multitool-manage-script-enabled" ${script.enabled !== false ? 'checked' : ''}>
        <span class="st-multitool-manage-script-name">${escapeHtml(script.name || 'Script chưa có tên')}</span>
      </div>
      <div class="st-multitool-manage-script-actions">
        <button class="st-multitool-button st-multitool-btn-small st-multitool-manage-script-download" title="Tải xuống"><i data-lucide="download"></i></button>
        <button class="st-multitool-button st-multitool-btn-small st-multitool-manage-script-delete st-multitool-btn-danger" title="Xóa"><i data-lucide="trash-2"></i></button>
      </div>
    `;
    fragment.appendChild(div);
  });
  $container.empty().append(fragment);
  if (window.lucide) window.lucide.createIcons();
}

async function toggleScriptEnabled(scriptId, type, isEnabled) {
  try {
    await updateScriptTreesWith(scripts => {
      const script = scripts.find(s => s.id === scriptId);
      if (script) script.enabled = isEnabled;
      return scripts;
    }, { type: type });
    toastr.success(isEnabled ? 'Đã bật script' : 'Đã tắt script');
  } catch (e) {
    toastr.error('Cập nhật thất bại: ' + e.message);
    renderManageScriptLists();
  }
}

async function openScriptEditPanel(scriptId, type) {
  try {
    const scripts = await getScriptTrees({ type: type }) || [];
    const script = scripts.find(s => s.id === scriptId);
    if (!script) return;

    currentScripts = scripts;
    currentScriptId = scriptId;
    currentScriptType = type;

    $('#st-multitool-manage-script-id').val(script.id);
    $('#st-multitool-manage-script-name').val(script.name || '');
    $('#st-multitool-manage-script-content').val(script.content || '');
    $('#st-multitool-manage-script-info').val(script.info || '');
    $('#st-multitool-manage-script-enabled').prop('checked', script.enabled !== false);

    $manageScriptEditPanel.show();
    $manageScriptEditPanel.find('.st-multitool-manage-script-edit-title').text(`Sửa script ${type === 'global' ? 'Toàn cục' : type === 'preset' ? 'Preset' : 'Nhân vật'}`);
  } catch (e) {
    toastr.error('Tải script thất bại: ' + e.message);
  }
}

function hideScriptEditPanel() {
  $manageScriptEditPanel.hide();
  currentScriptId = '';
  currentScriptType = '';
}

async function handleSaveScript() {
  if (!currentScriptId || !currentScriptType) return;

  try {
    await updateScriptTreesWith(scripts => {
      const script = scripts.find(s => s.id === currentScriptId);
      if (script) {
        script.name = $('#st-multitool-manage-script-name').val();
        script.content = $('#st-multitool-manage-script-content').val();
        script.info = $('#st-multitool-manage-script-info').val();
        script.enabled = $('#st-multitool-manage-script-enabled').is(':checked');
      }
      return scripts;
    }, { type: currentScriptType });

    toastr.success('Lưu thành công!');
    hideScriptEditPanel();
    renderManageScriptLists();
  } catch (e) {
    toastr.error('Lưu thất bại: ' + e.message);
  }
}

export function restoreScriptCardStates() {
  const cards = [
    'st-multitool-manage-script-global-list',
    'st-multitool-manage-script-preset-list',
    'st-multitool-manage-script-character-list'
  ];

  const defaultCollapsed = isManageScriptCollapsed();

  cards.forEach(cardId => {
    const savedState = localStorage.getItem(`st-multitool-script-card-${cardId}`);
    const $card = $(`.st-multitool-manage-script-card-header[data-target="${cardId}"]`).closest('.st-multitool-manage-script-card');
    if (savedState === 'collapsed' || (savedState === null && defaultCollapsed)) {
      $card.addClass('collapsed');
    } else {
      $card.removeClass('collapsed');
    }
  });
}

async function deleteScript(scriptId, type) {
  if (!confirm('Xác nhận xóa script này?')) return;

  try {
    await updateScriptTreesWith(scripts => {
      return scripts.filter(s => s.id !== scriptId);
    }, { type: type });

    toastr.success('Xóa thành công');
    renderManageScriptLists();
    if (currentScriptId === scriptId) hideScriptEditPanel();
  } catch (e) {
    toastr.error('Xóa thất bại: ' + e.message);
  }
}

async function downloadScript(scriptId, type) {
  try {
    const scripts = await getScriptTrees({ type: type }) || [];
    const script = scripts.find(s => s.id === scriptId);
    if (!script) return toastr.error('Không tìm thấy script');

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(script, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Script Trợ lý Tavern-${script.name || 'Script chưa có tên'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  } catch (e) {
    toastr.error('Tải xuống thất bại: ' + e.message);
  }
}
