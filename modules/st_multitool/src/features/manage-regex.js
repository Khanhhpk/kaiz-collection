import { escapeHtml, refreshIcons } from '../utils.js';
import { isManageRegexCollapsed } from './settings.js';
import { getTavernRegexes, updateTavernRegexesWith } from '../api.js';
import { initRegexAgencyUI, openRegexAgencyPanel } from '../ai/core/regex-agency-ui.js';
import { normalizeRegexAttributes } from '../ai/providers/regex-provider.js';

let $manageRegexGlobalList;
let $manageRegexPresetList;
let $manageRegexCharacterList;
let $manageRegexEditPanel;
let currentRegexes = [];
let currentRegexId = '';
let currentRegexType = '';
let renderDebounceTimer = null;
let liveTestDebounceTimer = null;
export let _cachedAllRegexes = { global: [], preset: [], character: [] };
let _originalRegexSnapshot = null;

export function initManageRegex() {
  $manageRegexGlobalList = $('#st-multitool-manage-regex-global-list');
  $manageRegexPresetList = $('#st-multitool-manage-regex-preset-list');
  $manageRegexCharacterList = $('#st-multitool-manage-regex-character-list');
  $manageRegexEditPanel = $('#st-multitool-manage-regex-edit-panel');
  try { initRegexAgencyUI(); } catch (e) { console.warn('[ST Multitool] initRegexAgencyUI warning:', e); }

  $('#st-multitool-manage-regex-save-all-btn').off('click').on('click', saveAllRegexesToST);
  $('#st-multitool-manage-regex-reset-all-btn').off('click').on('click', () => {
    if (!confirm('Xác nhận hoàn tác tất cả các thay đổi trong Sandbox về trạng thái gốc của SillyTavern?')) return;
    restoreOriginalRegexSnapshot();
  });

  let currentRegexImportTarget = 'global';
  $('#st-multitool-manage-regex-import-btn').off('click').on('click', () => {
    $('#st-multitool-manage-regex-import-drawer').slideToggle(150);
  });
  $('#st-multitool-manage-regex-import-global-btn').off('click').on('click', () => {
    currentRegexImportTarget = 'global';
    $('#st-multitool-manage-regex-file-input').click();
  });
  $('#st-multitool-manage-regex-import-preset-btn').off('click').on('click', () => {
    currentRegexImportTarget = 'preset';
    $('#st-multitool-manage-regex-file-input').click();
  });
  $('#st-multitool-manage-regex-import-character-btn').off('click').on('click', () => {
    currentRegexImportTarget = 'character';
    $('#st-multitool-manage-regex-file-input').click();
  });

  $('#st-multitool-manage-regex-file-input').off('change').on('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = JSON.parse(evt.target.result);
        const tavernRegex = data.id ? data : {
          id: data.id || ('regex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
          script_name: data.scriptName || data.script_name || data.name || 'Regex chưa có tên',
          enabled: data.disabled !== undefined ? !data.disabled : (data.enabled !== false),
          find_regex: data.findRegex || data.find_regex || '<Mở bảng điều khiển>',
          replace_string: data.replaceString || data.replace_string || data.content || '',
          trim_strings: Array.isArray(data.trimStrings) ? data.trimStrings.join('\n') : (data.trim_strings || ''),
          source: data.source || {
            user_input: false,
            ai_output: true,
            slash_command: false,
            world_info: false,
            reasoning: false,
          },
          destination: data.destination || {
            display: true,
            prompt: false,
          },
          run_on_edit: data.runOnEdit || data.run_on_edit || false,
          min_depth: data.minDepth || data.min_depth || null,
          max_depth: data.maxDepth || data.max_depth || null,
        };
        normalizeRegexAttributes(tavernRegex);
        importRegexToSandbox(tavernRegex, currentRegexImportTarget);
        $('#st-multitool-manage-regex-import-drawer').slideUp(150);
      } catch (err) {
        toastr.error('Nhập tệp Regex thất bại: ' + err.message);
      }
      $('#st-multitool-manage-regex-file-input').val('');
    };
    reader.readAsText(file);
  });

  $('#st-multitool-manage-regex-save-btn').off('click').on('click', handleSaveRegex);
  $('#st-multitool-manage-regex-cancel-btn').off('click').on('click', hideRegexEditPanel);
  $('#st-multitool-manage-regex-render-btn').off('click').on('click', handleRenderToFrontend);


  $('#st-multitool-manage-regex-view').on('click', '.st-multitool-add-regex-btn', function(e) {
    e.stopPropagation();
    openNewRegexEditPanel($(this).data('regex-type') || 'global');
  });

  $('#st-multitool-manage-regex-test-btn').on('click', function() {
    $('#st-multitool-manage-regex-tester-box').slideToggle(150, function() {
      if ($(this).is(':visible')) runLiveRegexTest();
    });
  });

  $('#st-multitool-manage-regex-tester-close').on('click', function() {
    $('#st-multitool-manage-regex-tester-box').slideUp(150);
  });

  // ─── AI Agency Regex Handlers ───
  $('#st-multitool-regex-ai-agency-toggle-btn, #st-multitool-regex-ai-agency-toggle-btn-inline').off('click').on('click', function() {
    initRegexAgencyUI();
    const $view = $('#st-multitool-manage-regex-view');
    $view.toggleClass('ai-agency-active');
    if ($view.hasClass('ai-agency-active')) {
      populateRegexAgencyDropdown();
      $('#st-multitool-regex-ai-agency-toggle-btn, #st-multitool-regex-ai-agency-toggle-btn-inline').css('background', 'linear-gradient(135deg, rgba(192,132,252,0.35), rgba(56,189,248,0.35))');
    } else {
      $('#st-multitool-regex-ai-agency-toggle-btn, #st-multitool-regex-ai-agency-toggle-btn-inline').css('background', 'linear-gradient(135deg, rgba(192,132,252,0.18), rgba(56,189,248,0.18))');
    }
  });

  $('#st-multitool-regex-agency-close-btn').off('click').on('click', function() {
    $('#st-multitool-manage-regex-view').removeClass('ai-agency-active');
    $('#st-multitool-regex-ai-agency-toggle-btn, #st-multitool-regex-ai-agency-toggle-btn-inline').css('background', 'linear-gradient(135deg, rgba(192,132,252,0.18), rgba(56,189,248,0.18))');
  });

  $('#st-multitool-send-to-regex-agency-btn').off('click').on('click', function() {
    initRegexAgencyUI();
    const $view = $('#st-multitool-manage-regex-view');
    $view.addClass('ai-agency-active');
    $('#st-multitool-regex-ai-agency-toggle-btn').css('background', 'linear-gradient(135deg, rgba(192,132,252,0.35), rgba(56,189,248,0.35))');
    populateRegexAgencyDropdown(currentRegexId);
    toastr.info('Đã tải Regex "' + ($('#st-multitool-manage-regex-script-name').val() || currentRegexId) + '" vào Trợ lý AI Agency bên tab side!');
  });


  $('#st-multitool-regex-agency-refresh-targets').on('click', function() {
    populateRegexAgencyDropdown($('#st-multitool-regex-agency-target-select').val());
    toastr.success('Đã làm mới danh sách Regex mục tiêu cho AI Agency!');
  });

  $('#st-multitool-regex-agency-target-select').on('change', function() {
    updateTargetRegexInfo();
  });

  $('#st-multitool-manage-regex-test-input, #st-multitool-manage-regex-find-regex, #st-multitool-manage-regex-replace-string').on('input change', function() {
    if ($('#st-multitool-manage-regex-tester-box').is(':visible')) {
      if (liveTestDebounceTimer) clearTimeout(liveTestDebounceTimer);
      liveTestDebounceTimer = setTimeout(() => {
        runLiveRegexTest();
      }, 250);
    }
  });

  $('#st-multitool-manage-regex-view').on('click', '.st-multitool-manage-script-card-header', function() {
    const targetId = $(this).data('target');
    if (targetId && targetId.startsWith('st-multitool-manage-regex')) {
      const $card = $(this).closest('.st-multitool-manage-script-card');
      $card.toggleClass('collapsed');
      const isCollapsed = $card.hasClass('collapsed');
      localStorage.setItem(`st-multitool-regex-card-${targetId}`, isCollapsed ? 'collapsed' : 'expanded');
    }
  });

  restoreRegexCardStates();

  $('#st-multitool-manage-regex-view').on('click', '.st-multitool-manage-regex-item', function(e) {
    if ($(e.target).hasClass('st-multitool-manage-regex-enabled') || 
        $(e.target).closest('.st-multitool-manage-regex-actions').length) {
      return;
    }
    const regexId = $(this).data('regex-id');
    const type = $(this).closest('.st-multitool-manage-script-card-content').attr('id').replace('st-multitool-manage-regex-', '').replace('-list', '');
    openRegexEditPanel(regexId, type);
  });

  $('#st-multitool-manage-regex-view').on('change', '.st-multitool-manage-regex-enabled', function(e) {
    e.stopPropagation();
    const regexId = $(this).closest('.st-multitool-manage-regex-item').data('regex-id');
    const isEnabled = $(this).is(':checked');
    const type = $(this).closest('.st-multitool-manage-script-card-content').attr('id').replace('st-multitool-manage-regex-', '').replace('-list', '');
    toggleRegexEnabled(regexId, type, isEnabled);
  });

  $('#st-multitool-manage-regex-view').on('click', '.st-multitool-manage-regex-delete', function(e) {
    e.stopPropagation();
    const regexId = $(this).closest('.st-multitool-manage-regex-item').data('regex-id');
    const type = $(this).closest('.st-multitool-manage-script-card-content').attr('id').replace('st-multitool-manage-regex-', '').replace('-list', '');
    deleteRegex(regexId, type);
  });

  $('#st-multitool-manage-regex-view').on('click', '.st-multitool-manage-regex-download', function(e) {
    e.stopPropagation();
    const regexId = $(this).closest('.st-multitool-manage-regex-item').data('regex-id');
    const type = $(this).closest('.st-multitool-manage-script-card-content').attr('id').replace('st-multitool-manage-regex-', '').replace('-list', '');
    downloadRegex(regexId, type);
  });

  $('#st-multitool-manage-regex-disabled').on('change', function() {
    $('#st-multitool-manage-regex-enabled').prop('checked', !$(this).is(':checked'));
  });

  $('#st-multitool-manage-regex-enabled').on('change', function() {
    $('#st-multitool-manage-regex-disabled').prop('checked', !$(this).is(':checked'));
  });
}

function runLiveRegexTest() {
  const input = $('#st-multitool-manage-regex-test-input').val();
  const patternRaw = $('#st-multitool-manage-regex-find-regex').val();
  const replaceStr = $('#st-multitool-manage-regex-replace-string').val() || '';
  const $output = $('#st-multitool-manage-regex-test-output');
  if (!input || !patternRaw) {
    $output.val('');
    return;
  }
  try {
    let regexObj;
    const match = patternRaw.match(/^\/(.*?)\/([gimsuy]*)$/);
    if (match) {
      regexObj = new RegExp(match[1], match[2] || 'g');
    } else {
      regexObj = new RegExp(patternRaw, 'g');
    }
    const result = input.replace(regexObj, replaceStr);
    $output.val(result);
  } catch (err) {
    $output.val('⚠️ Lỗi cú pháp Regex: ' + err.message);
  }
}

function debouncedRender() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
  renderDebounceTimer = setTimeout(() => {
    renderManageRegexLists();
  }, 100);
}

export async function renderManageRegexLists(forceFetch = false) {
  try {
    if (forceFetch || !_originalRegexSnapshot) {
      const [globalRegexes, presetRegexes, characterRegexes] = await Promise.all([
        getTavernRegexes({ type: 'global' }).catch(() => []),
        getTavernRegexes({ type: 'preset', name: 'in_use' }).catch(() => []),
        getTavernRegexes({ type: 'character', name: 'current' }).catch(() => [])
      ]);

      _cachedAllRegexes = {
        global: (globalRegexes ? JSON.parse(JSON.stringify(globalRegexes)) : []).map(normalizeRegexAttributes),
        preset: (presetRegexes ? JSON.parse(JSON.stringify(presetRegexes)) : []).map(normalizeRegexAttributes),
        character: (characterRegexes ? JSON.parse(JSON.stringify(characterRegexes)) : []).map(normalizeRegexAttributes)
      };
      _originalRegexSnapshot = JSON.parse(JSON.stringify(_cachedAllRegexes));
    }

    renderCachedRegexLists();
  } catch (e) {
    console.error('Tải regex thất bại:', e);
    $manageRegexGlobalList.html('<div class="st-multitool-empty-msg">Tải thất bại</div>');
    $manageRegexPresetList.html('<div class="st-multitool-empty-msg">Tải thất bại</div>');
    $manageRegexCharacterList.html('<div class="st-multitool-empty-msg">Tải thất bại</div>');
  }
}

export function renderCachedRegexLists() {
  populateRegexAgencyDropdown();
  renderRegexList($manageRegexGlobalList, _cachedAllRegexes.global || [], 'global');
  renderRegexList($manageRegexPresetList, _cachedAllRegexes.preset || [], 'preset');
  renderRegexList($manageRegexCharacterList, _cachedAllRegexes.character || [], 'character');
}

function renderRegexList($container, regexes, type) {
  if (regexes.length === 0) {
    $container.html('<div class="st-multitool-empty-msg">Không có regex.</div>');
    return;
  }

  const fragment = document.createDocumentFragment();
  regexes.forEach(regex => {
    const div = document.createElement('div');
    div.className = 'st-multitool-manage-regex-item';
    div.setAttribute('data-regex-id', regex.id);
    div.style.cssText = 'display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; justify-content: space-between !important; padding: 12px 14px !important; background: rgba(15, 23, 42, 0.75) !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 8px !important; margin-bottom: 8px !important; gap: 12px !important; overflow: visible !important; min-height: 60px !important; height: auto !important;';

    const findPattern = regex.find_regex || '';
    const shortPattern = findPattern.length > 55 ? findPattern.slice(0, 55) + '...' : (findPattern || 'Chưa nhập pattern');
    const scopes = [];
    if (regex.source?.ai_output) scopes.push('<span class="st-multitool-badge" style="background:rgba(14,165,233,0.2);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size:10px;padding:2px 6px;border-radius:4px;">AI Output</span>');
    if (regex.source?.user_input) scopes.push('<span class="st-multitool-badge" style="background:rgba(99,102,241,0.2);color:#818cf8;border:1px solid rgba(129,140,248,0.3);font-size:10px;padding:2px 6px;border-radius:4px;">User In</span>');
    if (regex.source?.slash_command) scopes.push('<span class="st-multitool-badge" style="background:rgba(168,85,247,0.2);color:#c084fc;border:1px solid rgba(192,132,252,0.3);font-size:10px;padding:2px 6px;border-radius:4px;">Command</span>');
    if (regex.destination?.display) scopes.push('<span class="st-multitool-badge" style="background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(52,211,153,0.3);font-size:10px;padding:2px 6px;border-radius:4px;" title="Alter Chat Display (Markdown Only)">Chat Display (Markdown)</span>');
    if (regex.destination?.prompt) scopes.push('<span class="st-multitool-badge" style="background:rgba(236,72,153,0.2);color:#f472b6;border:1px solid rgba(244,114,182,0.3);font-size:10px;padding:2px 6px;border-radius:4px;" title="Alter Outgoing Prompt">Prompt Only</span>');
    if (scopes.length === 0) scopes.push('<span class="st-multitool-badge" style="background:rgba(100,116,139,0.2);color:#94a3b8;font-size:10px;padding:2px 6px;border-radius:4px;">Chưa gán</span>');

    div.innerHTML = `
      <div class="st-multitool-manage-regex-info" style="display:flex !important;flex-direction:column !important;align-items:flex-start !important;gap:6px !important;flex:1 1 auto !important;min-width:0 !important;overflow:hidden !important;">
        <div style="display:flex;align-items:center;gap:10px;width:100%;max-width:100%;min-width:0;">
          <input type="checkbox" class="st-multitool-manage-regex-enabled" ${regex.enabled !== false ? 'checked' : ''} style="cursor:pointer;flex-shrink:0;width:16px;height:16px;accent-color:#00e6b8;margin:0;">
          <span class="st-multitool-manage-regex-name" style="font-weight:700 !important;font-size:14px !important;color:#f8fafc !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;max-width:100% !important;line-height:1.4 !important;" title="${escapeHtml(regex.script_name || 'Regex chưa có tên')}">${escapeHtml(regex.script_name || 'Regex chưa có tên')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding-left:26px;flex-wrap:wrap;width:100%;">
          <div class="st-multitool-regex-pill" style="font-family:'JetBrains Mono',Consolas,monospace;font-size:11.5px;color:#38bdf8;background:#0b1329;border:1px solid rgba(56,189,248,0.3);padding:2px 8px;border-radius:4px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;" title="${escapeHtml(findPattern)}">${escapeHtml(shortPattern)}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">${scopes.join('')}</div>
        </div>
      </div>
      <div class="st-multitool-manage-regex-actions" style="display:flex !important;flex-direction:row !important;flex-wrap:nowrap !important;align-items:center !important;gap:8px !important;flex:0 0 auto !important;flex-shrink:0 !important;">
        <button class="st-multitool-regex-action-btn st-multitool-manage-regex-download" title="Tải xuống thành JSON" style="background: rgba(14,165,233,0.15); border: 1px solid rgba(56,189,248,0.35); color: #38bdf8; border-radius: 6px; padding: 7px 11px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s ease; cursor: pointer;"><i data-lucide="download" style="width:14px;height:14px;"></i></button>
        <button class="st-multitool-regex-action-btn st-multitool-manage-regex-delete" title="Xóa" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(248,113,113,0.35); color: #f87171; border-radius: 6px; padding: 7px 11px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s ease; cursor: pointer;"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
      </div>
    `;
    fragment.appendChild(div);
  });
  $container.empty().append(fragment);
  refreshIcons($container[0]);
}

async function toggleRegexEnabled(regexId, type, isEnabled) {
  try {
    const list = _cachedAllRegexes[type] || [];
    const item = list.find(r => r.id === regexId);
    if (item) {
      item.enabled = isEnabled;
      item.disabled = !isEnabled;
    }
    toastr.success(isEnabled ? 'Đã bật regex (Sandbox)' : 'Đã tắt regex (Sandbox)');
    markRegexesDirty();
  } catch (e) {
    toastr.error('Cập nhật thất bại: ' + e.message);
    renderCachedRegexLists();
  }
}

async function openNewRegexEditPanel(type) {
  currentRegexId = '__NEW__';
  currentRegexType = type;

  $('#st-multitool-manage-regex-id').val('__NEW__');
  $('#st-multitool-manage-regex-script-name').val('');
  $('#st-multitool-manage-regex-find-regex').val('');
  $('#st-multitool-manage-regex-replace-string').val('');
  $('#st-multitool-manage-regex-trim-strings').val('');

  $('#st-multitool-manage-regex-enabled').prop('checked', true);
  $('#st-multitool-manage-regex-run-on-edit').prop('checked', false);
  $('#st-multitool-manage-regex-substitute-regex').val(0);
  $('#st-multitool-manage-regex-min-depth').val('');
  $('#st-multitool-manage-regex-max-depth').val('');

  $('.st-multitool-manage-regex-placement-cb').prop('checked', false);
  $('.st-multitool-manage-regex-placement-cb[value="2"]').prop('checked', true); // default AI Output

  $('#st-multitool-manage-regex-markdown-only').prop('checked', false);
  $('#st-multitool-manage-regex-prompt-only').prop('checked', false);

  $('#st-multitool-manage-regex-min-depth-container').hide();
  $('#st-multitool-manage-regex-max-depth-container').hide();
  $('#st-multitool-manage-regex-tester-box').hide();
  $('#st-multitool-manage-regex-preview-container').hide();

  $manageRegexEditPanel.removeClass('collapsed');
  $manageRegexEditPanel.find('.st-multitool-section-content').show();
  const $icon = $manageRegexEditPanel.find('.st-multitool-collapse-icon');
  if ($icon.length) {
    $icon.replaceWith('<i data-lucide="chevron-up" class="st-multitool-collapse-icon"></i>');
  }
  $manageRegexEditPanel.show();
  $manageRegexEditPanel.find('.st-multitool-manage-regex-edit-title').text(`+ Thêm Regex mới (${type === 'global' ? 'Toàn cục' : type === 'preset' ? 'Preset' : 'Cục bộ'})`);
  refreshIcons($manageRegexEditPanel[0]);
}

async function openRegexEditPanel(regexId, type) {
  try {
    const regexes = _cachedAllRegexes[type] || [];
    const regex = regexes.find(r => r.id === regexId);

    if (!regex) return;
    normalizeRegexAttributes(regex);

    currentRegexes = regexes;
    currentRegexId = regexId;
    currentRegexType = type;

    $('#st-multitool-manage-regex-script-name').val(regex.script_name || '');
    $('#st-multitool-manage-regex-find-regex').val(regex.find_regex || '');
    $('#st-multitool-manage-regex-replace-string').val(regex.replace_string || '');
    
    let trimStringsArr = regex.trim_strings || [];
    if (!Array.isArray(trimStringsArr) && typeof trimStringsArr === 'string') {
      trimStringsArr = [trimStringsArr];
    }
    $('#st-multitool-manage-regex-trim-strings').val(Array.isArray(trimStringsArr) ? trimStringsArr.join('\n') : '');

    $('#st-multitool-manage-regex-disabled').prop('checked', regex.disabled === true || regex.enabled === false);
    $('#st-multitool-manage-regex-enabled').prop('checked', regex.enabled !== false && regex.disabled !== true);
    let subVal = 0;
    if (typeof regex.substitute_regex === 'boolean') {
      subVal = regex.substitute_regex ? 1 : 0;
    } else if (regex.substitute_regex !== null && regex.substitute_regex !== undefined) {
      subVal = parseInt(regex.substitute_regex, 10) || 0;
    }
    $('#st-multitool-manage-regex-substitute-regex').val(String(subVal));
    $('#st-multitool-manage-regex-min-depth').val(regex.min_depth || '');
    $('#st-multitool-manage-regex-max-depth').val(regex.max_depth || '');

    $('.st-multitool-manage-regex-placement-cb').prop('checked', false);
    if (regex.source) {
      $('.st-multitool-manage-regex-placement-cb[value="1"]').prop('checked', regex.source.user_input);
      $('.st-multitool-manage-regex-placement-cb[value="2"]').prop('checked', regex.source.ai_output);
      $('.st-multitool-manage-regex-placement-cb[value="4"]').prop('checked', regex.source.slash_command);
      $('.st-multitool-manage-regex-placement-cb[value="3"]').prop('checked', regex.source.world_info);
      $('.st-multitool-manage-regex-placement-cb[value="5"]').prop('checked', regex.source.reasoning);
    }

    $('#st-multitool-manage-regex-markdown-only').prop('checked', regex.destination ? regex.destination.display : false);
    $('#st-multitool-manage-regex-prompt-only').prop('checked', regex.destination ? regex.destination.prompt : false);

    $('#st-multitool-manage-regex-min-depth-container').css('display', 'flex');
    $('#st-multitool-manage-regex-max-depth-container').css('display', 'flex');
    $('#st-multitool-manage-regex-tester-box').hide();
    $('#st-multitool-manage-regex-preview-container').hide();

    $manageRegexEditPanel.removeClass('collapsed');
    $manageRegexEditPanel.find('.st-multitool-section-content').show();
    const $icon = $manageRegexEditPanel.find('.st-multitool-collapse-icon');
    if ($icon.length) {
      $icon.replaceWith('<i data-lucide="chevron-up" class="st-multitool-collapse-icon"></i>');
    }
    $manageRegexEditPanel.show();
    $manageRegexEditPanel.find('.st-multitool-manage-regex-edit-title').text(`Sửa regex ${type === 'global' ? 'Toàn cục' : type === 'preset' ? 'Preset' : 'Cục bộ'}`);
    refreshIcons($manageRegexEditPanel[0]);
  } catch (e) {
    toastr.error('Tải regex thất bại: ' + e.message);
  }
}

function hideRegexEditPanel() {
  $manageRegexEditPanel.hide();
  $manageRegexEditPanel.removeClass('collapsed');
  $manageRegexEditPanel.find('.st-multitool-section-content').show();
  currentRegexId = '';
  currentRegexType = '';
}

async function handleSaveRegex() {
  if (!currentRegexId || !currentRegexType) return;

  try {
    const trimRaw = $('#st-multitool-manage-regex-trim-strings').val() || '';
    const regexData = normalizeRegexAttributes({
      script_name: $('#st-multitool-manage-regex-script-name').val() || 'Regex mới',
      find_regex: $('#st-multitool-manage-regex-find-regex').val() || '',
      replace_string: $('#st-multitool-manage-regex-replace-string').val() || '',
      trim_strings: trimRaw.split('\n').map(s => s.trim()).filter(s => s !== ''),
      disabled: $('#st-multitool-manage-regex-disabled').is(':checked'),
      enabled: $('#st-multitool-manage-regex-enabled').is(':checked'),
      run_on_edit: $('#st-multitool-manage-regex-run-on-edit').is(':checked'),
      substitute_regex: parseInt($('#st-multitool-manage-regex-substitute-regex').val()) || 0,
      min_depth: $('#st-multitool-manage-regex-min-depth').val() !== '' ? parseInt($('#st-multitool-manage-regex-min-depth').val()) : null,
      max_depth: $('#st-multitool-manage-regex-max-depth').val() !== '' ? parseInt($('#st-multitool-manage-regex-max-depth').val()) : null,
      source: {
        user_input: $('.st-multitool-manage-regex-placement-cb[value="1"]').is(':checked'),
        ai_output: $('.st-multitool-manage-regex-placement-cb[value="2"]').is(':checked'),
        slash_command: $('.st-multitool-manage-regex-placement-cb[value="4"]').is(':checked'),
        world_info: $('.st-multitool-manage-regex-placement-cb[value="3"]').is(':checked'),
        reasoning: $('.st-multitool-manage-regex-placement-cb[value="5"]').is(':checked'),
      },
      destination: {
        display: $('#st-multitool-manage-regex-markdown-only').is(':checked'),
        prompt: $('#st-multitool-manage-regex-prompt-only').is(':checked'),
      }
    });

    const targetList = _cachedAllRegexes[currentRegexType] || [];
    if (currentRegexId === '__NEW__') {
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'regex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      targetList.push({
        id: newId,
        ...regexData
      });
    } else {
      const regex = targetList.find(r => r.id === currentRegexId);
      if (regex) {
        Object.assign(regex, regexData);
      } else {
        targetList.push({
          id: currentRegexId,
          ...regexData
        });
      }
    }

    toastr.success('Đã cập nhật vào Sandbox! Nhấn "Lưu tất cả Regex" trên thanh công cụ để lưu vào SillyTavern.');
    hideRegexEditPanel();
    renderCachedRegexLists();
    markRegexesDirty();
  } catch (e) {
    toastr.error('Cập nhật thất bại: ' + e.message);
  }
}

export function restoreRegexCardStates() {
  try {
    const cards = [
      'st-multitool-manage-regex-global-list',
      'st-multitool-manage-regex-preset-list',
      'st-multitool-manage-regex-character-list'
    ];

    const defaultCollapsed = isManageRegexCollapsed();
    const jq = typeof window !== 'undefined' && (window.jQuery || window.$) ? (window.jQuery || window.$) : (typeof $ === 'function' ? $ : null);
    if (!jq || typeof jq !== 'function') return;

    cards.forEach(cardId => {
      const savedState = localStorage.getItem(`st-multitool-regex-card-${cardId}`);
      const $header = jq(`.st-multitool-manage-script-card-header[data-target="${cardId}"]`);
      if (!$header || typeof $header.closest !== 'function') return;
      const $card = $header.closest('.st-multitool-manage-script-card');
      if (!$card || typeof $card.addClass !== 'function') return;
      if (savedState === 'collapsed' || (savedState === null && defaultCollapsed)) {
        $card.addClass('collapsed');
      } else {
        $card.removeClass('collapsed');
      }
    });
  } catch (err) {
    console.warn('[ST Multitool] restoreRegexCardStates non-fatal error:', err);
  }
}

function handleRenderToFrontend() {
  const $container = $('#st-multitool-manage-regex-preview-container');
  const $btn = $('#st-multitool-manage-regex-render-btn');

  if ($container.is(':visible')) {
    $container.empty().hide();
    $btn.html('<i data-lucide="eye"></i> Render');
    refreshIcons($btn[0]);
    return;
  }

  let htmlContent = $('#st-multitool-manage-regex-replace-string').val();
  if (!htmlContent) {
    toastr.warning('Không có nội dung để render');
    return;
  }

  htmlContent = htmlContent.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '');

  const iframe = $('<iframe>', {
    srcdoc: htmlContent,
    style: 'width: 100%; height: 400px; border: none;',
  });
  $container.empty().append(iframe).show();
  $btn.html('🙈 Hủy render');
}

async function deleteRegex(regexId, type) {
  if (!confirm('Xác nhận xóa regex này khỏi Sandbox?')) return;

  try {
    if (_cachedAllRegexes[type]) {
      _cachedAllRegexes[type] = _cachedAllRegexes[type].filter(r => r.id !== regexId);
    }

    toastr.success('Đã xóa khỏi Sandbox (Chưa lưu SillyTavern)');
    renderCachedRegexLists();
    if (currentRegexId === regexId) hideRegexEditPanel();
    markRegexesDirty();
  } catch (e) {
    toastr.error('Xóa thất bại: ' + e.message);
  }
}

async function downloadRegex(regexId, type) {
  try {
    const list = _cachedAllRegexes[type] || [];
    const regex = list.find(r => r.id === regexId);
    if (!regex) return toastr.error('Không tìm thấy regex');

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(regex, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `regex-${regex.script_name || 'Regex chưa có tên'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  } catch (e) {
    toastr.error('Tải xuống thất bại: ' + e.message);
  }
}

export function markRegexesDirty() {
  const $saveBtn = $('#st-multitool-manage-regex-save-all-btn');
  if ($saveBtn.length) {
    $saveBtn.html('<i data-lucide="save"></i> Lưu tất cả Regex (Chưa lưu ST)');
    $saveBtn.css('background', 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)');
    $saveBtn.css('color', '#1e293b');
    refreshIcons($saveBtn[0]);
  }
}

export async function saveAllRegexesToST() {
  const $saveBtn = $('#st-multitool-manage-regex-save-all-btn');
  const oldHtml = $saveBtn.html();
  $saveBtn.html('<i data-lucide="loader" class="st-multitool-spin"></i> Đang lưu...').prop('disabled', true);

  try {
    const scopes = ['global', 'preset', 'character'];
    let savedCount = 0;

    for (const scope of scopes) {
      let targetOpt = { type: scope };
      if (scope === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
      if (scope === 'character') targetOpt = { type: 'character', name: 'current' };

      const scopeList = _cachedAllRegexes[scope] || [];
      const origList = _originalRegexSnapshot?.[scope] || [];
      const isModified = !(_originalRegexSnapshot && JSON.stringify(scopeList) === JSON.stringify(origList));

      if (scope === 'character') {
        const isCharacterSelected = typeof SillyTavern !== 'undefined' && SillyTavern.getContext && SillyTavern.getContext().characterId !== undefined;
        if (!isCharacterSelected) {
          if (isModified) {
            toastr.warning('Lưu ý: Bỏ qua lưu Regex Nhân vật do chưa có Nhân vật nào đang được chọn.');
          } else {
            console.info('[ManageRegex] Bỏ qua lưu scope character (không có nhân vật active và không có thay đổi).');
          }
          continue;
        }
      }

      if ((scope === 'preset' || scope === 'character') && !isModified) {
        console.info(`[ManageRegex] Bỏ qua lưu scope ${scope} do không có thay đổi nào.`);
        continue;
      }

      try {
        await updateTavernRegexesWith(() => {
          return JSON.parse(JSON.stringify(scopeList));
        }, targetOpt);
        savedCount++;
      } catch (err) {
        if (scope === 'character' || scope === 'preset') {
          console.warn(`[ManageRegex] Không thể lưu scope ${scope}:`, err);
          if (isModified) {
            toastr.warning(`Lưu ý: Không thể lưu Regex ${scope === 'character' ? 'Nhân vật' : 'Preset'} (${err.message || 'Chưa kích hoạt'})`);
          }
        } else {
          throw err;
        }
      }
    }

    toastr.success('Đã lưu thành công các Regex thay đổi vào SillyTavern!');
    $saveBtn.html('<i data-lucide="save"></i> Lưu tất cả Regex').prop('disabled', false);
    $saveBtn.css('background', '');
    $saveBtn.css('color', '');
    refreshIcons($saveBtn[0]);

    // Re-fetch to confirm and update original snapshot
    await renderManageRegexLists(true);
  } catch (e) {
    console.error('[ManageRegex] saveAllRegexesToST error:', e);
    toastr.error('Lưu SillyTavern thất bại: ' + e.message);
    $saveBtn.html(oldHtml).prop('disabled', false);
  }
}

export function restoreOriginalRegexSnapshot() {
  if (!_originalRegexSnapshot) {
    renderManageRegexLists(true);
    return;
  }
  _cachedAllRegexes = JSON.parse(JSON.stringify(_originalRegexSnapshot));
  renderCachedRegexLists();

  const $saveBtn = $('#st-multitool-manage-regex-save-all-btn');
  if ($saveBtn.length) {
    $saveBtn.html('<i data-lucide="save"></i> Lưu tất cả Regex');
    $saveBtn.css('background', '');
    $saveBtn.css('color', '');
    refreshIcons($saveBtn[0]);
  }
  toastr.info('Đã hoàn tác (Reset Sandbox về trạng thái ban đầu của SillyTavern)');
}

// ─── AI Agency Regex Assistant Controllers ────────────────────────────────────

export function populateRegexAgencyDropdown(targetSelectId = null) {
  const $select = $('#st-multitool-regex-agency-target-select');
  if (!$select.length) return;

  const currentVal = targetSelectId !== null ? targetSelectId : ($select.val() || '__AUTO__');
  $select.empty();
  $select.append('<option value="__AUTO__">🤖 Regex Agency Tự động (Auto / Global Mode)</option>');
  $select.append('<option value="__NEW__">✨ [+ Tạo Regex mới từ đầu (Create New Regex)]</option>');

  const appendGroup = (list, label, type) => {
    if (!list || !list.length) return;
    const $group = $(`<optgroup label="${label}"></optgroup>`);
    list.forEach(r => {
      const name = r.script_name || 'Không tên';
      const id = r.id || '';
      $group.append(`<option value="${id}" data-type="${type}" data-name="${escapeHtml(name)}">[${type === 'global' ? 'Toàn cục' : type === 'preset' ? 'Preset' : 'Cục bộ'}] ${escapeHtml(name)}</option>`);
    });
    $select.append($group);
  };

  appendGroup(_cachedAllRegexes.global, '🌐 Regex Toàn cục (Global)', 'global');
  appendGroup(_cachedAllRegexes.preset, '📦 Regex Preset', 'preset');
  appendGroup(_cachedAllRegexes.character, '👤 Regex Cục bộ (Character)', 'character');

  $select.val(currentVal);
  if (!$select.val() || $select.val() === null) $select.val('__AUTO__');
  updateTargetRegexInfo();
}

export function updateTargetRegexInfo() {
  const $select = $('#st-multitool-regex-agency-target-select');
  const val = $select.val();
  const $info = $('#st-multitool-regex-agency-target-info');
  if (val === '__AUTO__' || !val) {
    $info.html('<i data-lucide="bot" style="width:14px;height:14px;color:#a855f7;flex-shrink:0;"></i> <span>Chế độ: <b>Tự động toàn quyền</b> (Hoạt động rộng và chung lên toàn bộ Regex hiện có).</span>');
  } else if (val === '__NEW__') {
    $info.html('<i data-lucide="plus-circle" style="width:14px;height:14px;color:#38bdf8;flex-shrink:0;"></i> <span>Chế độ: <b>Tạo Regex mới</b> từ mô tả ngôn ngữ tự nhiên.</span>');
  } else {
    const $opt = $select.find('option:selected');
    const type = $opt.data('type');
    let targetObj = null;
    if (type && _cachedAllRegexes[type]) {
      targetObj = _cachedAllRegexes[type].find(r => r.id === val);
    }
    if (targetObj) {
      $info.html(`<i data-lucide="crosshair" style="width:14px;height:14px;color:#fbbf24;flex-shrink:0;"></i> <span>Tập trung chỉnh sửa: <b>${escapeHtml(targetObj.script_name)}</b> (<code style="color:#00ffd0;">${escapeHtml((targetObj.find_regex || '').substring(0, 45))}${((targetObj.find_regex || '').length > 45 ? '...' : '')}</code>)</span>`);
    } else {
      $info.html('<i data-lucide="crosshair" style="width:14px;height:14px;color:#38bdf8;flex-shrink:0;"></i> <span>Đã chọn Regex mục tiêu ID: ' + escapeHtml(val) + '</span>');
    }
  }
  if (typeof refreshIcons === 'function' && $info[0]) refreshIcons($info[0]);
}

export function importRegexToSandbox(tavernRegex, targetType = 'global') {
  if (!_cachedAllRegexes[targetType]) _cachedAllRegexes[targetType] = [];
  normalizeRegexAttributes(tavernRegex);
  if (!tavernRegex.id) {
    tavernRegex.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'regex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }
  _cachedAllRegexes[targetType].push(tavernRegex);
  markRegexesDirty();
  renderCachedRegexLists();
  toastr.success(`Đã nhập Regex "${tavernRegex.script_name || 'chưa có tên'}" vào Sandbox (${targetType === 'global' ? 'Toàn cục' : targetType === 'preset' ? 'Preset' : 'Cục bộ'}). Nhấn "Lưu tất cả Regex" trên thanh công cụ để lưu chính thức vào SillyTavern!`);
}

export function cleanupManageRegexView() {
  const $view = $('#st-multitool-manage-regex-view');
  $view.removeClass('ai-agency-active');
  $('#st-multitool-regex-ai-agency-toggle-btn, #st-multitool-regex-ai-agency-toggle-btn-inline').css('background', 'linear-gradient(135deg, rgba(192,132,252,0.18), rgba(56,189,248,0.18))');
  hideRegexEditPanel();
  $('#st-multitool-manage-regex-tester-box').hide();
  $('#st-multitool-manage-regex-import-drawer').hide();
}

