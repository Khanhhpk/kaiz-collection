import { getAllLorebooks, getLorebookEntries, setLorebookEntries, createLorebookEntries, deleteLorebookEntriesByUids } from '../api.js';
import { escapeHtml } from '../utils.js';
import { showLoader, hideLoader } from '../ui.js';

let $worldbookListContainer;
let $constantEntriesContainer;
let $normalEntriesContainer;
let $modifyWbSelect;
let $modifyEntrySelect;
let $modifyContent;
let $modifyDetails;
let $modName;
let $modKeys;
let $modContent;
let $modMode;
let $modPosition;
let $modDepthContainer;
let $modDepth;
let $modOrder;
let $modProb;
let $modPreventIn;
let $modPreventOut;
let $transSourceSelect;
let $transTargetSelect;
let $copySourceSelect;
let $copyTargetSelect;
let $transEntriesContainer;
let $copyEntriesContainer;
let $transSelectAllBtn;
let $copySelectAllBtn;
let $transBtn;
let $copyBtn;

export function initEntries() {
  $worldbookListContainer = $('#st-multitool-worldbook-list-container');
  $constantEntriesContainer = $('#st-multitool-constant-entries-container');
  $normalEntriesContainer = $('#st-multitool-normal-entries-container');
  $modifyWbSelect = $('#st-multitool-worldbook-select');
  $modifyEntrySelect = $('#st-multitool-entry-select');
  $modifyContent = $('#st-multitool-selected-entry-content');
  $modifyDetails = $('#st-multitool-modify-details');
  $modName = $('#st-multitool-mod-name');
  $modKeys = $('#st-multitool-mod-keys');
  $modContent = $('#st-multitool-mod-content');
  $modMode = $('#st-multitool-mod-mode');
  $modPosition = $('#st-multitool-mod-position');
  $modDepthContainer = $('#st-multitool-mod-depth-container');
  $modDepth = $('#st-multitool-mod-depth');
  $modOrder = $('#st-multitool-mod-order');
  $modProb = $('#st-multitool-mod-prob');
  $modPreventIn = $('#st-multitool-mod-prevent-in');
  $modPreventOut = $('#st-multitool-mod-prevent-out');
  $transSourceSelect = $('#st-multitool-source-worldbook-select');
  $transTargetSelect = $('#st-multitool-target-worldbook-select');
  $copySourceSelect = $('#st-multitool-copy-source-worldbook-select');
  $copyTargetSelect = $('#st-multitool-copy-target-worldbook-select');
  $transEntriesContainer = $('#st-multitool-source-entries-container');
  $copyEntriesContainer = $('#st-multitool-copy-source-entries-container');
  $transSelectAllBtn = $('#st-multitool-transfer-select-all-btn');
  $copySelectAllBtn = $('#st-multitool-copy-select-all-btn');
  $transBtn = $('#st-multitool-transfer-entries-btn');
  $copyBtn = $('#st-multitool-copy-entries-btn');

  $('#st-multitool-delete-entry-btn').on('click', handleDeleteEntries);
  $modifyWbSelect.on('change', populateModifyEntrySelect);
  $modifyEntrySelect.on('change', handleModifyEntryChange);
  $('#st-multitool-save-manual-changes-btn').on('click', handleManualSave);

  $modPosition.on('change', function () {
    const val = $(this).val();
    $modDepthContainer.css('display', val.startsWith('at_depth') ? 'flex' : 'none');
  });

  $transSourceSelect.on('change', renderSourceEntries);
  $transBtn.on('click', handleTransferEntries);
  $transSelectAllBtn.on('click', () => {
    const checkboxes = $transEntriesContainer.find('input[type="checkbox"]');
    const allChecked = checkboxes.length === checkboxes.filter(':checked').length;
    checkboxes.prop('checked', !allChecked);
  });

  $copySourceSelect.on('change', renderCopySourceEntries);
  $copyBtn.on('click', handleCopyEntries);
  $copySelectAllBtn.on('click', () => {
    const checkboxes = $copyEntriesContainer.find('input[type="checkbox"]');
    const allChecked = checkboxes.length === checkboxes.filter(':checked').length;
    checkboxes.prop('checked', !allChecked);
  });

  $constantEntriesContainer.on('click', '.st-multitool-book-button', function () {
    $(this).toggleClass('selected');
  });
  $normalEntriesContainer.on('click', '.st-multitool-book-button', function () {
    $(this).toggleClass('selected');
  });
}

export async function loadEntriesForSelectedBooks() {
  $constantEntriesContainer.empty();
  $normalEntriesContainer.empty();
  const selectedBooks = $worldbookListContainer.find('.selected');
  if (selectedBooks.length === 0) {
    $constantEntriesContainer.html('<p class="st-multitool-no-tasks">Hãy chọn Sổ thế giới trước.</p>');
    $normalEntriesContainer.html('');
    return;
  }

  try {
    const bookNames = selectedBooks.map((_, el) => $(el).attr('data-book-name')).get();
    const allEntriesPromises = bookNames.map(bookName => getLorebookEntries(bookName).then(entries => ({ bookName, entries })));
    const results = await Promise.all(allEntriesPromises);

    let constantHtml = '';
    let normalHtml = '';

    results.forEach(({ bookName, entries }) => {
      entries.forEach(e => {
        const entryName = e.name || e.comment || (e.key && e.key.length > 0 ? e.key.join(', ') : 'Mục chưa có tên');
        const buttonHtml = `<button class="st-multitool-book-button" data-uid="${e.uid}" data-book-name="${escapeHtml(bookName)}" title="${escapeHtml(entryName)}">${escapeHtml(entryName)}</button>`;
        if (e.type === 'constant' || e.constant === true || (e.strategy && e.strategy.type === 'constant')) {
          constantHtml += buttonHtml;
        } else {
          normalHtml += buttonHtml;
        }
      });
    });

    $constantEntriesContainer.html(constantHtml || '<p class="st-multitool-no-tasks">Không có mục đèn xanh dương.</p>');
    $normalEntriesContainer.html(normalHtml || '<p class="st-multitool-no-tasks">Không có mục đèn xanh lá.</p>');

  } catch (e) {
    toastr.error('Tải mục thất bại: ' + e.message);
    $constantEntriesContainer.html('<p style="color:red;">Tải thất bại</p>');
    $normalEntriesContainer.html('');
  }
}

export async function handleDeleteEntries() {
  const selected = $('#st-multitool-constant-entries-container .selected, #st-multitool-normal-entries-container .selected');
  if (selected.length === 0) return toastr.warning('Hãy chọn mục cần xóa');
  const toDelete = {};
  selected.each((_, el) => {
    const b = $(el).attr('data-book-name'),
      u = parseInt($(el).data('uid'));
    if (!toDelete[b]) toDelete[b] = [];
    toDelete[b].push(u);
  });
  if (confirm(`Xác nhận xóa vĩnh viễn ${selected.length}  mục?`)) {
    try {
      for (const b in toDelete) await deleteLorebookEntriesByUids(b, toDelete[b]);
      toastr.success('Xóa thành công');
      loadEntriesForSelectedBooks();
    } catch (e) {
      toastr.error('Xóa thất bại');
    }
  }
}

export async function populateModifyWorldbookSelect() {
  try {
    const books = await getAllLorebooks();
    $modifyWbSelect.empty().append('<option value="">-- Hãy chọn Sổ thế giới --</option>');
    books.forEach(b =>
      $modifyWbSelect.append(`<option value="${escapeHtml(b.file_name)}" title="${escapeHtml(b.name)}">${escapeHtml(b.name.length > 60 ? b.name.substring(0, 60) + '...' : b.name)}</option>`),
    );
    $modifyEntrySelect.empty().append('<option value="">--Hãy chọn Sổ thế giới trước--</option>');
  } catch (e) {
    $modifyWbSelect.empty().append('<option value="">Tải thất bại</option>');
  }
}

export async function populateModifyEntrySelect() {
  const book = $modifyWbSelect.val();
  $modifyContent.val('');
  if (!book) return $modifyEntrySelect.empty().append('<option value="">--Hãy chọn Sổ thế giới trước--</option>');
  $modifyEntrySelect.empty().append('<option value="">Đang tải...</option>');
  try {
    const entries = await getLorebookEntries(book);
    $modifyEntrySelect.data('entries', entries).empty();
    if (entries.length === 0) return $modifyEntrySelect.append('<option value="">Không có mục</option>');
    $modifyEntrySelect.append('<option value="">--Chọn mục--</option>');
    entries.forEach(e =>
      $modifyEntrySelect.append(`<option value="${e.uid}" title="${escapeHtml(e.name || e.comment || (e.key && e.key.length > 0 ? e.key.join(', ') : 'Mục chưa có tên'))}">${escapeHtml((e.name || e.comment || (e.key && e.key.length > 0 ? e.key.join(', ') : 'Mục chưa có tên')).length > 60 ? (e.name || e.comment || (e.key && e.key.length > 0 ? e.key.join(', ') : 'Mục chưa có tên')).substring(0, 60) + '...' : (e.name || e.comment || (e.key && e.key.length > 0 ? e.key.join(', ') : 'Mục chưa có tên')))}</option>`),
    );
  } catch (e) {
    $modifyEntrySelect.empty().append('<option value="">Tải thất bại</option>');
  }
}

export function handleModifyEntryChange() {
  const uid = $modifyEntrySelect.val(),
    entries = $modifyEntrySelect.data('entries') || [];

  if (uid) {
    const e = entries.find(x => x.uid == uid);
    if (e) {
      $modName.val(e.name || e.comment || '');
      $modKeys.val(
        e.strategy && e.strategy.keys ? e.strategy.keys.join(', ') : e.key ? e.key.join(', ') : '',
      );
      $modContent.val(e.content || '');

      const mode = e.strategy && e.strategy.type ? e.strategy.type : (e.type === 'constant' || e.constant === true) ? 'constant' : 'selective';
      $modMode.val(mode);

      let posVal = 'before_author_note';
      let showDepth = false;

      if (e.position && e.position.type) {
        if (e.position.type === 'at_depth') {
          posVal = `at_depth_${e.position.role || 'system'}`;
          $modDepth.val(e.position.depth || 4);
          showDepth = true;
        } else {
          posVal = e.position.type;
        }
      } else if (e.position !== undefined) {
        const p = parseInt(e.position);
        if (p === 0) posVal = 'before_character_definition';
        else if (p === 1) posVal = 'after_character_definition';
        else if (p === 2) posVal = 'before_example_messages';
        else if (p === 3) posVal = 'after_example_messages';
        else if (p === 4) posVal = 'before_author_note';
        else if (p === 5) posVal = 'after_author_note';
        else if (p >= 6 && p <= 8) {
          posVal = p === 6 ? 'at_depth_system' : p === 7 ? 'at_depth_user' : 'at_depth_assistant';
          $modDepth.val(e.depth || 4);
          showDepth = true;
        }
      }

      $modPosition.val(posVal);
      $modDepthContainer.css('display', showDepth ? 'flex' : 'none');

      $modOrder.val(e.position && e.position.order !== undefined ? e.position.order : e.order || 100);
      $modProb.val(e.probability !== undefined ? e.probability : 100);

      const pIn = e.recursion ? e.recursion.prevent_incoming : e.prevent_recursion || false;
      const pOut = e.recursion ? e.recursion.prevent_outgoing : e.prevent_recursion || false;
      $modPreventIn.prop('checked', pIn);
      $modPreventOut.prop('checked', pOut);

      $modifyDetails.css('display', 'flex');
    }
  } else {
    $modifyDetails.hide();
  }
}

export async function handleManualSave() {
  const book = $modifyWbSelect.val(),
    uid = $modifyEntrySelect.val();
  if (!book || !uid) return alert('Hãy chọn Sổ thế giới và mục');
  try {
    let entries = await getLorebookEntries(book);
    const idx = entries.findIndex(e => e.uid == uid);
    if (idx === -1) throw new Error('Không tìm thấy mục');

    const e = entries[idx];
    e.name = $modName.val();
    e.comment = e.name;
    e.content = $modContent.val();

    const keysStr = $modKeys.val();
    const keysArr = keysStr
      ? keysStr
          .split(',')
          .map(k => k.trim())
          .filter(k => k)
      : [];

    if (!e.strategy) e.strategy = {};
    e.strategy.type = $modMode.val();
    e.strategy.keys = keysArr;
    e.type = e.strategy.type === 'constant' ? 'constant' : 'Normal';
    e.constant = e.strategy.type === 'constant';
    e.key = keysArr;

    const posVal = $modPosition.val();
    if (!e.position || typeof e.position !== 'object') e.position = { order: e.order || 100 };

    if (posVal.startsWith('at_depth')) {
      e.position.type = 'at_depth';
      e.position.role = posVal.split('_')[2];
      e.position.depth = parseInt($modDepth.val()) || 4;
    } else {
      e.position.type = posVal;
    }

    e.position.order = parseInt($modOrder.val()) || 100;
    e.order = e.position.order;

    e.probability = parseInt($modProb.val());
    if (isNaN(e.probability)) e.probability = 100;

    if (!e.recursion) e.recursion = {};
    e.recursion.prevent_incoming = $modPreventIn.is(':checked');
    e.recursion.prevent_outgoing = $modPreventOut.is(':checked');

    await setLorebookEntries(book, entries);
    alert('Lưu thành công!');
    $modifyEntrySelect.data('entries', entries);
  } catch (e) {
    alert(`Lưu thất bại: ${e.message}`);
  }
}

export async function populateTransferSelects() {
  $transEntriesContainer.html('<p class="st-multitool-no-tasks">Hãy chọn Sổ thế giới nguồn trước.</p>');
  $copyEntriesContainer.html('<p class="st-multitool-no-tasks">Hãy chọn Sổ thế giới nguồn trước.</p>');
  if ($transSelectAllBtn) $transSelectAllBtn.hide();
  if ($copySelectAllBtn) $copySelectAllBtn.hide();
  try {
    const books = await getAllLorebooks();
    const ph = '<option value="">-- Hãy chọn Sổ thế giới --</option>';
    $transSourceSelect.empty().append(ph);
    $transTargetSelect.empty().append(ph);
    $copySourceSelect.empty().append(ph);
    $copyTargetSelect.empty().append(ph);
    books.forEach(b => {
        const opt = `<option value="${escapeHtml(b.file_name)}" title="${escapeHtml(b.name)}">${escapeHtml(b.name.length > 60 ? b.name.substring(0, 60) + '...' : b.name)}</option>`;
      $transSourceSelect.append(opt);
      $transTargetSelect.append(opt);
      $copySourceSelect.append(opt);
      $copyTargetSelect.append(opt);
    });
  } catch (e) {
    toastr.error('Tải thất bại');
  }
}

export async function renderSourceEntries() {
  const src = $transSourceSelect.val();

  $transTargetSelect.find('option').prop('disabled', false);
  if (src) {
      $transTargetSelect.find(`option[value="${escapeHtml(src)}"]`).prop('disabled', true);
      if ($transTargetSelect.val() === src) $transTargetSelect.val('');
  }

  if (!src) {
      $transSelectAllBtn.hide();
      return $transEntriesContainer.html('<p class="st-multitool-no-tasks">Hãy chọn Sổ thế giới nguồn trước.</p>');
  }
  $transEntriesContainer.html('<p>Đang tải...</p>');
  try {
    const entries = await getLorebookEntries(src);
    $transEntriesContainer.data('entries', entries).empty();
    if (entries.length === 0) {
        $transSelectAllBtn.hide();
        return $transEntriesContainer.html('<p class="st-multitool-no-tasks">Không có mục.</p>');
    }
    $transSelectAllBtn.show();
    let html = '';
    entries.forEach(e => {
      const id = `trans-entry-${e.uid}`;
      const blueIcon = '<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 2px solid black; background-color: #0078d7; margin-right: 6px; vertical-align: middle;" title="Đèn xanh dương (luôn hiển thị)"></span>';
      const greenIcon = '<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 2px solid black; background-color: #00cc00; margin-right: 6px; vertical-align: middle;" title="Đèn xanh lá (kích hoạt có điều kiện)"></span>';
      const isConstant = e.type === 'constant' || e.constant === true || (e.strategy && e.strategy.type === 'constant');
      const typeTag = isConstant ? blueIcon : greenIcon;
      const displayName = escapeHtml(e.name || e.comment || (e.key && e.key.length > 0 ? e.key.join(', ') : 'Mục chưa có tên'));
      html += `
                  <div class="st-multitool-checkbox-item" title="${displayName}">
                      <input type="checkbox" id="${id}" value="${e.uid}">
                      <label for="${id}">${typeTag}${displayName}</label>
                  </div>
              `;
    });
    $transEntriesContainer.html(html);
  } catch (e) {
    $transSelectAllBtn.hide();
    $transEntriesContainer.html('<p style="color:red;">Tải thất bại</p>');
  }
}

export async function renderCopySourceEntries() {
  const src = $copySourceSelect.val();

  $copyTargetSelect.find('option').prop('disabled', false);
  if (src) {
      $copyTargetSelect.find(`option[value="${escapeHtml(src)}"]`).prop('disabled', true);
      if ($copyTargetSelect.val() === src) $copyTargetSelect.val('');
  }

  if (!src) {
      $copySelectAllBtn.hide();
      return $copyEntriesContainer.html('<p class="st-multitool-no-tasks">Hãy chọn Sổ thế giới nguồn trước.</p>');
  }
  $copyEntriesContainer.html('<p>Đang tải...</p>');
  try {
    const entries = await getLorebookEntries(src);
    $copyEntriesContainer.data('entries', entries).empty();
    if (entries.length === 0) {
        $copySelectAllBtn.hide();
        return $copyEntriesContainer.html('<p class="st-multitool-no-tasks">Không có mục.</p>');
    }
    $copySelectAllBtn.show();
    let html = '';
    entries.forEach(e => {
      const id = `copy-entry-${e.uid}`;
      const blueIcon = '<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 2px solid black; background-color: #0078d7; margin-right: 6px; vertical-align: middle;" title="Đèn xanh dương (luôn hiển thị)"></span>';
      const greenIcon = '<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 2px solid black; background-color: #00cc00; margin-right: 6px; vertical-align: middle;" title="Đèn xanh lá (kích hoạt có điều kiện)"></span>';
      const isConstant = e.type === 'constant' || e.constant === true || (e.strategy && e.strategy.type === 'constant');
      const typeTag = isConstant ? blueIcon : greenIcon;
      const displayName = escapeHtml(e.name || e.comment || (e.key && e.key.length > 0 ? e.key.join(', ') : 'Mục chưa có tên'));
      html += `
                  <div class="st-multitool-checkbox-item" title="${displayName}">
                      <input type="checkbox" id="${id}" value="${e.uid}">
                      <label for="${id}">${typeTag}${displayName}</label>
                  </div>
              `;
    });
    $copyEntriesContainer.html(html);
  } catch (e) {
    $copySelectAllBtn.hide();
    $copyEntriesContainer.html('<p style="color:red;">Tải thất bại</p>');
  }
}

export async function handleTransferEntries() {
  const src = $transSourceSelect.val(),
    tgt = $transTargetSelect.val();
  const uids = $transEntriesContainer
    .find('input:checked')
    .map((_, el) => $(el).val())
    .get();
  if (!src || !tgt) return toastr.warning('Hãy chọn nguồn và đích');
  if (src === tgt) return toastr.warning('Nguồn và đích không được giống nhau');
  if (uids.length === 0) return toastr.warning('Hãy chọn mục');

  showLoader();
  $transBtn.prop('disabled', true).text('Đang chuyển...');
  try {
    const all = $transEntriesContainer.data('entries') || [];
    const toTrans = all.filter(e => uids.includes(String(e.uid)));

    const newEntries = toTrans.map(e => {
      const newE = { ...e };
      delete newE.uid;
      return newE;
    });

    await createLorebookEntries(tgt, newEntries);
    await deleteLorebookEntriesByUids(src, uids.map(uid => parseInt(uid)));

    toastr.success(`Chuyển thành công ${toTrans.length}  mục`);
    $transEntriesContainer.find('input:checked').prop('checked', false);
    renderSourceEntries();
  } catch (e) {
    toastr.error(`Chuyển thất bại: ${e.message}`);
  } finally {
    hideLoader();
    $transBtn.prop('disabled', false).text('Thực hiện chuyển');
  }
}

export async function handleCopyEntries() {
  const src = $copySourceSelect.val(),
    tgt = $copyTargetSelect.val();
  const uids = $copyEntriesContainer
    .find('input:checked')
    .map((_, el) => $(el).val())
    .get();
  if (!src || !tgt) return toastr.warning('Hãy chọn nguồn và đích');
  if (src === tgt) return toastr.warning('Nguồn và đích không được giống nhau');
  if (uids.length === 0) return toastr.warning('Hãy chọn mục');

  showLoader();
  $copyBtn.prop('disabled', true).text('Đang sao chép...');
  try {
    const all = $copyEntriesContainer.data('entries') || [];
    const toCopy = all.filter(e => uids.includes(String(e.uid)));

    const newEntries = toCopy.map(e => {
      const newE = { ...e };
      delete newE.uid;
      return newE;
    });

    await createLorebookEntries(tgt, newEntries);

    toastr.success(`Sao chép thành công ${toCopy.length}  mục`);
    $copyEntriesContainer.find('input:checked').prop('checked', false);
  } catch (e) {
    toastr.error(`Sao chép thất bại: ${e.message}`);
  } finally {
    hideLoader();
    $copyBtn.prop('disabled', false).text('Thực hiện sao chép');
  }
}
