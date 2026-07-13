/**
 * debug-logger.js
 * Hệ thống ghi log chi tiết cho AI Agency để theo dõi chính xác từng request/response gửi lên LLM.
 */

const MAX_LOGS = 50;
window._stMultitoolAILogs = window._stMultitoolAILogs || [];

/**
 * Tạo mới 1 bản ghi log khi bắt đầu gửi request.
 * @param {Object} info
 * @returns {number} logId
 */
export function startDebugLog({ mode, endpoint, model, messages, options = {} }) {
  const logEntry = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
    mode,
    endpoint,
    model: model || 'default',
    messages: JSON.parse(JSON.stringify(messages || [])),
    options: JSON.parse(JSON.stringify(options)),
    status: 'SENDING',
    response: '',
    error: null,
    startTime: Date.now(),
    duration: 0,
  };

  window._stMultitoolAILogs.unshift(logEntry);
  if (window._stMultitoolAILogs.length > MAX_LOGS) {
    window._stMultitoolAILogs.pop();
  }

  notifyLogUpdate();
  return logEntry.id;
}

/**
 * Cập nhật log khi nhận stream chunk hoặc hoàn tất request.
 * @param {number} logId
 * @param {Object} update
 */
export function updateDebugLog(logId, { status, chunk, response, error }) {
  const entry = window._stMultitoolAILogs.find((l) => l.id === logId);
  if (!entry) return;

  if (status) entry.status = status;
  if (chunk) entry.response += chunk;
  if (response !== undefined) entry.response = response;
  if (error !== undefined) entry.error = error?.message || String(error);
  entry.duration = Date.now() - entry.startTime;

  notifyLogUpdate();
}

/**
 * Lấy danh sách logs hiện tại.
 */
export function getDebugLogs() {
  return window._stMultitoolAILogs;
}

/**
 * Xóa toàn bộ logs.
 */
export function clearDebugLogs() {
  window._stMultitoolAILogs = [];
  notifyLogUpdate();
}

function notifyLogUpdate() {
  window.dispatchEvent(new CustomEvent('st-multitool-ai-debug-update'));
}
