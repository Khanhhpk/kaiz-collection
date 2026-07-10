import { initEntries } from "./features/entries.js";
import { initScripts } from "./features/scripts.js";
import { initSettings } from "./features/settings.js";
import { initSync } from "./features/sync.js";
import { initWorldbook, handleCreateWorldbook } from "./features/worldbook.js";
import { initPresets } from "./features/presets.js";
import { populateSyncWorldbooks } from "./features/sync.js";
import { initManageWorldbook, renderManageWorldbookList } from "./features/manage-worldbook.js";
import { initManageScripts, renderManageScriptLists } from "./features/manage-scripts.js";
import { initManageRegex, renderManageRegexLists } from "./features/manage-regex.js";
import {
  closePopup,
  elements,
  initUIElements,
  showMainView,
  showSubView,
  showPopup,
} from "./ui.js";

const MODULE_NAME = "Đồng bộ Sổ thế giới";
const extensionBaseUrl = new URL("../", import.meta.url);

export const STORAGE_KEY_TAG_START = "st-multitool-tag-start-val";
export const STORAGE_KEY_TAG_END = "st-multitool-tag-end-val";

async function init() {
  try {
    const html = await $.get(new URL("panel.html", extensionBaseUrl).href);
    $("body").append(html);
    $("head").append(`<link rel="stylesheet" href="${new URL("style.css?v=" + Date.now(), extensionBaseUrl).href}">`);
    $("head").append('<script src="https://unpkg.com/lucide@latest"></script>');

    initUIElements();

    $("#st-multitool-popup-close-button").on("click touchend", closePopup);
    $("#st-multitool-popup-back-btn").on("click touchend", showMainView);
    elements.overlay.on("click", function (e) {
      if (e.target === this) closePopup();
    });
    $("#st-multitool-popup").on("click", (e) => e.stopPropagation());

    const stMultitoolBtnConfig = {
        id: 'st_multitool',
        label: 'ST Multitool',
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
        color: 'linear-gradient(135deg, #00e6b8 0%, #00b38f 100%)',
        order: 15,
        onClick: showPopup
    };
    
    const win = window.parent || window;
    if (win.FloatingMenuManager) {
        win.FloatingMenuManager.registerButton(stMultitoolBtnConfig);
    } else {
        win._fmmPendingRegistrations = win._fmmPendingRegistrations || [];
        win._fmmPendingRegistrations.push(stMultitoolBtnConfig);
    }


    $("#st-multitool-popup").on(
      "click",
      ".st-multitool-section-header:has(.st-multitool-collapse-icon)",
      function () {
        const $content = $(this)
          .closest(".st-multitool-section")
          .find(".st-multitool-section-content");
        const $icon = $(this).find(".st-multitool-collapse-icon");
        if ($content.is(":visible")) {
          $content.slideUp(200);
          $icon.replaceWith(`<i data-lucide="chevron-down" class="st-multitool-collapse-icon"></i>`);
          if (window.lucide) window.lucide.createIcons();
        } else {
          $content.slideDown(200);
          $icon.replaceWith(`<i data-lucide="chevron-up" class="st-multitool-collapse-icon"></i>`);
          if (window.lucide) window.lucide.createIcons();
        }
      },
    );

    $("#st-multitool-select-book-btn").on("click", () =>
      showSubView("st-multitool-select-view"),
    );
    $("#st-multitool-load-preset-btn").on("click", () =>
      $("#st-multitool-preset-list-container").slideToggle(),
    );
    $("#st-multitool-goto-delete-btn").on("click", () =>
      showSubView("st-multitool-delete-view"),
    );
    $("#st-multitool-goto-modify-btn").on("click", () =>
      showSubView("st-multitool-modify-view"),
    );
    $("#st-multitool-goto-transfer-btn").on("click", () =>
      showSubView("st-multitool-transfer-view"),
    );
    $("#st-multitool-goto-duplicate-btn").on("click", () =>
      showSubView("st-multitool-duplicate-view"),
    );
    $("#st-multitool-goto-rename-btn").on("click", () =>
      showSubView("st-multitool-rename-view"),
    );
    $("#st-multitool-goto-frontend-btn").on("click", () =>
      showSubView("st-multitool-frontend-view"),
    );
    $("#st-multitool-goto-script-sync-btn").on("click", () =>
      showSubView("st-multitool-script-sync-view"),
    );
    $("#st-multitool-goto-create-regex-btn").on("click", () =>
      showSubView("st-multitool-create-regex-view"),
    );
    $("#st-multitool-goto-create-script-btn").on("click", () =>
      showSubView("st-multitool-create-script-view"),
    );
    $("#st-multitool-goto-settings-btn").on("click", () =>
      showSubView("st-multitool-settings-view"),
    );
    $("#st-multitool-goto-sync-btn").on("click", () =>
      showSubView("st-multitool-sync-view"),
    );
    $("#st-multitool-goto-manage-wb-btn").on("click", () =>
      showSubView("st-multitool-manage-wb-view"),
    );
    $("#st-multitool-goto-manage-script-btn").on("click", () =>
      showSubView("st-multitool-manage-script-view"),
    );
    $("#st-multitool-goto-manage-regex-btn").on("click", () =>
      showSubView("st-multitool-manage-regex-view"),
    );

    $("#st-multitool-create-wb-btn").on("click", () => handleCreateWorldbook());

    $("#st-multitool-sync-create-wb-btn").on("click", () =>
      handleCreateWorldbook(async (newName) => {
        await populateSyncWorldbooks();
        $("#st-multitool-target-wb").val(newName);
      }),
    );

    const $tagStart = $("#st-multitool-tag-start");
    const $tagEnd = $("#st-multitool-tag-end");

    const savedTagStart = localStorage.getItem(STORAGE_KEY_TAG_START);
    const savedTagEnd = localStorage.getItem(STORAGE_KEY_TAG_END);
    if (savedTagStart) $tagStart.val(savedTagStart);
    if (savedTagEnd) $tagEnd.val(savedTagEnd);

    $tagStart.on("change input", function () {
      localStorage.setItem(STORAGE_KEY_TAG_START, $(this).val());
    });
    $tagEnd.on("change input", function () {
      localStorage.setItem(STORAGE_KEY_TAG_END, $(this).val());
    });

    initEntries();
    initScripts();
    initSettings();
    initSync();
    initWorldbook();
    initPresets();
    initManageWorldbook();
    initManageScripts();
    initManageRegex();

    showMainView();
    console.log(`[${MODULE_NAME}] Khởi tạo hoàn tất`);
  } catch (e) {
    console.error(`[${MODULE_NAME}] Khởi tạo thất bại:`, e);
  }
}

init();
