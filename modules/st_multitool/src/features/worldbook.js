import { getAllLorebooks, getLorebookSettings, setLorebookSettings, getLorebookEntries, getTavernHelper, deleteWorldbook, createWorldbook, getWorldbook } from '../api.js';
import { escapeHtml } from '../utils.js';
import { showLoader, hideLoader } from '../ui.js';
import { loadEntriesForSelectedBooks } from './entries.js';

let $bookList;
let $worldbookListContainer;
let $dupSourceSelect;
let $dupTargetInput;
let $dupSubmitBtn;
let $renameSourceSelect;
let $renameTargetInput;
let $renameSubmitBtn;

export function initWorldbook() {
  $bookList = $('#st-multitool-book-list');
  $worldbookListContainer = $('#st-multitool-worldbook-list-container');
  $dupSourceSelect = $('#st-multitool-dup-source-select');
  $dupTargetInput = $('#st-multitool-dup-target-input');
  $dupSubmitBtn = $('#st-multitool-duplicate-submit-btn');
  $renameSourceSelect = $('#st-multitool-rename-source-select');
  $renameTargetInput = $('#st-multitool-rename-target-input');
  $renameSubmitBtn = $('#st-multitool-rename-submit-btn');

  $('#st-multitool-delete-worldbook-btn').on('click', handleDeleteWorldbooks);
  $dupSubmitBtn.on('click', handleDuplicateWorldbook);
  $renameSubmitBtn.on('click', handleRenameWorldbook);

  $bookList.on('click', '.st-multitool-book-button', async function () {
    const $this = $(this);
    const bookFilename = $this.data('book-filename');
    const isSelected = $this.hasClass('selected');

    $this.toggleClass('selected');

    try {
      const curSettings = await getLorebookSettings();
      let enabled = curSettings.selected_global_lorebooks || [];

      if (isSelected) {
        enabled = enabled.filter(n => n !== bookFilename);
      } else if (!enabled.includes(bookFilename)) {
        enabled.push(bookFilename);
      }

      await setLorebookSettings({ selected_global_lorebooks: enabled });
    } catch (e) {
      $this.toggleClass('selected');
      toastr.error('Cập nhật trạng thái Sổ thế giới thất bại');
    }
  });

  $worldbookListContainer.on('click', '.st-multitool-book-button', function () {
    $(this).toggleClass('selected');
    loadEntriesForSelectedBooks();
  });
}

export async function renderWorldBooks() {
  $bookList.empty().append('<p>Đang tải...</p>');
  try {
    const [allBooks, settings] = await Promise.all([getAllLorebooks(), getLorebookSettings()]);
    const enabledBooks = new Set(settings.selected_global_lorebooks);

    if (allBooks.length === 0) {
      $bookList.html('<p>Không tìm thấy Sổ thế giới nào.</p>');
      return;
    }

    const buttonsHtml = allBooks.map(book => {
      const isEnabled = enabledBooks.has(book.file_name);
      return `<button class="st-multitool-book-button ${isEnabled ? 'selected' : ''}" data-book-filename="${escapeHtml(book.file_name)}">${escapeHtml(book.name)}</button>`;
    }).join('');

    $bookList.html(buttonsHtml);

  } catch (e) {
    $bookList.empty().append(`<p style="color:red;">Tải thất bại: ${e.message}</p>`);
  }
}

export async function renderDeleteView() {
  try {
    const books = await getAllLorebooks();
    $worldbookListContainer.empty();
    if (books.length === 0) return $worldbookListContainer.append('<p>Không tìm thấy Sổ thế giới.</p>');
    let html = '';
    books.forEach(b => {
      html += `<button class="st-multitool-book-button" data-book-name="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</button>`;
    });
    $worldbookListContainer.html(html);
  } catch (e) {
    toastr.error('Tải thất bại');
  }
  loadEntriesForSelectedBooks();
}

export async function handleDeleteWorldbooks() {
  const selected = $worldbookListContainer
    .find('.selected')
    .map((_, el) => $(el).attr('data-book-name'))
    .get();
  if (selected.length === 0) return toastr.warning('Hãy chọn Sổ thế giới cần xóa');
  if (confirm(`Xác nhận xóa vĩnh viễn ${selected.length} Sổ thế giới?`)) {
    try {
      for (const name of selected) await deleteWorldbook(name);
      toastr.success('Xóa thành công');
      renderDeleteView();
    } catch (e) {
      toastr.error('Xóa thất bại');
    }
  }
}

export async function populateDuplicateSelect() {
  try {
    const books = await getAllLorebooks();
    $dupSourceSelect.empty().append('<option value="">--Hãy chọn Sổ thế giới nguồn--</option>');
    books.forEach(b => $dupSourceSelect.append(`<option value="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</option>`));
  } catch (e) {
    toastr.error('Tải thất bại');
  }
}

export async function handleDuplicateWorldbook() {
  const source = $dupSourceSelect.val();
  const target = $dupTargetInput.val().trim();
  if (!source) return toastr.warning('Hãy chọn Sổ thế giới nguồn');
  if (!target) return toastr.warning('Hãy nhập tên Sổ thế giới mới');

  showLoader();
  $dupSubmitBtn.prop('disabled', true).text('Đang sao chép...');
  try {
    const entries = await getWorldbook(source);

    const newEntries = entries.map(e => {
      const newE = { ...e };
      delete newE.uid;
      return newE;
    });

    await createWorldbook(target, newEntries);

    toastr.success(`Sao chép Sổ thế giới thành "${target}" thành công`);
    $dupTargetInput.val('');
  } catch (e) {
    toastr.error(`Sao chép thất bại: ${e.message}`);
  } finally {
    hideLoader();
    $dupSubmitBtn.prop('disabled', false).text('Xác nhận sao chép');
  }
}

export async function populateRenameSelect() {
  try {
    const books = await getAllLorebooks();
    $renameSourceSelect.empty().append('<option value="">--Hãy chọn Sổ thế giới cần đổi tên--</option>');
    books.forEach(b => $renameSourceSelect.append(`<option value="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</option>`));
  } catch (e) {
    toastr.error('Tải danh sách Sổ thế giới thất bại');
  }
}

export async function handleRenameWorldbook() {
  const source = $renameSourceSelect.val();
  const newName = $renameTargetInput.val().trim();
  if (!source) return toastr.warning('Hãy chọn Sổ thế giới cần đổi tên');
  if (!newName) return toastr.warning('Hãy nhập tên mới');

  showLoader();
  $renameSubmitBtn.prop('disabled', true).text('Đang đổi tên...');
  try {
    const entries = await getWorldbook(source);
    const newEntries = entries.map(e => {
      const newE = { ...e };
      delete newE.uid;
      return newE;
    });
    await createWorldbook(newName, newEntries);
    await deleteWorldbook(source);

    toastr.success(`Đổi tên "${source}" thành "${newName}" thành công`);
    $renameTargetInput.val('');
    await populateRenameSelect();
  } catch (e) {
    toastr.error(`Đổi tên thất bại: ${e.message}`);
  } finally {
    hideLoader();
    $renameSubmitBtn.prop('disabled', false).text('Xác nhận chỉnh sửa');
  }
}

export async function handleCreateWorldbook(callback) {
  const name = prompt('Nhập tên Sổ thế giới mới:');
  if (!name || !name.trim()) return;
  try {
    await createWorldbook(name.trim());
    toastr.success(`Tạo Sổ thế giới "${name}" thành công!`);
    if (callback) await callback(name.trim());
  } catch (e) {
    toastr.error(`Tạo thất bại: ${e.message}`);
  }
}
