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

  $('#st-multitool-manage-regex-test-input, #st-multitool-manage-regex-find-regex, #st-multitool-manage-regex-replace-string').on('input change', function() {
    if ($('#st-multitool-manage-regex-tester-box').is(':visible')) {
      runLiveRegexTest();
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

  $('#st-multitool-manage-regex-substitute-regex').on('change', function() {
    const val = $(this).val();
    $('#st-multitool-manage-regex-min-depth-container').css('display', val === '1' ? 'flex' : 'none');
    $('#st-multitool-manage-regex-max-depth-container').css('display', val === '1' ? 'flex' : 'none');
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
    const globalRegexes = await getTavernRegexes({ type: 'global' }) || [];
    const presetRegexes = await getTavernRegexes({ type: 'preset', name: 'in_use' }) || [];
    const characterRegexes = await getTavernRegexes({ type: 'character', name: 'current' }) || [];

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
    div.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; margin-bottom: 8px; gap: 12px; transition: all 0.2s ease;';

    const findPattern = regex.find_regex || '';
    const shortPattern = findPattern.length > 55 ? findPattern.slice(0, 55) + '...' : (findPattern || 'Chưa nhập pattern');
    const scopes = [];
    if (regex.source?.ai_output) scopes.push('<span class="st-multitool-badge" style="background:rgba(14,165,233,0.2);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size:10px;padding:2px 6px;border-radius:4px;">AI Output</span>');
    if (regex.source?.user_input) scopes.push('<span class="st-multitool-badge" style="background:rgba(99,102,241,0.2);color:#818cf8;border:1px solid rgba(129,140,248,0.3);font-size:10px;padding:2px 6px;border-radius:4px;">User In</span>');
    if (regex.source?.slash_command) scopes.push('<span class="st-multitool-badge" style="background:rgba(168,85,247,0.2);color:#c084fc;border:1px solid rgba(192,132,252,0.3);font-size:10px;padding:2px 6px;border-radius:4px;">Command</span>');
    if (regex.source?.world_info) scopes.push('<span class="st-multitool-badge" style="background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);font-size:10px;padding:2px 6px;border-radius:4px;">World Info</span>');
    if (regex.destination?.display) scopes.push('<span class="st-multitool-badge" style="background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(52,211,153,0.3);font-size:10px;padding:2px 6px;border-radius:4px;">Markdown Only</span>');
    if (scopes.length === 0) scopes.push('<span class="st-multitool-badge" style="background:rgba(100,116,139,0.2);color:#94a3b8;font-size:10px;padding:2px 6px;border-radius:4px;">Chưa gán</span>');

    div.innerHTML = `
      <div class="st-multitool-manage-regex-info" style="display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;padding-right:8px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="checkbox" class="st-multitool-manage-regex-enabled" ${regex.enabled !== false ? 'checked' : ''} style="cursor:pointer;flex-shrink:0;width:16px;height:16px;accent-color:#00e6b8;">
          <span class="st-multitool-manage-regex-name" style="font-weight:700;font-size:14px;color:#f8fafc;word-break:break-word;">${escapeHtml(regex.script_name || 'Regex chưa có tên')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding-left:26px;flex-wrap:wrap;">
          <div class="st-multitool-regex-pill" style="font-family:'JetBrains Mono',Consolas,monospace;font-size:11.5px;color:#38bdf8;background:#0b1329;border:1px solid rgba(56,189,248,0.3);padding:3px 8px;border-radius:5px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(findPattern)}">/${escapeHtml(shortPattern)}/</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">${scopes.join('')}</div>
        </div>
      </div>
      <div class="st-multitool-manage-regex-actions" style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
        <button class="st-multitool-button st-multitool-btn-small st-multitool-manage-regex-download" title="Tải xuống thành JSON" style="padding:5px 9px;"><i data-lucide="download" style="width:14px;height:14px;"></i></button>
        <button class="st-multitool-button st-multitool-btn-small st-multitool-manage-regex-delete st-multitool-btn-danger" title="Xóa" style="padding:5px 9px;"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
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

    $('#st-multitool-manage-regex-enabled').prop('checked', regex.enabled !== false);
    $('#st-multitool-manage-regex-run-on-edit').prop('checked', regex.run_on_edit || false);
    $('#st-multitool-manage-regex-substitute-regex').val(regex.substitute_regex || 0);
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

    $('#st-multitool-manage-regex-min-depth-container').css('display', regex.substitute_regex === 1 ? 'flex' : 'none');
    $('#st-multitool-manage-regex-max-depth-container').css('display', regex.substitute_regex === 1 ? 'flex' : 'none');
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
