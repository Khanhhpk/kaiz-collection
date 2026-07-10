import { getAllLorebooks, createLorebookEntries, getChatMessages } from '../api.js';
import { escapeHtml, escapeRegExp } from '../utils.js';
import { isDefaultCollapse } from './settings.js';

export let extractedCards = [];

let $targetWbSelect;
let $tagStart;
let $tagEnd;
let $floorInput;
let $cardsContainer;
let $batchMode;
let $batchPosition;
let $batchDepthContainer;
let $batchDepth;
let $batchPreventIn;
let $batchPreventOut;

export function initSync() {
  $targetWbSelect = $('#st-multitool-target-wb');
  $tagStart = $('#st-multitool-tag-start');
  $tagEnd = $('#st-multitool-tag-end');
  $floorInput = $('#st-multitool-floor');
  $cardsContainer = $('#st-multitool-cards-container');
  $batchMode = $('#st-multitool-batch-mode');
  $batchPosition = $('#st-multitool-batch-position');
  $batchDepthContainer = $('#st-multitool-batch-depth-container');
  $batchDepth = $('#st-multitool-batch-depth');
  $batchPreventIn = $('#st-multitool-batch-prevent-in');
  $batchPreventOut = $('#st-multitool-batch-prevent-out');

  $('#st-multitool-extract-btn').on('click', extractMessages);
  $('#st-multitool-apply-batch-btn').on('click', applyBatchSettings);
  
  $batchPosition.on('change', function () {
    const val = $(this).val();
    $batchDepthContainer.css(
      'display',
      val !== '' && parseInt(val) >= 6 && parseInt(val) <= 8 ? 'flex' : 'none',
    );
  });

  $('#st-multitool-sync-all-btn').on('click', async function () {
    await syncEntries(extractedCards, $(this));
    setTimeout(
      () =>
        $(this)
          .prop('disabled', false)
          .html('<i data-lucide="cloud-upload"></i> Đồng bộ tất cả'),
      2000,
    );
  });

  $cardsContainer.on('change', 'input, select, textarea', function () {
    const $target = $(this);
    const $card = $target.closest('.st-multitool-card');
    const id = $card.data('id');
    const cardData = extractedCards.find(c => c.id === id);
    if (!cardData) return;

    if ($target.hasClass('card-name')) cardData.name = $target.val();
    else if ($target.hasClass('card-keys')) cardData.keys = $target.val();
    else if ($target.hasClass('card-content')) cardData.content = $target.val();
    else if ($target.hasClass('card-mode')) cardData.mode = $target.val();
    else if ($target.hasClass('card-depth')) cardData.depth = parseInt($target.val()) || 0;
    else if ($target.hasClass('card-prevent-in')) cardData.preventIncoming = $target.is(':checked');
    else if ($target.hasClass('card-prevent-out')) cardData.preventOutgoing = $target.is(':checked');
    else if ($target.hasClass('card-position')) {
      const val = $target.val();
      cardData.position = val;
      $card
        .find('.card-depth-row')
        .css('display', parseInt(val) >= 6 && parseInt(val) <= 8 ? 'flex' : 'none');
    }
  });

  $cardsContainer.on('click', '.sync-single-btn', async function () {
    const $card = $(this).closest('.st-multitool-card');
    const id = $card.data('id');
    const cardData = extractedCards.find(c => c.id === id);
    if (cardData) {
      await syncEntries([cardData], $(this));
    }
  });

  $cardsContainer.on('click', '.delete-card-btn', function () {
    const $card = $(this).closest('.st-multitool-card');
    const id = $card.data('id');
    removeCard(id);
  });

  $cardsContainer.on('click', '.st-multitool-card-header', function () {
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
}

export async function populateSyncWorldbooks() {
  try {
    const books = await getAllLorebooks();
    $targetWbSelect.empty().append('<option value="">-- Hãy chọn Sổ thế giới đích --</option>');
    books.forEach(book => $targetWbSelect.append(`<option value="${escapeHtml(book.file_name)}" title="${escapeHtml(book.name)}">${escapeHtml(book.name.length > 60 ? book.name.substring(0, 60) + '...' : book.name)}</option>`));
  } catch (error) {
    $targetWbSelect.empty().append('<option value="">Tải thất bại</option>');
  }
}

function parseFloorInput(input) {
  if (!input || input.trim() === '') {
    return [-1];
  }
  return input.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

async function fetchMessages(floors) {
  const messages = [];
  for (const floor of floors) {
    const msgs = await getChatMessages(floor);
    if (msgs && msgs.length > 0) {
      messages.push(msgs[0].message);
    }
  }
  return messages;
}

function extractTextWithTags(text, startTag, endTag) {
  const regexStr = `${escapeRegExp(startTag)}([\\s\\S]*?)${escapeRegExp(endTag)}`;
  const regex = new RegExp(regexStr, 'g');
  let match;
  const extractedTexts = [];
  while ((match = regex.exec(text)) !== null) {
    extractedTexts.push(match[1].trim());
  }
  return extractedTexts;
}

export async function extractContentFromMessage(startTag, endTag, floorInput) {
  if (!startTag || !endTag) {
    toastr.warning('Vui lòng nhập thẻ bắt đầu và kết thúc');
    return null;
  }
  try {
    const floors = parseFloorInput(floorInput);
    const messages = await fetchMessages(floors);
    
    if (messages.length === 0) {
      toastr.warning('Không tìm thấy tin nhắn ở tầng chỉ định');
      return null;
    }

    let allExtractedTexts = [];
    for (const msgText of messages) {
      const texts = extractTextWithTags(msgText, startTag, endTag);
      allExtractedTexts = allExtractedTexts.concat(texts);
    }

    if (allExtractedTexts.length === 0) {
      toastr.info(`Không tìm thấy phần được ${startTag} và ${endTag} bao bọc`);
      return null;
    }
    return allExtractedTexts;
  } catch (error) {
    toastr.error('Trích xuất thất bại: ' + error.message);
    return null;
  }
}

export async function extractMessages() {
  const startTag = $tagStart.val();
  const endTag = $tagEnd.val();
  const floorInput = $floorInput.val();

  const extractedTexts = await extractContentFromMessage(startTag, endTag, floorInput);
  if (!extractedTexts) return;

  extractedCards = extractedTexts.map((text, index) => parseExtractedText(text, index));
  renderCards();
  toastr.success(`Trích xuất thành công ${extractedCards.length}  mục`);
}

export function parseExtractedText(text, index) {
  let name = `Trích xuất mục ${index + 1}`,
    keys = '',
    content = text;
  const lines = text.split('\n'),
    contentLines = [];
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Tên:') || trimmed.startsWith('Tên:')) name = trimmed.substring(3).trim();
    else if (trimmed.startsWith('Từ khóa:') || trimmed.startsWith('Từ khóa:')) keys = trimmed.substring(4).trim();
    else contentLines.push(line);
  }
  if (name !== `Trích xuất mục ${index + 1}` || keys !== '') content = contentLines.join('\n').trim();

  return {
    id: Date.now() + index,
    name,
    keys,
    content,
    mode: 'selective',
    position: '4',
    depth: 4,
    preventIncoming: false,
    preventOutgoing: false,
  };
}

export function renderCards() {
  if (extractedCards.length === 0) {
      $cardsContainer.html('<div class="st-multitool-empty-msg">Không trích xuất được mục nào.</div>');
      return;
  }

  let cardsHtml = '';
  const defaultCollapse = isDefaultCollapse();
  extractedCards.forEach(card => {
      const isDepthVisible = parseInt(card.position) >= 6 && parseInt(card.position) <= 8;
      const contentStyle = defaultCollapse ? 'display: none; padding: 15px;' : 'padding: 15px;';
      const iconClass = defaultCollapse ? 'fa-chevron-down' : 'fa-chevron-up';
      cardsHtml += `
          <div class="st-multitool-card" data-id="${card.id}" style="border: 1px solid var(--st-multitool-border); border-radius: 5px; background: rgba(0,0,0,0.2); overflow: hidden;">
              <div class="st-multitool-card-header" style="padding: 10px 15px; background: rgba(0,0,0,0.3); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: bold;">${escapeHtml(card.name)}</span>
                  <i data-lucide="${iconClass.replace('fa-', '')}" class="st-multitool-collapse-icon"></i>
              </div>
              <div class="st-multitool-card-content" style="${contentStyle}">
                  <div class="st-multitool-card-row"><span class="st-multitool-card-label">Tên</span><input type="text" class="st-multitool-card-input card-name" value="${escapeHtml(card.name)}"></div>
                  <div class="st-multitool-card-row" style="margin-top: 10px;"><span class="st-multitool-card-label">Từ khóa</span><input type="text" class="st-multitool-card-input card-keys" value="${escapeHtml(card.keys)}" placeholder="Phân tách bằng dấu phẩy"></div>
                  <div class="st-multitool-card-row col" style="margin-top: 10px;"><span class="st-multitool-card-label">Nội dung</span><textarea class="st-multitool-card-textarea card-content">${escapeHtml(card.content)}</textarea></div>
                  <div style="border-top: 1px solid var(--st-multitool-card-border); margin: 5px 0;"></div>
                  <div class="st-multitool-card-row">
                      <span class="st-multitool-card-label">Chế độ kích hoạt</span>
                      <select class="st-multitool-card-select card-mode">
                          <option value="constant" ${card.mode === 'constant' ? 'selected' : ''}>Luôn hiển thị (đèn xanh dương)</option>
                          <option value="selective" ${card.mode === 'selective' ? 'selected' : ''}>Kích hoạt có điều kiện (đèn xanh lá)</option>
                      </select>
                  </div>
                  <div class="st-multitool-card-row">
                      <span class="st-multitool-card-label">Vị trí chèn</span>
                      <select class="st-multitool-card-select card-position">
                          <option value="0" ${card.position == 0 ? 'selected' : ''}>Trước định nghĩa nhân vật</option>
                          <option value="1" ${card.position == 1 ? 'selected' : ''}>Sau định nghĩa nhân vật</option>
                          <option value="2" ${card.position == 2 ? 'selected' : ''}>Trước tin nhắn ví dụ (↑EM)</option>
                          <option value="3" ${card.position == 3 ? 'selected' : ''}>Sau tin nhắn ví dụ (↓EM)</option>
                          <option value="4" ${card.position == 4 ? 'selected' : ''}>Trước ghi chú tác giả</option>
                          <option value="5" ${card.position == 5 ? 'selected' : ''}>Sau ghi chú tác giả</option>
                          <option value="6" ${card.position == 6 ? 'selected' : ''}>@D◆[Hệ thống] ở độ sâu</option>
                          <option value="7" ${card.position == 7 ? 'selected' : ''}>@D[Người dùng] ở độ sâu</option>
                          <option value="8" ${card.position == 8 ? 'selected' : ''}>@D[AI]ở độ sâu</option>
                      </select>
                  </div>
                  <div class="st-multitool-card-row card-depth-row" style="display: ${isDepthVisible ? 'flex' : 'none'};">
                      <span class="st-multitool-card-label">Độ sâu chèn</span><input type="number" class="st-multitool-card-input card-depth" value="${card.depth}" min="0">
                  </div>
                  <div class="st-multitool-card-row">
                      <span class="st-multitool-card-label">Thiết lập đệ quy</span>
                      <div style="display: flex; gap: 10px;">
                          <label class="st-multitool-checkbox-label"><input type="checkbox" class="card-prevent-in" ${card.preventIncoming ? 'checked' : ''}> Không bị đệ quy</label>
                          <label class="st-multitool-checkbox-label"><input type="checkbox" class="card-prevent-out" ${card.preventOutgoing ? 'checked' : ''}> Ngăn đệ quy thêm</label>
                      </div>
                  </div>
                  <div class="st-multitool-card-actions">
                      <button class="st-multitool-button st-multitool-btn-small sync-single-btn">Đồng bộ mục này</button>
                      <button class="st-multitool-button st-multitool-btn-small abandon delete-card-btn">Xóa</button>
                  </div>
              </div>
          </div>
      `;
  });

  $cardsContainer.html(cardsHtml);
}

export function applyBatchSettings() {
  const mode = $batchMode.val(),
    pos = $batchPosition.val(),
    dep = $batchDepth.val();
  const pIn = $batchPreventIn.is(':checked'),
    pOut = $batchPreventOut.is(':checked');
  let updated = false;
  extractedCards.forEach(c => {
    if (mode !== '') {
      c.mode = mode;
      updated = true;
    }
    if (pos !== '') {
      c.position = pos;
      updated = true;
    }
    if (dep !== '') {
      c.depth = parseInt(dep) || 0;
      updated = true;
    }
    c.preventIncoming = pIn;
    c.preventOutgoing = pOut;
    updated = true;
  });
  if (updated) {
    renderCards();
    toastr.success('Đã áp dụng cài đặt hàng loạt');
  }
}

export function buildEntryData(cardData) {
  const isConstant = cardData.mode === 'constant';
  let positionObj = { type: 'before_author_note', order: 100 };
  const posInt = parseInt(cardData.position);
  if (posInt === 0) positionObj.type = 'before_character_definition';
  else if (posInt === 1) positionObj.type = 'after_character_definition';
  else if (posInt === 2) positionObj.type = 'before_example_messages';
  else if (posInt === 3) positionObj.type = 'after_example_messages';
  else if (posInt === 4) positionObj.type = 'before_author_note';
  else if (posInt === 5) positionObj.type = 'after_author_note';
  else if (posInt >= 6 && posInt <= 8) {
    positionObj.type = 'at_depth';
    positionObj.depth = parseInt(cardData.depth) || 4;
    if (posInt === 6) positionObj.role = 'system';
    else if (posInt === 7) positionObj.role = 'user';
    else if (posInt === 8) positionObj.role = 'assistant';
  }
  let keysArray =
    !isConstant && cardData.keys
      ? cardData.keys
          .split(',')
          .map(k => k.trim())
          .filter(k => k)
      : [];
  return {
    name: cardData.name || 'Mục chưa có tên',
    content: cardData.content || '',
    enabled: true,
    strategy: { type: isConstant ? 'constant' : 'selective', keys: keysArray, scan_depth: 'same_as_global' },
    position: positionObj,
    probability: 100,
    recursion: {
      prevent_incoming: cardData.preventIncoming || false,
      prevent_outgoing: cardData.preventOutgoing || false,
      delay_until: null,
    },
    effect: { sticky: null, cooldown: null, delay: null },
  };
}

export async function syncEntries(cardsToSync, $btn = null) {
  const targetWb = $targetWbSelect.val();
  if (!targetWb) return toastr.warning('Hãy chọn Sổ thế giới đích trước');
  if (cardsToSync.length === 0) return toastr.warning('Không có mục để đồng bộ');
  if ($btn) $btn.prop('disabled', true).text('Đang đồng bộ...');
  try {
    const newEntries = cardsToSync.map(c => buildEntryData(c));
    await createLorebookEntries(targetWb, newEntries);
    toastr.success(`Đồng bộ thành công ${newEntries.length}  mục`);
    if ($btn) $btn.text('Đã đồng bộ').css({ 'border-color': 'var(--st-multitool-primary)', color: 'var(--st-multitool-primary)' });
  } catch (e) {
    toastr.error(`Đồng bộ thất bại: ${e.message}`);
    if ($btn)
      $btn
        .prop('disabled', false)
        .text('Đồng bộ thất bại')
        .css({ 'border-color': 'var(--st-multitool-danger)', color: 'var(--st-multitool-danger)' });
  }
}

export function removeCard(id) {
  extractedCards = extractedCards.filter(c => c.id !== id);
  renderCards();
}
