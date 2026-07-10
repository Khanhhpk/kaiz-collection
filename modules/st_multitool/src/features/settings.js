import { showPopup } from '../ui.js';

export const STORAGE_KEY_BUTTON_POS = 'st-multitool-btn-pos';
export const STORAGE_KEY_SETTINGS = 'st-multitool-settings';
const MAGIC_MENU_ID = 'st-multitool-extension-menu-item';

let magicMenuRetryTimer = null;
let magicMenuRetryCount = 0;

let $showMagicWandBtn;
let $showQrBtn;
let $defaultCollapseBtn;
let $manageWbCollapsedBtn;
let $manageScriptCollapsedBtn;
let $manageRegexCollapsedBtn;

export function initSettings() {
  $showMagicWandBtn = $('#st-multitool-setting-show-magic-wand-btn');
  $showQrBtn = $('#st-multitool-setting-show-qr-btn');
  $defaultCollapseBtn = $('#st-multitool-setting-default-collapse');
  $manageWbCollapsedBtn = $('#st-multitool-setting-manage-wb-collapsed');
  $manageScriptCollapsedBtn = $('#st-multitool-setting-manage-script-collapsed');
  $manageRegexCollapsedBtn = $('#st-multitool-setting-manage-regex-collapsed');

  $showMagicWandBtn
    .on('mousedown', function () {
      $(this).data('last-checked', $(this).is(':checked'));
    })
    .on('change', saveSettings);
  $showQrBtn
    .on('mousedown', function () {
      $(this).data('last-checked', $(this).is(':checked'));
    })
    .on('change', saveSettings);
  $defaultCollapseBtn.on('change', saveSettings);
  $manageWbCollapsedBtn.on('change', saveSettings);
  $manageScriptCollapsedBtn.on('change', saveSettings);
  $manageRegexCollapsedBtn.on('change', saveSettings);

  loadSettings();
  initMagicWandMenu();
  initQrMenu();
}

function normalizeSettings(raw = {}) {
  const settings = {
    showMagicWandBtn: raw.showMagicWandBtn !== false,
    showQrBtn: raw.showQrBtn !== false,
    defaultCollapse: raw.defaultCollapse !== false,
    manageWbCollapsed: raw.manageWbCollapsed === true,
    manageScriptCollapsed: raw.manageScriptCollapsed === true,
    manageRegexCollapsed: raw.manageRegexCollapsed === true,
  };

  // Never allow all entry points to be disabled, otherwise users cannot reopen the UI.
  if (!settings.showMagicWandBtn && !settings.showQrBtn) {
    settings.showMagicWandBtn = true;
  }

  return settings;
}

function getMagicMenuContainer() {
  return $('#extensionsMenu, #extensions-menu, #extensions_settings, #extensions-settings, .extensionsMenu, .extensions-menu, #rm_extension_settings .list-group, #rm_extensions_block .list-group').first();
}

function createMagicWandMenuIfPossible() {
  if ($(`#${MAGIC_MENU_ID}`).length > 0) return true;

  const $container = getMagicMenuContainer();
  if ($container.length === 0) return false;

  const menuItemHtml = `
      <div id="${MAGIC_MENU_ID}" class="list-group-item flex-container flexGap5" title="Mở Đồng bộ Sổ thế giới">
          <i data-lucide="book-open" class="fa-fw"></i>
          <span>Đồng bộ Sổ thế giới</span>
      </div>
  `;
  $container.append(menuItemHtml);
  $(`#${MAGIC_MENU_ID}`).on('click', () => {
    showPopup();
  });

  return true;
}

function initMagicWandMenu() {
  if (magicMenuRetryTimer) return;

  magicMenuRetryCount = 0;
  magicMenuRetryTimer = setInterval(() => {
    const created = createMagicWandMenuIfPossible();
    magicMenuRetryCount++;

    if (created || magicMenuRetryCount > 20) {
      clearInterval(magicMenuRetryTimer);
      magicMenuRetryTimer = null;
    }
  }, 500);
}

export function loadSettings() {
  if (!$showMagicWandBtn) {
    $showMagicWandBtn = $('#st-multitool-setting-show-magic-wand-btn');
    $showQrBtn = $('#st-multitool-setting-show-qr-btn');
    $defaultCollapseBtn = $('#st-multitool-setting-default-collapse');
    $manageWbCollapsedBtn = $('#st-multitool-setting-manage-wb-collapsed');
    $manageScriptCollapsedBtn = $('#st-multitool-setting-manage-script-collapsed');
    $manageRegexCollapsedBtn = $('#st-multitool-setting-manage-regex-collapsed');
  }

  const rawSettings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
  const settings = normalizeSettings(rawSettings);

  // Persist normalized settings so broken legacy values are auto-repaired.
  if (JSON.stringify(rawSettings) !== JSON.stringify(settings)) {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }

  $showMagicWandBtn.prop('checked', settings.showMagicWandBtn);
  $showQrBtn.prop('checked', settings.showQrBtn);
  $defaultCollapseBtn.prop('checked', settings.defaultCollapse);
  $manageWbCollapsedBtn.prop('checked', settings.manageWbCollapsed);
  $manageScriptCollapsedBtn.prop('checked', settings.manageScriptCollapsed);
  $manageRegexCollapsedBtn.prop('checked', settings.manageRegexCollapsed);
  applySettings(settings);
}

export function saveSettings(event) {
  const $changedCheckbox = $(event.target);
  const settings = normalizeSettings({
    showMagicWandBtn: $showMagicWandBtn.is(':checked'),
    showQrBtn: $showQrBtn.is(':checked'),
    defaultCollapse: $defaultCollapseBtn.is(':checked'),
    manageWbCollapsed: $manageWbCollapsedBtn.is(':checked'),
    manageScriptCollapsed: $manageScriptCollapsedBtn.is(':checked'),
    manageRegexCollapsed: $manageRegexCollapsedBtn.is(':checked'),
  });

  if (!settings.showMagicWandBtn && !settings.showQrBtn) {
    toastr.warning('Cần giữ lại ít nhất một lối vào tiện ích!');
    $changedCheckbox.prop('checked', true);
    return;
  }

  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  applySettings(settings);
  toastr.success('Đã lưu cài đặt!');
}

export function isDefaultCollapse() {
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
  return settings.defaultCollapse !== false;
}

export function isManageWbCollapsed() {
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
  return settings.manageWbCollapsed === true;
}

export function isManageScriptCollapsed() {
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
  return settings.manageScriptCollapsed === true;
}

export function isManageRegexCollapsed() {
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
  return settings.manageRegexCollapsed === true;
}

export function applySettings(settings) {
  const normalized = normalizeSettings(settings);

  if (normalized.showMagicWandBtn) {
    if (!createMagicWandMenuIfPossible()) {
      initMagicWandMenu();
    }
    $(`#${MAGIC_MENU_ID}`).show();
  } else {
    $(`#${MAGIC_MENU_ID}`).hide();
  }

  $('#st-multitool-qr-menu-item').toggle(normalized.showQrBtn);
}

export function initQrMenu() {
  const qrMenuId = 'st-multitool-qr-menu-item';
  let qrRetryCount = 0;
  const qrInterval = setInterval(() => {
      if ($(`#${qrMenuId}`).length > 0) {
          clearInterval(qrInterval);
          return;
      }

      const $qrBar = $('#quick-reply-btns, .qr--button-row, #qr--button-row, #script-buttons-container, .script-buttons-container').first();

      if ($qrBar.length > 0) {
          const qrItemHtml = `
              <div id="${qrMenuId}" class="menu_button qr--button" title="Mở Đồng bộ Sổ thế giới" style="cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; margin-right: 5px; background: rgba(255,255,255,0.1); border-radius: 5px;">
                  <i data-lucide="book-open"></i>
              </div>
          `;
          $qrBar.append(qrItemHtml);
          $(`#${qrMenuId}`).on('click', () => {
              showPopup();
          });
          const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
          $(`#${qrMenuId}`).toggle(settings.showQrBtn !== false);
          clearInterval(qrInterval);
      } else {
          qrRetryCount++;
          if (qrRetryCount > 20) {
              clearInterval(qrInterval);
              const $sendTextarea = $('#send_textarea, #user_input').first();
              if ($sendTextarea.length > 0) {
                   const qrItemHtml = `
                      <div id="${qrMenuId}" class="menu_button" title="Mở Đồng bộ Sổ thế giới" style="cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; margin-bottom: 5px; background: rgba(255,255,255,0.1); border-radius: 5px;">
                          <i data-lucide="book-open"></i>
                      </div>
                  `;
                  $sendTextarea.parent().prepend(qrItemHtml);
                  $(`#${qrMenuId}`).on('click', () => {
                      showPopup();
                  });
                  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
                  $(`#${qrMenuId}`).toggle(settings.showQrBtn !== false);
              }
          }
      }
  }, 500);
}
