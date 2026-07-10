import { showPopup } from '../ui.js';

export const STORAGE_KEY_BUTTON_POS = 'st-multitool-btn-pos';
export const STORAGE_KEY_SETTINGS = 'st-multitool-settings';
const MAGIC_MENU_ID = 'st-multitool-extension-menu-item';

let magicMenuRetryTimer = null;
let magicMenuRetryCount = 0;

let $showFloatingBtn;
let $showMagicWandBtn;
let $showQrBtn;
let $defaultCollapseBtn;
let $manageWbCollapsedBtn;
let $manageScriptCollapsedBtn;
let $manageRegexCollapsedBtn;

export function initSettings() {
  $showFloatingBtn = $('#st-multitool-setting-show-floating-btn');
  $showMagicWandBtn = $('#st-multitool-setting-show-magic-wand-btn');
  $showQrBtn = $('#st-multitool-setting-show-qr-btn');
  $defaultCollapseBtn = $('#st-multitool-setting-default-collapse');
  $manageWbCollapsedBtn = $('#st-multitool-setting-manage-wb-collapsed');
  $manageScriptCollapsedBtn = $('#st-multitool-setting-manage-script-collapsed');
  $manageRegexCollapsedBtn = $('#st-multitool-setting-manage-regex-collapsed');

  $showFloatingBtn
    .on('mousedown', function () {
      $(this).data('last-checked', $(this).is(':checked'));
    })
    .on('change', saveSettings);
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
  initFloatingButton();
  initMagicWandMenu();
  initQrMenu();
}

function normalizeSettings(raw = {}) {
  const settings = {
    showFloatingBtn: raw.showFloatingBtn !== false,
    showMagicWandBtn: raw.showMagicWandBtn !== false,
    showQrBtn: raw.showQrBtn !== false,
    defaultCollapse: raw.defaultCollapse !== false,
    manageWbCollapsed: raw.manageWbCollapsed === true,
    manageScriptCollapsed: raw.manageScriptCollapsed === true,
    manageRegexCollapsed: raw.manageRegexCollapsed === true,
  };

  // Never allow all entry points to be disabled, otherwise users cannot reopen the UI.
  if (!settings.showFloatingBtn && !settings.showMagicWandBtn && !settings.showQrBtn) {
    settings.showFloatingBtn = true;
  }

  return settings;
}

function getMagicMenuContainer() {
  return $('#extensionsMenu, #extensions-menu, #extensions_settings, #extensions-settings, .extensionsMenu, .extensions-menu').first();
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

export function initFloatingButton() {
  const $btn = $('#st-multitool-floating-btn');

  function enforceBounds() {
    if (!$btn.length) return;
    const maxLeft = $(window).width() - $btn.outerWidth();
    const maxTop = $(window).height() - $btn.outerHeight();
    let pos = $btn.position();
    let newLeft = Math.max(0, Math.min(pos.left, maxLeft));
    let newTop = Math.max(0, Math.min(pos.top, maxTop));
    $btn.css({ left: `${newLeft}px`, top: `${newTop}px`, right: 'auto', bottom: 'auto' });
  }

  const savedPos = JSON.parse(localStorage.getItem(STORAGE_KEY_BUTTON_POS));
  if (savedPos) {
    $btn.css({ top: savedPos.top, left: savedPos.left, right: 'auto', bottom: 'auto' });
    setTimeout(enforceBounds, 100);
  } else {
    $btn.css({ bottom: '20px', right: '20px' });
  }

  $(window).on('resize', enforceBounds);

  let isDragging = false,
    offset = { x: 0, y: 0 },
    wasDragged = false;

  $btn.on('mousedown touchstart', e => {
    isDragging = true;
    wasDragged = false;
    const touch = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
    const rect = $btn[0].getBoundingClientRect();
    offset = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  });

  $(document).on('mousemove touchmove', e => {
    if (!isDragging) return;
    wasDragged = true;
    e.preventDefault();
    const touch = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
    let newLeft = touch.clientX - offset.x;
    let newTop = touch.clientY - offset.y;
    const maxLeft = $(window).width() - $btn.outerWidth();
    const maxTop = $(window).height() - $btn.outerHeight();
    $btn.css({
      left: `${Math.max(0, Math.min(newLeft, maxLeft))}px`,
      top: `${Math.max(0, Math.min(newTop, maxTop))}px`,
      right: 'auto',
      bottom: 'auto',
    });
  });

  $(document).on('mouseup touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    localStorage.setItem(STORAGE_KEY_BUTTON_POS, JSON.stringify({ top: $btn.css('top'), left: $btn.css('left') }));
  });

  $btn.on('click', e => {
    if (wasDragged) e.preventDefault();
    else showPopup();
  });
}

export function loadSettings() {
  if (!$showFloatingBtn) {
    $showFloatingBtn = $('#st-multitool-setting-show-floating-btn');
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

  $showFloatingBtn.prop('checked', settings.showFloatingBtn);
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
    showFloatingBtn: $showFloatingBtn.is(':checked'),
    showMagicWandBtn: $showMagicWandBtn.is(':checked'),
    showQrBtn: $showQrBtn.is(':checked'),
    defaultCollapse: $defaultCollapseBtn.is(':checked'),
    manageWbCollapsed: $manageWbCollapsedBtn.is(':checked'),
    manageScriptCollapsed: $manageScriptCollapsedBtn.is(':checked'),
    manageRegexCollapsed: $manageRegexCollapsedBtn.is(':checked'),
  });

  if (!settings.showFloatingBtn && !settings.showMagicWandBtn && !settings.showQrBtn) {
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

  $('#st-multitool-floating-btn').toggle(normalized.showFloatingBtn);

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
