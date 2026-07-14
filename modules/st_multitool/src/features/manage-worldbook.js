import { getAllLorebooks, getLorebookEntries, setLorebookEntries, getLorebookSettings, setLorebookSettings, createWorldbook, deleteWorldbook, deleteWorldbookEntries } from '../api.js';
import { escapeHtml, refreshIcons } from '../utils.js';
import { showLoader, hideLoader } from '../ui.js';
import { isManageWbCollapsed } from './settings.js';

let $manageWbList;
let $manageWbEntriesList;
let $manageWbEditPanel;
let currentEntries = [];
let currentBookName = '';
let renderDebounceTimer = null;

export function initManageWorldbook() {
  $manageWbList = $('#st-multitool-manage-wb-list');
  $manageWbEntriesList = $('#st-multitool-manage-wb-entries-list');
  $manageWbEditPanel = $('#st-multitool-manage-wb-edit-panel');

  $('#st-multitool-manage-wb-refresh-btn').on('click', debouncedRender);
  $('#st-multitool-manage-wb-create-btn').on('click', handleCreateWorldbook);
  $('#st-multitool-manage-wb-delete-btn').on('click', handleDeleteSelectedWorldbooks);
  $('#st-multitool-manage-wb-select-all-btn').on('click', toggleSelectAllWorldbooks);

  $('#st-multitool-manage-wb-entry-create-btn').on('click', handleCreateEntry);
  $('#st-multitool-manage-wb-entry-delete-btn').on('click', handleDeleteSelectedEntries);
  $('#st-multitool-manage-wb-entry-select-all-btn').on('click', toggleSelectAllEntries);
  $('#st-multitool-manage-wb-save-entry-btn').on('click', handleSaveEntry);
  $('#st-multitool-manage-wb-cancel-entry-btn').on('click', hideEntryEditPanel);

  $('#st-multitool-manage-wb-view').on('click', '.st-multitool-manage-script-card-header', function() {
    const targetId = $(this).data('target');
    if (targetId && targetId.startsWith('st-multitool-manage-wb')) {
      const $card = $(this).closest('.st-multitool-manage-script-card');
      $card.toggleClass('collapsed');
      const isCollapsed = $card.hasClass('collapsed');
      localStorage.setItem(`st-multitool-wb-card-${targetId}`, isCollapsed ? 'collapsed' : 'expanded');
    }
  });

  restoreWbCardStates();

  $('#st-multitool-manage-wb-view').on('click', '.st-multitool-manage-wb-item', function(e) {
    if ($(e.target).hasClass('st-multitool-manage-wb-checkbox') || 
        $(e.target).closest('.st-multitool-manage-wb-actions').length) {
      return;
    }
    const bookName = $(this).attr('data-book-name');
    loadWorldbookEntries(bookName);
  });

  $('#st-multitool-manage-wb-view').on('change', '.st-multitool-manage-wb-checkbox', function(e) {
    e.stopPropagation();
    const bookName = $(this).closest('.st-multitool-manage-wb-item').attr('data-book-name');
    const isChecked = $(this).is(':checked');
    toggleWorldbookEnabled(bookName, isChecked);
  });

  $('#st-multitool-manage-wb-view').on('click', '.st-multitool-manage-wb-delete', function(e) {
    e.stopPropagation();
    const bookName = $(this).closest('.st-multitool-manage-wb-item').attr('data-book-name');
    deleteSingleWorldbook(bookName);
  });

  $('#st-multitool-manage-wb-view').on('click', '.st-multitool-manage-wb-download', function(e) {
    e.stopPropagation();
    const bookName = $(this).closest('.st-multitool-manage-wb-item').attr('data-book-name');
    downloadWorldbook(bookName);
  });

  $('#st-multitool-manage-wb-view').on('click', '.st-multitool-manage-entry-item', function(e) {
    if ($(e.target).hasClass('st-multitool-manage-entry-checkbox') || 
        $(e.target).closest('.st-multitool-manage-entry-actions').length) {
      return;
    }
    const uid = $(this).data('uid');
    openEntryEditPanel(uid);
  });

  $('#st-multitool-manage-wb-view').on('click', '.st-multitool-manage-entry-delete', function(e) {
    e.stopPropagation();
    const uid = $(this).closest('.st-multitool-manage-entry-item').data('uid');
    deleteSingleEntry(uid);
  });

  $('#st-multitool-manage-wb-entry-position').on('change', function() {
    const val = $(this).val();
    $('#st-multitool-manage-wb-entry-depth-container').css('display', val.startsWith('at_depth') ? 'flex' : 'none');
  });
}

function debouncedRender() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
  renderDebounceTimer = setTimeout(() => {
    renderManageWorldbookList();
  }, 100);
}

export async function renderManageWorldbookList() {
  $manageWbList.html('<div class="st-multitool-empty-msg">Đang tải...</div>');
  try {
    const [books, settings] = await Promise.all([getAllLorebooks(), getLorebookSettings()]);
    const enabledBooks = new Set(settings.selected_global_lorebooks);

    if (books.length === 0) {
      $manageWbList.html('<div class="st-multitool-empty-msg">Không tìm thấy Sổ thế giới nào.</div>');
      return;
    }

    const fragment = document.createDocumentFragment();
    books.forEach(book => {
      const isEnabled = enabledBooks.has(book.file_name);
      const div = document.createElement('div');
      div.className = 'st-multitool-manage-wb-item';
      div.setAttribute('data-book-name', book.file_name);
      div.innerHTML = `
        <div class="st-multitool-manage-wb-info">
          <input type="checkbox" class="st-multitool-manage-wb-checkbox" ${isEnabled ? 'checked' : ''} title="Bật/Tắt">
          <span class="st-multitool-manage-wb-name">${escapeHtml(book.name)}</span>
        </div>
        <div class="st-multitool-manage-wb-actions">
          <button class="st-multitool-button st-multitool-btn-small st-multitool-manage-wb-download" title="Tải xuống"><i data-lucide="download"></i></button>
          <button class="st-multitool-button st-multitool-btn-small st-multitool-manage-wb-delete st-multitool-btn-danger" title="Xóa"><i data-lucide="trash-2"></i></button>
        </div>
      `;
      fragment.appendChild(div);
    });

    $manageWbList.empty().append(fragment);
    refreshIcons($manageWbList[0]);
  } catch (e) {
    $manageWbList.html(`<div class="st-multitool-empty-msg" style="color:red;">Tải thất bại: ${e.message}</div>`);
  }
}

async function toggleWorldbookEnabled(bookName, isEnabled) {
  try {
    const curSettings = await getLorebookSettings();
    let enabled = curSettings.selected_global_lorebooks || [];

    if (isEnabled) {
      if (!enabled.includes(bookName)) enabled.push(bookName);
    } else {
      enabled = enabled.filter(n => n !== bookName);
    }

    await setLorebookSettings({ selected_global_lorebooks: enabled });
    toastr.success(isEnabled ? 'Đã bậtSổ thế giới' : 'Đã tắtSổ thế giới');
  } catch (e) {
    toastr.error('Cập nhật thất bại: ' + e.message);
    renderManageWorldbookList();
  }
}

async function loadWorldbookEntries(bookName) {
  currentBookName = bookName;
  $manageWbEntriesList.html('<div class="st-multitool-empty-msg">Đang tải...</div>');
  $manageWbList.find('.st-multitool-manage-wb-item').removeClass('active');
  $manageWbList.find(`[data-book-name="${escapeHtml(bookName)}"]`).addClass('active');
  hideEntryEditPanel();

  try {
    const entries = await getLorebookEntries(bookName);
    currentEntries = entries;

    if (entries.length === 0) {
      $manageWbEntriesList.html('<div class="st-multitool-empty-msg">Sổ thế giới này không có mục.</div>');
      return;
    }

    renderEntriesList(entries);
  } catch (e) {
    $manageWbEntriesList.html(`<div class="st-multitool-empty-msg" style="color:red;">Tải thất bại: ${e.message}</div>`);
  }
}

function getPositionLabel(entry) {
  const pos = entry.position || {};
  const type = pos.type || 'before_author_note';
  const labels = {
    'before_character_definition': 'Trước định nghĩa nhân vật',
    'after_character_definition': 'Sau định nghĩa nhân vật',
    'before_example_messages': 'Trước tin nhắn ví dụ',
    'after_example_messages': 'Sau tin nhắn ví dụ',
    'before_author_note': 'Trước ghi chú tác giả',
    'after_author_note': 'Sau ghi chú tác giả',
    'at_depth': `@D${pos.depth || 4}`
  };
  return labels[type] || type;
}

function renderEntriesList(entries) {
  const fragment = document.createDocumentFragment();
  entries.forEach(entry => {
    const isConstant = entry.type === 'constant' || entry.constant === true || (entry.strategy && entry.strategy.type === 'constant');
    const typeLabel = isConstant ? '<span class="st-multitool-badge st-multitool-badge-blue">Đèn xanh dương</span>' : '<span class="st-multitool-badge st-multitool-badge-green">Đèn xanh lá</span>';
    const posLabel = getPositionLabel(entry);
    const order = entry.position?.order || entry.order || 100;
    const prob = entry.probability !== undefined ? entry.probability : 100;
    const entryName = entry.name || entry.comment || (entry.key && entry.key.length > 0 ? entry.key.join(', ') : 'Mục chưa có tên');
    const div = document.createElement('div');
    div.className = 'st-multitool-manage-entry-item';
    div.setAttribute('data-uid', entry.uid);
    div.innerHTML = `
      <div class="st-multitool-manage-entry-info">
        <input type="checkbox" class="st-multitool-manage-entry-checkbox" data-uid="${entry.uid}">
        ${typeLabel}
        <span class="st-multitool-manage-entry-name">${escapeHtml(entryName)}</span>
        <span class="st-multitool-entry-meta" style="margin-left: 10px; color: var(--st-multitool-text-muted); font-size: 0.85em;">
          ${posLabel} · Thứ tự${order} · Xác suất${prob}%
        </span>
      </div>
      <div class="st-multitool-manage-entry-actions">
        <button class="st-multitool-button st-multitool-btn-small st-multitool-manage-entry-delete">Xóa</button>
      </div>
    `;
    fragment.appendChild(div);
  });
  $manageWbEntriesList.empty().append(fragment);
}

function openEntryEditPanel(uid) {
  const entry = currentEntries.find(e => e.uid == uid);
  if (!entry) return;

  $('#st-multitool-manage-wb-entry-uid').val(entry.uid);
  $('#st-multitool-manage-wb-entry-name').val(entry.name || entry.comment || '');
  
  const keys = entry.strategy && entry.strategy.keys ? entry.strategy.keys : (entry.key || []);
  $('#st-multitool-manage-wb-entry-keys').val(keys.join(', '));
  $('#st-multitool-manage-wb-entry-content').val(entry.content || '');

  const mode = entry.strategy && entry.strategy.type ? entry.strategy.type : (entry.type === 'constant' || entry.constant === true) ? 'constant' : 'selective';
  $('#st-multitool-manage-wb-entry-mode').val(mode);

  let posVal = 'before_author_note';
  let showDepth = false;
  if (entry.position && entry.position.type) {
    if (entry.position.type === 'at_depth') {
      posVal = `at_depth_${entry.position.role || 'system'}`;
      $('#st-multitool-manage-wb-entry-depth').val(entry.position.depth || 4);
      showDepth = true;
    } else {
      posVal = entry.position.type;
    }
  }
  $('#st-multitool-manage-wb-entry-position').val(posVal);
  $('#st-multitool-manage-wb-entry-depth-container').css('display', showDepth ? 'flex' : 'none');

  $('#st-multitool-manage-wb-entry-order').val(entry.position && entry.position.order !== undefined ? entry.position.order : (entry.order || 100));
  $('#st-multitool-manage-wb-entry-prob').val(entry.probability !== undefined ? entry.probability : 100);

  const pIn = entry.recursion ? entry.recursion.prevent_incoming : (entry.prevent_recursion || false);
  const pOut = entry.recursion ? entry.recursion.prevent_outgoing : (entry.prevent_recursion || false);
  $('#st-multitool-manage-wb-entry-prevent-in').prop('checked', pIn);
  $('#st-multitool-manage-wb-entry-prevent-out').prop('checked', pOut);
  $manageWbEditPanel.removeClass('collapsed');
  $manageWbEditPanel.find('.st-multitool-section-content').show();
  const $icon = $manageWbEditPanel.find('.st-multitool-collapse-icon');
  if ($icon.length) {
    $icon.replaceWith('<i data-lucide="chevron-up" class="st-multitool-collapse-icon"></i>');
  }
  $manageWbEditPanel.show();
  refreshIcons($manageWbEditPanel[0]);
}

function hideEntryEditPanel() {
  $manageWbEditPanel.hide();
  $manageWbEditPanel.removeClass('collapsed');
  $manageWbEditPanel.find('.st-multitool-section-content').show();
  $('#st-multitool-manage-wb-entry-uid').val('');
}

async function handleSaveEntry() {
  const uid = $('#st-multitool-manage-wb-entry-uid').val();
  if (!uid || !currentBookName) return;

  try {
    const entries = await getLorebookEntries(currentBookName);
    const idx = entries.findIndex(e => e.uid == uid);
    if (idx === -1) throw new Error('Không tìm thấy mục');

    const e = entries[idx];
    e.comment = $('#st-multitool-manage-wb-entry-name').val();
    e.name = e.comment;
    e.content = $('#st-multitool-manage-wb-entry-content').val();

    const keysStr = $('#st-multitool-manage-wb-entry-keys').val();
    const keysArr = keysStr ? keysStr.split(',').map(k => k.trim()).filter(k => k) : [];

    if (!e.strategy) e.strategy = {};
    e.strategy.type = $('#st-multitool-manage-wb-entry-mode').val();
    e.strategy.keys = keysArr;
    e.type = e.strategy.type === 'constant' ? 'constant' : 'Normal';
    e.constant = e.strategy.type === 'constant';
    e.key = keysArr;

    const posVal = $('#st-multitool-manage-wb-entry-position').val();
    if (!e.position || typeof e.position !== 'object') e.position = { order: e.order || 100 };

    if (posVal.startsWith('at_depth')) {
      e.position.type = 'at_depth';
      e.position.role = posVal.split('_')[2];
      e.position.depth = parseInt($('#st-multitool-manage-wb-entry-depth').val()) || 4;
    } else {
      e.position.type = posVal;
    }

    e.position.order = parseInt($('#st-multitool-manage-wb-entry-order').val()) || 100;
    e.order = e.position.order;
    e.probability = parseInt($('#st-multitool-manage-wb-entry-prob').val());
    if (isNaN(e.probability)) e.probability = 100;

    if (!e.recursion) e.recursion = {};
    e.recursion.prevent_incoming = $('#st-multitool-manage-wb-entry-prevent-in').is(':checked');
    e.recursion.prevent_outgoing = $('#st-multitool-manage-wb-entry-prevent-out').is(':checked');

    await setLorebookEntries(currentBookName, entries);
    toastr.success('Lưu thành công!');
    hideEntryEditPanel();
    loadWorldbookEntries(currentBookName);
  } catch (e) {
    toastr.error('Lưu thất bại: ' + e.message);
  }
}

async function handleCreateEntry() {
  if (!currentBookName) return toastr.warning('Hãy chọn Sổ thế giới trước');
  
  const name = prompt('Nhập tên mục:');
  if (!name) return;

  try {
    const entries = await getLorebookEntries(currentBookName);
    const newEntry = {
      name: name,
      comment: name,
      content: '',
      enabled: true,
      strategy: { type: 'selective', keys: [], scan_depth: 'same_as_global' },
      position: { type: 'before_author_note', order: 100 },
      probability: 100,
      recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
      effect: { sticky: null, cooldown: null, delay: null },
    };
    entries.push(newEntry);
    await setLorebookEntries(currentBookName, entries);
    toastr.success('Tạo thành công!');
    loadWorldbookEntries(currentBookName);
  } catch (e) {
    toastr.error('Tạo thất bại: ' + e.message);
  }
}

export function restoreWbCardStates() {
  const cards = [
    'st-multitool-manage-wb-books-card',
    'st-multitool-manage-wb-entries-card'
  ];

  const defaultCollapsed = isManageWbCollapsed();

  cards.forEach(cardId => {
    const savedState = localStorage.getItem(`st-multitool-wb-card-${cardId}`);
    const $card = $(`.st-multitool-manage-script-card-header[data-target="${cardId}"]`).closest('.st-multitool-manage-script-card');
    if (savedState === 'collapsed' || (savedState === null && defaultCollapsed)) {
      $card.addClass('collapsed');
    } else {
      $card.removeClass('collapsed');
    }
  });
}

async function handleCreateWorldbook() {
  const name = prompt('Nhập tên Sổ thế giới mới:');
  if (!name || !name.trim()) return;
  try {
    await createWorldbook(name.trim());
    toastr.success(`Sổ thế giới "${name}" Tạo thành công!`);
    renderManageWorldbookList();
  } catch (e) {
    toastr.error(`Tạo thất bại: ${e.message}`);
  }
}

async function deleteSingleWorldbook(bookName) {
  if (!confirm(`Xác nhận xóa Sổ thế giới "${bookName}"?`)) return;
  try {
    await deleteWorldbook(bookName);
    toastr.success('Xóa thành công');
    renderManageWorldbookList();
    $manageWbEntriesList.html('<div class="st-multitool-empty-msg">Hãy chọn Sổ thế giới ở bên trái trước.</div>');
    hideEntryEditPanel();
    currentBookName = '';
    currentEntries = [];
  } catch (e) {
    toastr.error('Xóa thất bại: ' + e.message);
  }
}

async function downloadWorldbook(bookName) {
  try {
    const entries = await getLorebookEntries(bookName);
    const wbData = {
      entries: {}
    };
    
    entries.forEach(entry => {
      wbData.entries[entry.uid] = entry;
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(wbData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${bookName}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  } catch (e) {
    toastr.error('Tải xuống thất bại: ' + e.message);
  }
}

async function handleDeleteSelectedWorldbooks() {
  const selected = $manageWbList.find('.st-multitool-manage-wb-checkbox:checked').closest('.st-multitool-manage-wb-item');
  if (selected.length === 0) return toastr.warning('Hãy chọn Sổ thế giới cần xóa');
  
  const bookNames = selected.map((_, el) => $(el).attr('data-book-name')).get();
  if (!confirm(`Xác nhận xóa ${bookNames.length} Sổ thế giới?`)) return;

  try {
    for (const name of bookNames) {
      await deleteWorldbook(name);
    }
    toastr.success('Xóa thành công');
    renderManageWorldbookList();
    $manageWbEntriesList.html('<div class="st-multitool-empty-msg">Hãy chọn Sổ thế giới ở bên trái trước.</div>');
    hideEntryEditPanel();
    currentBookName = '';
    currentEntries = [];
  } catch (e) {
    toastr.error('Xóa thất bại: ' + e.message);
  }
}

function toggleSelectAllWorldbooks() {
  const checkboxes = $manageWbList.find('.st-multitool-manage-wb-checkbox');
  const allChecked = checkboxes.length === checkboxes.filter(':checked').length;
  checkboxes.prop('checked', !allChecked);
}

async function deleteSingleEntry(uid) {
  if (!currentBookName) return;
  if (!confirm('Xác nhận xóa mục này?')) return;

  try {
    await deleteWorldbookEntries(currentBookName, entry => entry.uid === parseInt(uid), { render: 'debounced' });
    toastr.success('Xóa thành công');
    loadWorldbookEntries(currentBookName);
  } catch (e) {
    toastr.error('Xóa thất bại: ' + e.message);
  }
}

async function handleDeleteSelectedEntries() {
  if (!currentBookName) return toastr.warning('Hãy chọn Sổ thế giới trước');
  
  const selected = $manageWbEntriesList.find('.st-multitool-manage-entry-checkbox:checked');
  if (selected.length === 0) return toastr.warning('Hãy chọn mục cần xóa');

  const uids = selected.map((_, el) => parseInt($(el).data('uid'))).get();
  if (!confirm(`Xác nhận xóa ${uids.length} mục?`)) return;

  try {
    await deleteWorldbookEntries(currentBookName, entry => uids.includes(entry.uid), { render: 'debounced' });
    toastr.success('Xóa thành công');
    loadWorldbookEntries(currentBookName);
  } catch (e) {
    toastr.error('Xóa thất bại: ' + e.message);
  }
}

function toggleSelectAllEntries() {
  const checkboxes = $manageWbEntriesList.find('.st-multitool-manage-entry-checkbox');
  const allChecked = checkboxes.length === checkboxes.filter(':checked').length;
  checkboxes.prop('checked', !allChecked);
}
