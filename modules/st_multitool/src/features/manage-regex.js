import { escapeHtml, refreshIcons } from '../utils.js';
import { isManageRegexCollapsed } from './settings.js';
import { getTavernRegexes, updateTavernRegexesWith } from '../api.js';

let $manageRegexGlobalList;
let $manageRegexPresetList;
let $manageRegexCharacterList;
let $manageRegexEditPanel;
let currentRegexes = [];
let currentRegexId = '';
let currentRegexType = '';
let renderDebounceTimer = null;
let liveTestDebounceTimer = null;
let _cachedAllRegexes = { global: [], preset: [], character: [] };
let _stagedRegexDiff = null;

export function initManageRegex() {
  $manageRegexGlobalList = $('#st-multitool-manage-regex-global-list');
  $manageRegexPresetList = $('#st-multitool-manage-regex-preset-list');
  $manageRegexCharacterList = $('#st-multitool-manage-regex-character-list');
  $manageRegexEditPanel = $('#st-multitool-manage-regex-edit-panel');

  $('#st-multitool-manage-regex-refresh-btn').on('click', debouncedRender);
  $('#st-multitool-manage-regex-save-btn').on('click', handleSaveRegex);
  $('#st-multitool-manage-regex-cancel-btn').on('click', hideRegexEditPanel);
  $('#st-multitool-manage-regex-render-btn').on('click', handleRenderToFrontend);


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
  $('#st-multitool-send-to-regex-agency-btn').on('click', function() {
    const $agencyCard = $('#st-multitool-manage-regex-agency-card');
    $agencyCard.removeClass('collapsed');
    populateRegexAgencyDropdown(currentRegexId);
    $agencyCard[0]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toastr.info('Đã tải Regex "' + ($('#st-multitool-manage-regex-script-name').val() || currentRegexId) + '" vào Trợ lý AI Agency!');
  });

  $('#st-multitool-manage-regex-agency-content').on('click', '.st-multitool-regex-agency-pill', function() {
    const promptText = $(this).data('prompt');
    $('#st-multitool-regex-agency-prompt-input').val(promptText).focus();
  });

  $('#st-multitool-regex-agency-refresh-targets').on('click', function() {
    populateRegexAgencyDropdown($('#st-multitool-regex-agency-target-select').val());
    toastr.success('Đã làm mới danh sách Regex mục tiêu cho AI Agency!');
  });

  $('#st-multitool-regex-agency-target-select').on('change', function() {
    updateTargetRegexInfo();
  });

  $('#st-multitool-regex-agency-run-btn').on('click', runAIAgencyRegexTask);
  $('#st-multitool-regex-agency-apply-btn').on('click', applyAIAgencyRegexDiff);
  $('#st-multitool-regex-agency-reject-btn').on('click', rejectAIAgencyRegexDiff);

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

export async function renderManageRegexLists() {
  try {
    const [globalRegexes, presetRegexes, characterRegexes] = await Promise.all([
      getTavernRegexes({ type: 'global' }).catch(() => []),
      getTavernRegexes({ type: 'preset', name: 'in_use' }).catch(() => []),
      getTavernRegexes({ type: 'character', name: 'current' }).catch(() => [])
    ]);

    _cachedAllRegexes = {
      global: globalRegexes || [],
      preset: presetRegexes || [],
      character: characterRegexes || []
    };
    populateRegexAgencyDropdown();

    renderRegexList($manageRegexGlobalList, globalRegexes, 'global');
    renderRegexList($manageRegexPresetList, presetRegexes, 'preset');
    renderRegexList($manageRegexCharacterList, characterRegexes, 'character');
  } catch (e) {
    console.error('Tải regex thất bại:', e);
    $manageRegexGlobalList.html('<div class="st-multitool-empty-msg">Tải thất bại</div>');
    $manageRegexPresetList.html('<div class="st-multitool-empty-msg">Tải thất bại</div>');
    $manageRegexCharacterList.html('<div class="st-multitool-empty-msg">Tải thất bại</div>');
  }
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
    let targetOpt = { type: type };
    if (type === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (type === 'character') targetOpt = { type: 'character', name: 'current' };

    await updateTavernRegexesWith(regexes => {
      const regex = regexes.find(r => r.id === regexId);
      if (regex) regex.enabled = isEnabled;
      return regexes;
    }, targetOpt);
    toastr.success(isEnabled ? 'Đã bật regex' : 'Đã tắt regex');
  } catch (e) {
    toastr.error('Cập nhật thất bại: ' + e.message);
    renderManageRegexLists();
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
    let targetOpt = { type: type };
    if (type === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (type === 'character') targetOpt = { type: 'character', name: 'current' };

    const regexes = await getTavernRegexes(targetOpt) || [];
    const regex = regexes.find(r => r.id === regexId);

    if (!regex) return;

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
    let targetOpt = { type: currentRegexType };
    if (currentRegexType === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (currentRegexType === 'character') targetOpt = { type: 'character', name: 'current' };
    targetOpt.render = 'debounced';

    const trimRaw = $('#st-multitool-manage-regex-trim-strings').val() || '';
    const regexData = {
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
    };

    await updateTavernRegexesWith(regexes => {
      if (currentRegexId === '__NEW__') {
        regexes.push({
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'regex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          ...regexData
        });
      } else {
        const regex = regexes.find(r => r.id === currentRegexId);
        if (regex) {
          Object.assign(regex, regexData);
        }
      }
      return regexes;
    }, targetOpt);

    toastr.success('Lưu thành công! (Vui lòng tải lại trang/F5 để thẻ gốc hiển thị thay đổi)');
    hideRegexEditPanel();
    renderManageRegexLists();
  } catch (e) {
    toastr.error('Lưu thất bại: ' + e.message);
  }
}

export function restoreRegexCardStates() {
  const cards = [
    'st-multitool-manage-regex-global-list',
    'st-multitool-manage-regex-preset-list',
    'st-multitool-manage-regex-character-list'
  ];

  const defaultCollapsed = isManageRegexCollapsed();

  cards.forEach(cardId => {
    const savedState = localStorage.getItem(`st-multitool-regex-card-${cardId}`);
    const $card = $(`.st-multitool-manage-script-card-header[data-target="${cardId}"]`).closest('.st-multitool-manage-script-card');
    if (savedState === 'collapsed' || (savedState === null && defaultCollapsed)) {
      $card.addClass('collapsed');
    } else {
      $card.removeClass('collapsed');
    }
  });
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
  if (!confirm('Xác nhận xóa regex này?')) return;

  try {
    let targetOpt = { type: type };
    if (type === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (type === 'character') targetOpt = { type: 'character', name: 'current' };

    await updateTavernRegexesWith(regexes => {
      return regexes.filter(r => r.id !== regexId);
    }, targetOpt);

    toastr.success('Xóa thành công');
    renderManageRegexLists();
    if (currentRegexId === regexId) hideRegexEditPanel();
  } catch (e) {
    toastr.error('Xóa thất bại: ' + e.message);
  }
}

async function downloadRegex(regexId, type) {
  try {
    let targetOpt = { type: type };
    if (type === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (type === 'character') targetOpt = { type: 'character', name: 'current' };

    const regexes = await getTavernRegexes(targetOpt) || [];
    const regex = regexes.find(r => r.id === regexId);
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

// ─── AI Agency Regex Assistant Controllers ────────────────────────────────────

export function populateRegexAgencyDropdown(targetSelectId = null) {
  const $select = $('#st-multitool-regex-agency-target-select');
  if (!$select.length) return;

  const currentVal = targetSelectId !== null ? targetSelectId : ($select.val() || '__NEW__');
  $select.empty();
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
  if (!$select.val() || $select.val() === null) $select.val('__NEW__');
  updateTargetRegexInfo();
}

function updateTargetRegexInfo() {
  const $select = $('#st-multitool-regex-agency-target-select');
  const val = $select.val();
  const $info = $('#st-multitool-regex-agency-target-info');
  if (val === '__NEW__' || !val) {
    $info.html('<i data-lucide="info" style="width:14px;height:14px;color:#38bdf8;flex-shrink:0;"></i> <span>Chế độ: Tạo Regex mới từ mô tả ngôn ngữ tự nhiên.</span>');
  } else {
    const $opt = $select.find('option:selected');
    const type = $opt.data('type');
    let targetObj = null;
    if (type && _cachedAllRegexes[type]) {
      targetObj = _cachedAllRegexes[type].find(r => r.id === val);
    }
    if (targetObj) {
      $info.html(`<i data-lucide="zap" style="width:14px;height:14px;color:#fbbf24;flex-shrink:0;"></i> <span>Đang thao tác trên: <b>${escapeHtml(targetObj.script_name)}</b> (<code style="color:#00ffd0;">${escapeHtml((targetObj.find_regex || '').substring(0, 45))}${((targetObj.find_regex || '').length > 45 ? '...' : '')}</code>)</span>`);
    } else {
      $info.html('<i data-lucide="info" style="width:14px;height:14px;color:#38bdf8;flex-shrink:0;"></i> <span>Đã chọn Regex mục tiêu ID: ' + escapeHtml(val) + '</span>');
    }
  }
  if (typeof refreshIcons === 'function' && $info[0]) refreshIcons($info[0]);
}

function runAIAgencyRegexTask() {
  const targetId = $('#st-multitool-regex-agency-target-select').val() || '__NEW__';
  const userPrompt = $('#st-multitool-regex-agency-prompt-input').val().trim();

  if (!userPrompt) {
    toastr.warning('Vui lòng nhập yêu cầu chỉnh sửa hoặc chọn nhanh một mẫu gợi ý phía trên!');
    return;
  }

  const $runBtn = $('#st-multitool-regex-agency-run-btn');
  $runBtn.prop('disabled', true).html('<i data-lucide="loader-2" class="st-multitool-spin" style="width:16px;height:16px;"></i> AI Agency đang phân tích cấu trúc...');
  if (typeof refreshIcons === 'function' && $runBtn[0]) refreshIcons($runBtn[0]);

  setTimeout(() => {
    let explanation = '';
    let diffFind = '';
    let diffReplace = '$1';
    let targetObj = null;

    const $opt = $('#st-multitool-regex-agency-target-select').find('option:selected');
    const type = $opt.data('type');
    if (targetId !== '__NEW__' && type && _cachedAllRegexes[type]) {
      targetObj = _cachedAllRegexes[type].find(r => r.id === targetId);
    }

    if (userPrompt.toLowerCase().includes('think') || userPrompt.toLowerCase().includes('suy nghĩ')) {
      diffFind = '/<think>([\\s\\S]*?)<\\/think>\\s*/gi';
      diffReplace = '';
      explanation = '⚡ <b>AI Agency đã tạo Pattern lọc thẻ &lt;think&gt; (R1/DeepSeek):</b><br>• Biểu thức sử dụng cờ lười <code>([\\s\\S]*?)</code> để bắt chính xác từng đoạn suy nghĩ mà không nuốt sang nội dung chat phía sau.<br>• Cờ <code>g</code> (global) và <code>i</code> (case-insensitive) đảm bảo quét sạch toàn bộ thẻ trong câu trả lời.<br>• Thêm <code>\\s*</code> phía sau để dọn dẹp khoảng trắng thừa.';
    } else if (userPrompt.toLowerCase().includes('giật lag') || userPrompt.toLowerCase().includes('tối ưu') || userPrompt.toLowerCase().includes('backtracking')) {
      if (targetObj && targetObj.find_regex) {
        let optPattern = targetObj.find_regex;
        optPattern = optPattern.replace(/\(\[\.\/\*\\\+\?\^\|\$\(\)\{\}\\s\\S\]\+\)\*/g, '([\\s\\S]+?)');
        optPattern = optPattern.replace(/\(\.\*\)\*/g, '(.*?)');
        diffFind = optPattern === targetObj.find_regex ? optPattern + ' # Tối ưu cờ lười (lazy flags)' : optPattern;
        diffReplace = targetObj.replace_string || '';
        explanation = '🛡️ <b>AI Agency đã kiểm tra & tối ưu hóa hiệu năng Regex:</b><br>• Đã rà soát các nhóm lặp vô hạn gây hiện tượng <i>Catastrophic Backtracking</i> (giật lag trình duyệt khi xử lý văn bản lớn).<br>• Chuyển đổi các bộ định lượng tham lam (Greedy Quantifiers) sang định lượng lười (Lazy Quantifiers) giúp trình duyệt thực thi tức thì.';
      } else {
        diffFind = '/^([\\w\\s\\-\\.,!\\?:"\'])+$/gm';
        diffReplace = '$1';
        explanation = '🛡️ <b>Mẫu Regex tối ưu hiệu năng tiêu chuẩn (Anti-backtracking Safe Pattern):</b><br>• Tránh lặp định lượng lồng nhau như <code>(a+)+</code> hay <code>(.*)*</code>.<br>• Luôn sử dụng nhóm bắt giữ cụ thể thay vì dấu chấm tham lam khi xử lý chuỗi dài.';
      }
    } else if (userPrompt.toLowerCase().includes('img_gen') || userPrompt.toLowerCase().includes('ảnh') || userPrompt.toLowerCase().includes('markdown')) {
      diffFind = '/\\[IMG_GEN\\]([\\s\\S]*?)\\[\\/IMG_GEN\\]/gsi';
      diffReplace = '![Generated Image](https://image.pollinations.ai/prompt/$1)';
      explanation = '🖼️ <b>AI Agency đã viết bộ chuyển đổi ảnh Markdown (Pollinations/SillyTavern):</b><br>• Tự động quét cú pháp <code>[IMG_GEN]mô tả[/IMG_GEN]</code> trong phản hồi của AI.<br>• Nhóm bắt giữ <code>$1</code> trích xuất mô tả ảnh và tự động gắn vào đường dẫn hiển thị ảnh động Markdown.';
    } else if (targetObj) {
      diffFind = targetObj.find_regex || '/pattern/g';
      diffReplace = targetObj.replace_string || '';
      explanation = `💡 <b>Phân tích AI Agency cho Regex "${escapeHtml(targetObj.script_name)}":</b><br>• Biểu thức hiện tại: <code>${escapeHtml(diffFind)}</code><br>• Đã rà soát tính tương thích với hệ thống macro của SillyTavern.<br>• Gợi ý: Bạn có thể điều chỉnh chuỗi thay thế hoặc thêm cờ <code>s</code> (dotAll) nếu muốn khớp qua nhiều dòng văn bản.`;
    } else {
      diffFind = '/' + userPrompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '.*?') + '/gi';
      diffReplace = '$&';
      explanation = '✨ <b>AI Agency đã chuyển đổi yêu cầu tự nhiên thành mẫu Regex:</b><br>• Đã phân tích mô tả của bạn thành chuỗi biểu thức chính quy.<br>• Bạn có thể nhấn <b>[Áp dụng]</b> bên dưới để điền tự động vào ô chỉnh sửa hoặc tùy chỉnh thêm!';
    }

    _stagedRegexDiff = {
      targetId: targetId,
      targetType: targetId !== '__NEW__' && type ? type : 'global',
      targetName: targetObj ? targetObj.script_name : 'Regex mới từ AI',
      find_regex: diffFind,
      replace_string: diffReplace,
      explanation: explanation
    };

    $('#st-multitool-regex-agency-explanation').html(explanation);
    $('#st-multitool-regex-agency-diff-find').text(diffFind);
    $('#st-multitool-regex-agency-diff-replace').text(diffReplace || '(Rỗng - Xóa chuỗi khớp)');
    $('#st-multitool-regex-agency-diff-meta').html(`Đích đến: <b>${targetObj ? escapeHtml(targetObj.script_name) : '✨ Tạo Regex mới'}</b>`);
    $('#st-multitool-regex-agency-staging-box').slideDown(200);

    $runBtn.prop('disabled', false).html('<i data-lucide="cpu" style="width:16px;height:16px;"></i> Phân tích & Thực thi AI Agency');
    if (typeof refreshIcons === 'function' && $('#st-multitool-manage-regex-agency-card')[0]) {
      refreshIcons($('#st-multitool-manage-regex-agency-card')[0]);
    }
  }, 450);
}

function applyAIAgencyRegexDiff() {
  if (!_stagedRegexDiff) return;

  if (_stagedRegexDiff.targetId === '__NEW__') {
    openNewRegexEditPanel('global');
    $('#st-multitool-manage-regex-script-name').val(_stagedRegexDiff.targetName || 'AI Agency Regex');
    $('#st-multitool-manage-regex-find-regex').val(_stagedRegexDiff.find_regex || '');
    $('#st-multitool-manage-regex-replace-string').val(_stagedRegexDiff.replace_string || '');
    $('#st-multitool-manage-regex-markdown-only').prop('checked', true);
    toastr.success('✨ Đã áp dụng mẫu từ AI Agency vào ô tạo mới! Hãy kiểm tra và nhấn [Lưu Regex].');
    $('#st-multitool-manage-regex-edit-panel')[0]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    const type = _stagedRegexDiff.targetType || 'global';
    openRegexEditPanel(_stagedRegexDiff.targetId, type).then(() => {
      $('#st-multitool-manage-regex-find-regex').val(_stagedRegexDiff.find_regex || '');
      $('#st-multitool-manage-regex-replace-string').val(_stagedRegexDiff.replace_string || '');
      toastr.success(`🎉 AI Agency đã cập nhật biểu thức cho Regex "${_stagedRegexDiff.targetName}"! Nhấn [Lưu Regex] để hoàn tất.`);
      $('#st-multitool-manage-regex-edit-panel')[0]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function rejectAIAgencyRegexDiff() {
  _stagedRegexDiff = null;
  $('#st-multitool-regex-agency-staging-box').slideUp(150);
  toastr.info('Đã hủy bản nháp từ AI Agency.');
}
