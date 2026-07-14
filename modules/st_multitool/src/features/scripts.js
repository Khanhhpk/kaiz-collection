import { generateUUID, refreshIcons } from '../utils.js';
import { extractContentFromMessage } from './sync.js';
import { isDefaultCollapse } from './settings.js';
import { updateTavernRegexesWith, updateScriptTreesWith } from '../api.js';

export let extractedFrontendCards = [];
export let extractedScriptCards = [];

let $crImportGlobalBtn;
let $crImportPresetBtn;
let $crImportCharacterBtn;
let $crDownloadBtn;
let $crLoadBtn;
let $crFileInput;

let $mainImportRegexBtn;
let $mainImportRegexOptions;
let $mainImportRegexGlobalBtn;
let $mainImportRegexPresetBtn;
let $mainImportRegexCharacterBtn;
let $mainRegexFileInput;

let $ssExtractBtn;
let $ssCardsContainer;

let $feExtractBtn;
let $feCardsContainer;

let $csImportGlobalScriptBtn;
let $csImportPresetScriptBtn;
let $csImportCharacterScriptBtn;
let $csDownloadBtn;
let $csLoadBtn;
let $csFileInput;

let $mainImportScriptBtn;
let $mainImportScriptOptions;
let $mainImportScriptGlobalBtn;
let $mainImportScriptPresetBtn;
let $mainImportScriptCharacterBtn;
let $mainScriptFileInput;

let currentRegexImportTarget = '';
let currentScriptImportTarget = '';

export function initScripts() {
  $crImportGlobalBtn = $('#st-multitool-cr-import-global-btn');
  $crImportPresetBtn = $('#st-multitool-cr-import-preset-btn');
  $crImportCharacterBtn = $('#st-multitool-cr-import-character-btn');
  $crDownloadBtn = $('#st-multitool-cr-download-btn');
  $crLoadBtn = $('#st-multitool-cr-load-btn');
  $crFileInput = $('#st-multitool-cr-file-input');

  $mainImportRegexBtn = $('#st-multitool-main-import-regex-btn');
  $mainImportRegexOptions = $('#st-multitool-main-import-regex-options');
  $mainImportRegexGlobalBtn = $('#st-multitool-main-import-regex-global-btn');
  $mainImportRegexPresetBtn = $('#st-multitool-main-import-regex-preset-btn');
  $mainImportRegexCharacterBtn = $('#st-multitool-main-import-regex-character-btn');
  $mainRegexFileInput = $('#st-multitool-main-regex-file-input');

  $ssExtractBtn = $('#st-multitool-ss-extract-btn');
  $ssCardsContainer = $('#st-multitool-ss-cards-container');

  $feExtractBtn = $('#st-multitool-fe-extract-btn');
  $feCardsContainer = $('#st-multitool-fe-cards-container');

  $csImportGlobalScriptBtn = $('#st-multitool-cs-import-global-script-btn');
  $csImportPresetScriptBtn = $('#st-multitool-cs-import-preset-script-btn');
  $csImportCharacterScriptBtn = $('#st-multitool-cs-import-character-script-btn');
  $csDownloadBtn = $('#st-multitool-cs-download-btn');
  $csLoadBtn = $('#st-multitool-cs-load-btn');
  $csFileInput = $('#st-multitool-cs-file-input');

  $mainImportScriptBtn = $('#st-multitool-main-import-script-btn');
  $mainImportScriptOptions = $('#st-multitool-main-import-script-options');
  $mainImportScriptGlobalBtn = $('#st-multitool-main-import-script-global-btn');
  $mainImportScriptPresetBtn = $('#st-multitool-main-import-script-preset-btn');
  $mainImportScriptCharacterBtn = $('#st-multitool-main-import-script-character-btn');
  $mainScriptFileInput = $('#st-multitool-main-script-file-input');

  $crImportGlobalBtn.on('click', () => handleRegexImport('cr', 'global'));
  $crImportPresetBtn.on('click', () => handleRegexImport('cr', 'preset'));
  $crImportCharacterBtn.on('click', () => handleRegexImport('cr', 'character'));
  $crDownloadBtn.on('click', () => handleRegexDownload('cr'));
  $crLoadBtn.on('click', () => $crFileInput.click());
  $crFileInput.on('change', e => handleRegexFileLoad(e, 'cr'));

  $mainImportRegexBtn.on('click', () => {
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $mainImportRegexCharacterBtn.show();
    } else {
      $mainImportRegexCharacterBtn.hide();
    }
    $mainImportRegexOptions.slideToggle();
  });

  $mainImportRegexGlobalBtn.on('click', () => {
    currentRegexImportTarget = 'global';
    $mainRegexFileInput.click();
  });
  $mainImportRegexPresetBtn.on('click', () => {
    currentRegexImportTarget = 'preset';
    $mainRegexFileInput.click();
  });
  $mainImportRegexCharacterBtn.on('click', () => {
    currentRegexImportTarget = 'character';
    $mainRegexFileInput.click();
  });

  $mainRegexFileInput.on('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const data = JSON.parse(e.target.result);

        const tavernRegex = data.id ? data : {
          id: data.id || generateUUID(),
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

        let targetOpt = { type: 'global' };
        if (currentRegexImportTarget === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
        if (currentRegexImportTarget === 'character') targetOpt = { type: 'character', name: 'current' };

        await updateTavernRegexesWith(regexes => {
          regexes.push(tavernRegex);
          return regexes;
        }, targetOpt);
        toastr.success(
          `Nhập thành công vào ${currentRegexImportTarget === 'global' ? 'Toàn cục' : currentRegexImportTarget === 'preset' ? 'Preset' : 'Cục bộ'} regex!`,
        );
        $mainImportRegexOptions.slideUp();
      } catch (err) {
        toastr.error('Nhập thất bại: ' + err.message);
      }
      $mainRegexFileInput.val('');
    };
    reader.readAsText(file);
  });

  $ssExtractBtn.on('click', () => handleExtractScript('ss'));
  $ssCardsContainer.on('click', '.ss-import-global-btn', function () {
    handleScriptImport('ss', 'global', $(this).data('id'));
  });
  $ssCardsContainer.on('click', '.ss-import-preset-btn', function () {
    handleScriptImport('ss', 'preset', $(this).data('id'));
  });
  $ssCardsContainer.on('click', '.ss-import-character-btn', function () {
    handleScriptImport('ss', 'character', $(this).data('id'));
  });
  $ssCardsContainer.on('click', '.ss-download-btn', function () {
    handleScriptDownload('ss', $(this).data('id'));
  });
  $ssCardsContainer.on('click', '.ss-delete-btn', function () {
    removeScriptCard($(this).data('id'));
  });
  $ssCardsContainer.on('click', '.st-multitool-card-header', function () {
    const $content = $(this).siblings('.st-multitool-card-content');
    const $icon = $(this).find('.st-multitool-collapse-icon');
    if ($content.is(':visible')) {
      $content.slideUp(200);
      $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    } else {
      $content.slideDown(200);
      $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    }
  });

  $feExtractBtn.on('click', handleExtractFrontend);
  $feCardsContainer.on('click', '.fe-import-global-btn', function () {
    handleRegexImport('fe', 'global', $(this).data('id'));
  });
  $feCardsContainer.on('click', '.fe-import-preset-btn', function () {
    handleRegexImport('fe', 'preset', $(this).data('id'));
  });
  $feCardsContainer.on('click', '.fe-import-character-btn', function () {
    handleRegexImport('fe', 'character', $(this).data('id'));
  });
  $feCardsContainer.on('click', '.fe-download-btn', function () {
    handleRegexDownload('fe', $(this).data('id'));
  });
  $feCardsContainer.on('click', '.fe-render-btn', function () {
    handleFrontendRender($(this).data('id'));
  });
  $feCardsContainer.on('click', '.fe-delete-btn', function () {
    removeFrontendCard($(this).data('id'));
  });
  $feCardsContainer.on('click', '.st-multitool-card-header', function () {
    const $content = $(this).siblings('.st-multitool-card-content');
    const $icon = $(this).find('.st-multitool-collapse-icon');
    if ($content.is(':visible')) {
      $content.slideUp(200);
      $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    } else {
      $content.slideDown(200);
      $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    }
  });

  $csImportGlobalScriptBtn.on('click', () => handleScriptImport('cs', 'global'));
  $csImportPresetScriptBtn.on('click', () => handleScriptImport('cs', 'preset'));
  $csImportCharacterScriptBtn.on('click', () => handleScriptImport('cs', 'character'));
  $csDownloadBtn.on('click', () => handleScriptDownload('cs'));
  $csLoadBtn.on('click', () => $csFileInput.click());
  $csFileInput.on('change', e => handleScriptFileLoad(e, 'cs'));

  $mainImportScriptBtn.on('click', () => {
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $mainImportScriptCharacterBtn.show();
    } else {
      $mainImportScriptCharacterBtn.hide();
    }
    $mainImportScriptOptions.slideToggle();
  });

  $mainImportScriptGlobalBtn.on('click', () => {
    currentScriptImportTarget = 'global';
    $mainScriptFileInput.click();
  });
  $mainImportScriptPresetBtn.on('click', () => {
    currentScriptImportTarget = 'preset';
    $mainScriptFileInput.click();
  });
  $mainImportScriptCharacterBtn.on('click', () => {
    currentScriptImportTarget = 'character';
    $mainScriptFileInput.click();
  });

  $mainScriptFileInput.on('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const data = JSON.parse(e.target.result);

        const scriptObj =
          data.type === 'script'
            ? data
            : {
                type: 'script',
                enabled: data.enabled !== false,
                name: data.name || 'Script đã nhập',
                id:
                  data.id ||
                  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    let r = (Math.random() * 16) | 0,
                      v = c == 'x' ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                  }),
                content: data.content || '',
                info: data.info || 'Được nhập bởi Đồng bộ Sổ thế giới',
                button: data.button || { enabled: false, buttons: [] },
                data: data.data || {},
              };

        let targetOpt = { type: 'global' };
        if (currentScriptImportTarget === 'preset') targetOpt = { type: 'preset' };
        if (currentScriptImportTarget === 'character') targetOpt = { type: 'character' };

        await updateScriptTreesWith(scripts => {
          scripts.push(scriptObj);
          return scripts;
        }, targetOpt);
        toastr.success(
          `Nhập thành công vào ${currentScriptImportTarget === 'global' ? 'Toàn cục' : currentScriptImportTarget === 'preset' ? 'Preset' : 'Nhân vật'} thư viện script!`,
        );
        $mainImportScriptOptions.slideUp();
      } catch (err) {
        toastr.error('Nhập thất bại: ' + err.message);
      }
      $mainScriptFileInput.val('');
    };
    reader.readAsText(file);
  });
}

export function getRegexObjFromUI(prefix, cardId = null) {
  const suffix = cardId ? `-${cardId}` : '';
  const htmlContent = $(`#st-multitool-${prefix}-content${suffix}`).val() || '';
  if (prefix !== 'cr' && !htmlContent) return null;

  const scriptNameInput = $(`#st-multitool-${prefix}-script-name${suffix}`).val();
  const scriptNameTrimmed = scriptNameInput ? scriptNameInput.trim() : '';
  if (prefix === 'cr' && !scriptNameTrimmed) return { error: 'Vui lòng nhập tên' };

  const scriptName = scriptNameTrimmed || 'Script frontend mới';
  const findRegex = $(`#st-multitool-${prefix}-find-regex${suffix}`).val() || '<Mở bảng điều khiển>';

  const placementInts = [];
  $(`.st-multitool-${prefix}-placement-cb${suffix}:checked`).each(function () {
    placementInts.push(parseInt($(this).val()));
  });
  if (placementInts.length === 0) placementInts.push(2);

  const isDisabled = $(`#st-multitool-${prefix}-disabled${suffix}`).is(':checked');
  const runOnEdit = $(`#st-multitool-${prefix}-run-on-edit${suffix}`).is(':checked');
  const substituteRegex = parseInt($(`#st-multitool-${prefix}-substitute-regex${suffix}`).val()) || 0;

  const markdownOnly = $(`#st-multitool-${prefix}-markdown-only${suffix}`).is(':checked');
  const promptOnly = $(`#st-multitool-${prefix}-prompt-only${suffix}`).is(':checked');

  const minDepthStr = $(`#st-multitool-${prefix}-min-depth${suffix}`).val();
  const minDepth = minDepthStr !== '' ? parseInt(minDepthStr) : null;

  const maxDepthStr = $(`#st-multitool-${prefix}-max-depth${suffix}`).val();
  const maxDepth = maxDepthStr !== '' ? parseInt(maxDepthStr) : null;

  const trimStringsRaw = $(`#st-multitool-${prefix}-trim-strings${suffix}`).val() || '';
  const trimStrings = trimStringsRaw
    .split('\n')
    .map(s => s.trim())
    .filter(s => s !== '');

  const regexObj = {
    id: generateUUID(),
    scriptName: scriptName,
    findRegex: findRegex,
    replaceString: htmlContent,
    trimStrings: trimStrings,
    placement: placementInts,
    disabled: isDisabled,
    markdownOnly: markdownOnly,
    promptOnly: promptOnly,
    runOnEdit: runOnEdit,
    substituteRegex: substituteRegex,
    minDepth: minDepth,
    maxDepth: maxDepth,
  };

  if (!regexObj.replaceString.startsWith('```')) {
    regexObj.replaceString = '```html\n' + regexObj.replaceString + '\n```';
  }
  return regexObj;
}

export function convertToTavernRegex(regexObj) {
  const placement = regexObj.placement || [];
  return {
    id: regexObj.id,
    script_name: regexObj.scriptName,
    enabled: !regexObj.disabled,
    find_regex: regexObj.findRegex,
    replace_string: regexObj.replaceString,
    trim_strings: regexObj.trimStrings ? regexObj.trimStrings.join('\n') : '',
    source: {
      user_input: placement.includes(1),
      ai_output: placement.includes(2),
      slash_command: placement.includes(4),
      world_info: placement.includes(3),
      reasoning: placement.includes(5),
    },
    destination: {
      display: regexObj.markdownOnly,
      prompt: regexObj.promptOnly,
    },
    run_on_edit: regexObj.runOnEdit,
    min_depth: regexObj.minDepth,
    max_depth: regexObj.maxDepth,
  };
}

export function getScriptSyncObjFromUI(prefix, cardId = null) {
  const suffix = cardId ? `-${cardId}` : '';
  const content = $(`#st-multitool-${prefix}-content${suffix}`).val() || '';
  if (prefix !== 'cs' && !content) return null;

  const scriptNameInput = $(`#st-multitool-${prefix}-script-name${suffix}`).val();
  const scriptNameTrimmed = scriptNameInput ? scriptNameInput.trim() : '';
  if (prefix === 'cs' && !scriptNameTrimmed) return { error: 'Vui lòng nhập tên' };

  const scriptName = scriptNameTrimmed || 'Script trợ lý mới';
  const isDisabled = $(`#st-multitool-${prefix}-disabled${suffix}`).is(':checked');
  const info = $(`#st-multitool-${prefix}-info${suffix}`).val() || '';

  return {
    type: 'script',
    enabled: !isDisabled,
    name: scriptName,
    id: generateUUID(),
    content: content,
    info: info,
    button: {
      enabled: false,
      buttons: [],
    },
    data: {},
  };
}

export async function handleRegexImport(prefix, targetType, cardId = null) {
  const regexObj = getRegexObjFromUI(prefix, cardId);
  if (!regexObj) return toastr.warning('Không có nội dung để nhập');
  if (regexObj.error) return toastr.warning(regexObj.error);
  try {
    const tavernRegex = convertToTavernRegex(regexObj);
    
    let targetOpt = { type: targetType };
    if (targetType === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (targetType === 'character') targetOpt = { type: 'character', name: 'current' };

    await updateTavernRegexesWith(
      regexes => {
        regexes.push(tavernRegex);
        return regexes;
      },
      targetOpt,
    );
    const typeName = targetType === 'global' ? 'Toàn cục' : targetType === 'preset' ? 'Preset' : 'Cục bộ';
    toastr.success(`Nhập thành công vào ${typeName} regex!`);
  } catch (e) {
    toastr.error(`Nhập thất bại: ${e.message}`);
  }
}

export function handleRegexDownload(prefix, cardId = null) {
  const regexObj = getRegexObjFromUI(prefix, cardId);
  if (!regexObj) return toastr.warning('Không có nội dung để tải xuống');
  if (regexObj.error) return toastr.warning(regexObj.error);

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(regexObj, null, 4));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'regex-' + regexObj.scriptName + '.json');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  toastr.success('Tải xuống thành công!');
}

export function handleRegexFileLoad(e, prefix) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      $(`#st-multitool-${prefix}-script-name`).val(data.scriptName || data.script_name || '');
      $(`#st-multitool-${prefix}-find-regex`).val(data.findRegex || data.find_regex || '');

      let content = data.replaceString || data.replace_string || '';
      content = content.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '');
      $(`#st-multitool-${prefix}-content`).val(content);

      let trimStrings = '';
      if (Array.isArray(data.trimStrings)) {
        trimStrings = data.trimStrings.join('\n');
      } else if (typeof data.trim_strings === 'string') {
        trimStrings = data.trim_strings;
      }
      $(`#st-multitool-${prefix}-trim-strings`).val(trimStrings);

      $(`.st-multitool-${prefix}-placement-cb`).prop('checked', false);
      let placements = data.placement || [];
      if (data.source) {
        if (data.source.user_input) placements.push(1);
        if (data.source.ai_output) placements.push(2);
        if (data.source.world_info) placements.push(3);
        if (data.source.slash_command) placements.push(4);
        if (data.source.reasoning) placements.push(5);
      }
      placements.forEach(val => {
        $(`.st-multitool-${prefix}-placement-cb[value="${val}"]`).prop('checked', true);
      });

      $(`#st-multitool-${prefix}-disabled`).prop('checked', data.disabled || data.enabled === false);
      $(`#st-multitool-${prefix}-run-on-edit`).prop('checked', data.runOnEdit || data.run_on_edit || false);
      $(`#st-multitool-${prefix}-substitute-regex`).val(data.substituteRegex || 0);

      $(`#st-multitool-${prefix}-markdown-only`).prop(
        'checked',
        data.markdownOnly || (data.destination && data.destination.display) || false,
      );
      $(`#st-multitool-${prefix}-prompt-only`).prop(
        'checked',
        data.promptOnly || (data.destination && data.destination.prompt) || false,
      );
      $(`#st-multitool-${prefix}-min-depth`).val(data.minDepth || data.min_depth || '');
      $(`#st-multitool-${prefix}-max-depth`).val(data.maxDepth || data.max_depth || '');

      toastr.success('regexNhập script thành công!');
    } catch (err) {
      toastr.error('Phân tích tệp JSON thất bại: ' + err.message);
    }
    $(`#st-multitool-${prefix}-file-input`).val('');
  };
  reader.readAsText(file);
}

export async function handleScriptImport(prefix, targetType, cardId = null) {
  const scriptObj = getScriptSyncObjFromUI(prefix, cardId);
  if (!scriptObj) return toastr.warning('Không có nội dung để nhập');
  if (scriptObj.error) return toastr.warning(scriptObj.error);
  try {
    await updateScriptTreesWith(
      scripts => {
        scripts.push(scriptObj);
        return scripts;
      },
      { type: targetType },
    );
    const typeName = targetType === 'global' ? 'Toàn cục' : targetType === 'preset' ? 'Preset' : 'Nhân vật';
    toastr.success(`Nhập thành công vào ${typeName} thư viện script!`);
  } catch (e) {
    toastr.error(`Nhập thất bại: ${e.message}`);
  }
}

export function handleScriptDownload(prefix, cardId = null) {
  const scriptObj = getScriptSyncObjFromUI(prefix, cardId);
  if (!scriptObj) return toastr.warning('Không có nội dung để tải xuống');
  if (scriptObj.error) return toastr.warning(scriptObj.error);

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scriptObj, null, 4));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'Script Trợ lý Tavern-' + scriptObj.name + '.json');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  toastr.success('Tải xuống thành công!');
}

export function handleScriptFileLoad(e, prefix) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      $(`#st-multitool-${prefix}-script-name`).val(data.name || '');
      $(`#st-multitool-${prefix}-content`).val(data.content || '');
      $(`#st-multitool-${prefix}-disabled`).prop('checked', data.enabled === false);

      toastr.success('Nhập script trợ lý thành công!');
    } catch (err) {
      toastr.error('Phân tích tệp JSON thất bại: ' + err.message);
    }
    $(`#st-multitool-${prefix}-file-input`).val('');
  };
  reader.readAsText(file);
}

export async function handleExtractScript(prefix, wrapInCodeBlock = false) {
  const startTag = $(`#st-multitool-${prefix}-tag-start`).val();
  const endTag = $(`#st-multitool-${prefix}-tag-end`).val();
  const floorInput = $(`#st-multitool-${prefix}-floor`).val();

  const extractedTexts = await extractContentFromMessage(startTag, endTag, floorInput);
  if (!extractedTexts) return;

  extractedScriptCards = extractedTexts.map((text, index) => {
    let finalContent = text;
    if (wrapInCodeBlock && !finalContent.startsWith('```')) {
      finalContent = '```html\n' + finalContent + '\n```';
    }
    return {
      id: Date.now() + index,
      content: finalContent,
      name: `Trích xuất script ${index + 1}`
    };
  });
  
  renderScriptCards(prefix);
  toastr.success(`Trích xuất thành công ${extractedScriptCards.length}  script`);
}

export async function handleExtractFrontend() {
  const startTag = $('#st-multitool-fe-tag-start').val();
  const endTag = $('#st-multitool-fe-tag-end').val();
  const floorInput = $('#st-multitool-fe-floor').val();

  const extractedTexts = await extractContentFromMessage(startTag, endTag, floorInput);
  if (!extractedTexts) return;

  extractedFrontendCards = extractedTexts.map((text, index) => {
    return {
      id: Date.now() + index,
      content: text,
      name: `Trích xuất frontend ${index + 1}`
    };
  });

  renderFrontendCards();
  toastr.success(`Trích xuất thành công ${extractedFrontendCards.length}  đoạn frontend`);
}

export function addFrontendCard(cardData) {
  extractedFrontendCards.unshift(cardData);
}

export function handleFrontendRender(cardId) {
  const $container = $(`#st-multitool-fe-preview-container-${cardId}`);
  const $btn = $(`.fe-render-btn[data-id="${cardId}"]`);
  
  if ($container.is(':visible')) {
    $container.empty().hide();
    $btn.html('<i data-lucide="eye"></i> Render frontend');
    refreshIcons($btn[0]);
    return;
  }

  let htmlContent = $(`#st-multitool-fe-content-${cardId}`).val();
  if (!htmlContent) return toastr.warning('Không có nội dung để render');

  htmlContent = htmlContent.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '');

  const iframe = $('<iframe>', {
    srcdoc: htmlContent,
    style: 'width: 100%; height: 400px; border: none;',
  });
  $container.empty().append(iframe).show();
  $btn.html('🙈 Hủy render');
}

export function removeFrontendCard(id) {
  extractedFrontendCards = extractedFrontendCards.filter(c => c.id !== id);
  renderFrontendCards();
}

export function removeScriptCard(id) {
  extractedScriptCards = extractedScriptCards.filter(c => c.id !== id);
  renderScriptCards('ss');
}

export function renderFrontendCards() {
  if (extractedFrontendCards.length === 0) {
    $feCardsContainer.html('<div class="st-multitool-empty-msg">Không trích xuất được mã frontend nào.</div>');
    return;
  }

  let html = '';
  const defaultCollapse = isDefaultCollapse();
  extractedFrontendCards.forEach(card => {
    const contentStyle = defaultCollapse ? 'display: none; padding: 15px;' : 'padding: 15px;';
    const iconClass = defaultCollapse ? 'fa-chevron-down' : 'fa-chevron-up';
    html += `
    <div class="st-multitool-card" data-id="${card.id}" style="border: 1px solid var(--st-multitool-border); border-radius: 5px; background: rgba(0,0,0,0.2); overflow: hidden;">
      <div class="st-multitool-card-header" style="padding: 10px 15px; background: rgba(0,0,0,0.3); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold;">${card.name}</span>
        <i data-lucide="${iconClass.replace('fa-', '')}" class="st-multitool-collapse-icon"></i>
      </div>
      <div class="st-multitool-card-content" style="${contentStyle}">
        <div class="st-multitool-row">
          <div class="st-multitool-group" style="flex: 1">
            <span class="st-multitool-label">Tên script:</span>
            <input type="text" id="st-multitool-fe-script-name-${card.id}" class="st-multitool-input" style="width: 100%" value="${card.name}" />
          </div>
          <div class="st-multitool-group" style="flex: 1">
            <span class="st-multitool-label">Regex tìm kiếm:</span>
            <input type="text" id="st-multitool-fe-find-regex-${card.id}" class="st-multitool-input" style="width: 100%" value="<Mở bảng điều khiển>" />
          </div>
        </div>
        <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 10px">
          <div style="display: flex; flex-direction: column; gap: 5px">
            <span class="st-multitool-label" style="font-weight: bold">Phạm vi áp dụng</span>
            <label class="st-multitool-checkbox-label"><input type="checkbox" class="st-multitool-fe-placement-cb-${card.id}" value="1" /> Đầu vào người dùng</label>
            <label class="st-multitool-checkbox-label"><input type="checkbox" class="st-multitool-fe-placement-cb-${card.id}" value="2" checked /> Đầu ra AI</label>
            <label class="st-multitool-checkbox-label"><input type="checkbox" class="st-multitool-fe-placement-cb-${card.id}" value="4" /> Lệnh nhanh</label>
            <label class="st-multitool-checkbox-label"><input type="checkbox" class="st-multitool-fe-placement-cb-${card.id}" value="3" /> Thông tin thế giới</label>
            <label class="st-multitool-checkbox-label"><input type="checkbox" class="st-multitool-fe-placement-cb-${card.id}" value="5" /> Suy luận</label>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px">
            <span class="st-multitool-label" style="font-weight: bold">Tùy chọn khác</span>
            <label class="st-multitool-checkbox-label"><input type="checkbox" id="st-multitool-fe-disabled-${card.id}" /> Đã tắt</label>
            <label class="st-multitool-checkbox-label"><input type="checkbox" id="st-multitool-fe-run-on-edit-${card.id}" checked /> Chạy khi chỉnh sửa</label>
            <span class="st-multitool-label" style="font-weight: bold; margin-top: 5px">Macro khi tìm regex</span>
            <select id="st-multitool-fe-substitute-regex-${card.id}" class="st-multitool-select" style="width: 120px">
              <option value="0" selected>Không thay</option>
              <option value="1">Thay</option>
            </select>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px">
            <span class="st-multitool-label" style="font-weight: bold">Tạm thời</span>
            <label class="st-multitool-checkbox-label"><input type="checkbox" id="st-multitool-fe-markdown-only-${card.id}" checked /> Chỉ hiển thị định dạng</label>
            <label class="st-multitool-checkbox-label"><input type="checkbox" id="st-multitool-fe-prompt-only-${card.id}" /> Chỉ định dạng prompt</label>
            <div style="display: flex; gap: 10px; margin-top: 5px">
              <div style="display: flex; flex-direction: column; gap: 2px">
                <span class="st-multitool-label">Độ sâu tối thiểu</span>
                <input type="number" id="st-multitool-fe-min-depth-${card.id}" class="st-multitool-input" style="width: 70px" placeholder="Vô hạn" />
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px">
                <span class="st-multitool-label">Độ sâu tối đa</span>
                <input type="number" id="st-multitool-fe-max-depth-${card.id}" class="st-multitool-input" style="width: 70px" placeholder="Vô hạn" />
              </div>
            </div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; margin-top: 10px;">
          <span class="st-multitool-label">Cắt bỏ:</span>
          <textarea id="st-multitool-fe-trim-strings-${card.id}" class="st-multitool-textarea" style="min-height: 60px; margin-bottom: 10px" placeholder="Cắt toàn cục các phần không cần thiết trong kết quả khớp regex trước khi thay thế. Mỗi mục cách nhau bằng xuống dòng."></textarea>
          <span class="st-multitool-label">Thay bằng (mã HTML đã trích):</span>
          <textarea id="st-multitool-fe-content-${card.id}" class="st-multitool-textarea" style="min-height: 150px; font-family: monospace">${card.content}</textarea>
        </div>
        <div class="st-multitool-actions" style="justify-content: flex-end; margin-top: 10px">
          <button class="st-multitool-button fe-import-global-btn" data-id="${card.id}">Nhập vào regex toàn cục</button>
          <button class="st-multitool-button fe-import-preset-btn" data-id="${card.id}">Nhập vào regex preset</button>
          <button class="st-multitool-button fe-import-character-btn" data-id="${card.id}">Nhập vào regex cục bộ</button>
          <button class="st-multitool-button fe-render-btn" data-id="${card.id}"><i data-lucide="eye"></i> Render frontend</button>
          <button class="st-multitool-button st-multitool-btn-primary fe-download-btn" data-id="${card.id}"><i data-lucide="download"></i> Tải xuống thành regex</button>
          <button class="st-multitool-button st-multitool-btn-small abandon fe-delete-btn" data-id="${card.id}"><i data-lucide="trash-2"></i> Xóa</button>
        </div>
        <div id="st-multitool-fe-preview-container-${card.id}" style="display: none; margin-top: 15px; border: 1px solid var(--st-multitool-border); border-radius: 5px; padding: 10px; background: #fff; color: #000; overflow: auto; min-height: 300px;"></div>
      </div>
    </div>
  `;
  });

  $feCardsContainer.html(html);
  refreshIcons($feCardsContainer[0]);
}

export function renderScriptCards(prefix) {
  const $container = $(`#st-multitool-${prefix}-cards-container`);
  if (extractedScriptCards.length === 0) {
    $container.html('<div class="st-multitool-empty-msg">Không trích xuất được mã script nào.</div>');
    return;
  }

  let html = '';
  const defaultCollapse = isDefaultCollapse();
  extractedScriptCards.forEach(card => {
    const contentStyle = defaultCollapse ? 'display: none; padding: 15px;' : 'padding: 15px;';
    const iconClass = defaultCollapse ? 'fa-chevron-down' : 'fa-chevron-up';
    html += `
    <div class="st-multitool-card" data-id="${card.id}" style="border: 1px solid var(--st-multitool-border); border-radius: 5px; background: rgba(0,0,0,0.2); overflow: hidden;">
      <div class="st-multitool-card-header" style="padding: 10px 15px; background: rgba(0,0,0,0.3); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold;">${card.name}</span>
        <i data-lucide="${iconClass.replace('fa-', '')}" class="st-multitool-collapse-icon"></i>
      </div>
      <div class="st-multitool-card-content" style="${contentStyle}">
        <div class="st-multitool-row">
          <div class="st-multitool-group" style="flex: 1">
            <span class="st-multitool-label">Tên script:</span>
            <input type="text" id="st-multitool-${prefix}-script-name-${card.id}" class="st-multitool-input" style="width: 100%" value="${card.name}" />
          </div>
        </div>
        <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 10px">
          <div style="display: flex; flex-direction: column; gap: 5px">
            <label class="st-multitool-checkbox-label"><input type="checkbox" id="st-multitool-${prefix}-disabled-${card.id}" /> Đã tắt</label>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; margin-top: 10px;">
          <span class="st-multitool-label">Nội dung script đã trích (JS/TS):</span>
          <textarea id="st-multitool-${prefix}-content-${card.id}" class="st-multitool-textarea" style="min-height: 150px; font-family: monospace">${card.content}</textarea>
          <span class="st-multitool-label" style="margin-top: 10px">Ghi chú tác giả:</span>
          <textarea id="st-multitool-${prefix}-info-${card.id}" class="st-multitool-textarea" style="min-height: 60px" placeholder="Ghi chú script, ví dụ tác giả, phiên bản và lưu ý; hỗ trợ markdown và html cơ bản"></textarea>
        </div>
        <div class="st-multitool-actions" style="justify-content: flex-end; margin-top: 10px; flex-wrap: wrap">
          <button class="st-multitool-button ss-import-global-btn" data-id="${card.id}" style="background-color: var(--st-multitool-primary); color: #000; opacity: 1">Nhập vào thư viện script toàn cục</button>
          <button class="st-multitool-button ss-import-preset-btn" data-id="${card.id}" style="background-color: var(--st-multitool-primary); color: #000; opacity: 1">Nhập vào thư viện script preset</button>
          <button class="st-multitool-button ss-import-character-btn" data-id="${card.id}" style="background-color: var(--st-multitool-primary); color: #000; opacity: 1">Nhập vào thư viện script nhân vật</button>
          <button class="st-multitool-button st-multitool-btn-primary ss-download-btn" data-id="${card.id}" style="opacity: 1"><i data-lucide="download"></i> Tải script</button>
          <button class="st-multitool-button st-multitool-btn-small abandon ss-delete-btn" data-id="${card.id}"><i data-lucide="trash-2"></i> Xóa</button>
        </div>
      </div>
    </div>
  `;
  });

  $container.html(html);
}
