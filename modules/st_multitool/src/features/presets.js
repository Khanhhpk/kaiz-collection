import { setLorebookSettings } from '../api.js';
import { escapeHtml } from '../utils.js';

const PRESET_STORAGE_KEY = 'st_multitool_presets';

let $presetListContainer;

export function initPresets() {
  $presetListContainer = $('#st-multitool-preset-list-container');
  
  $('#st-multitool-save-preset-btn').on('click', () => {
    const name = prompt('Nhập tên preset:');
    if (!name) return;
    const books = $('.st-multitool-book-button.selected')
      .map((_, el) => $(el).data('book-filename'))
      .get();
    if (books.length === 0) return alert('Hãy chọn ít nhất một Sổ thế giới!');
    savePreset({ name, books });
    alert('Lưu thành công!');
    renderPresets();
  });
}

export function getPresets() {
  return JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY)) || [];
}

export function savePreset(preset) {
  const presets = getPresets();
  const idx = presets.findIndex(p => p.name === preset.name);
  if (idx > -1) presets[idx] = preset;
  else presets.push(preset);
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

export function deletePreset(name) {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(getPresets().filter(p => p.name !== name)));
  renderPresets();
}

export function renderPresets() {
  if (!$presetListContainer) $presetListContainer = $('#st-multitool-preset-list-container');
  const presets = getPresets();
  $presetListContainer.empty().hide();
  if (presets.length === 0) return;
  presets.forEach(p => {
    const item = $(
      `<div class="st-multitool-preset-item"><span>${escapeHtml(p.name)}</span><div><button class="st-multitool-delete-preset-btn">&times;</button></div></div>`,
    );
    item.on('click', async e => {
      if (!$(e.target).hasClass('st-multitool-delete-preset-btn')) {
        try {
          await setLorebookSettings({ selected_global_lorebooks: [] });
          await setLorebookSettings({ selected_global_lorebooks: p.books });
          toastr.success('Tải preset thành công!');
        } catch (err) {
          toastr.error('Tải thất bại');
        }
      }
    });
    item.find('.st-multitool-delete-preset-btn').on('click', e => {
      e.stopPropagation();
      if (confirm(`Xác nhận xóa preset "${p.name}"?`)) deletePreset(p.name);
    });
    $presetListContainer.append(item);
  });
  $presetListContainer.show();
}
