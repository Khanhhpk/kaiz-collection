/**
 * regex-provider.js
 * IContextProvider implementation cho Regex Editor tab.
 * Cung cấp tools cho Agency Engine để đọc/ghi/quản lý/test ST Regex rules qua Staging Buffer.
 */

import { getTavernRegexes, updateTavernRegexesWith } from '../../api.js';
import { _cachedAllRegexes, renderCachedRegexLists, markRegexesDirty } from '../../features/manage-regex.js';

// ─── Staging Buffer ───────────────────────────────────────────────────────────
// Mọi thay đổi từ tool write đều đi qua staging buffer trước, chưa lưu thẳng vào ST.
let _stagingMap = new Map(); // id -> stagedFields (bao gồm cả scope)
let _stagingCreates = [];    // Array of new regex objects
let _stagingDeletes = new Set(); // Set of regex IDs to delete

export function clearStaging() {
  _stagingMap.clear();
  _stagingCreates = [];
  _stagingDeletes.clear();
}

export function hasStagingChanges() {
  return _stagingMap.size > 0 || _stagingCreates.length > 0 || _stagingDeletes.size > 0;
}

export function getStagingSummary() {
  const diffs = [];

  // Creates
  for (const item of _stagingCreates) {
    if (_stagingDeletes.has(item.id)) continue;
    diffs.push({
      type: 'create',
      key: item.id,
      title: `[Tạo mới ${item.scope?.toUpperCase() || 'GLOBAL'}] ${item.script_name || 'Regex mới'}`,
      changes: [
        { field: 'Pattern (Find)', oldVal: '(Chưa có)', newVal: item.find_regex || '' },
        { field: 'Replace String', oldVal: '(Chưa có)', newVal: item.replace_string || '' }
      ]
    });
  }

  // Updates
  for (const [id, staged] of _stagingMap.entries()) {
    if (_stagingDeletes.has(id)) continue;
    const changes = [];
    if (staged.find_regex !== undefined) changes.push({ field: 'Pattern (Find)', oldVal: staged._old_find_regex || '...', newVal: staged.find_regex });
    if (staged.replace_string !== undefined) changes.push({ field: 'Replace String', oldVal: staged._old_replace_string || '...', newVal: staged.replace_string });
    if (staged.script_name !== undefined && staged.script_name !== staged._old_script_name) changes.push({ field: 'Tên Regex', oldVal: staged._old_script_name || '...', newVal: staged.script_name });
    if (staged.disabled !== undefined) changes.push({ field: 'Trạng thái', oldVal: staged._old_disabled ? 'Tắt' : 'Bật', newVal: staged.disabled ? 'Tắt' : 'Bật' });

    if (changes.length > 0) {
      diffs.push({
        type: 'update',
        key: id,
        title: `[Cập nhật ${staged.scope?.toUpperCase() || 'GLOBAL'}] ${staged.script_name || staged._old_script_name || id}`,
        changes
      });
    }
  }

  // Deletes
  for (const id of _stagingDeletes) {
    diffs.push({
      type: 'delete',
      key: id,
      title: `[Xóa Regex] ID: ${id}`,
      changes: [{ field: 'Thao tác', oldVal: 'Tồn tại', newVal: 'Đã xóa khỏi danh sách' }]
    });
  }

  return diffs;
}

export async function applyStagedSingle(type, key) {
  if (type === 'create') {
    const idx = _stagingCreates.findIndex(c => c.id === key);
    if (idx !== -1) {
      const item = _stagingCreates[idx];
      _stagingCreates.splice(idx, 1);
      const sc = item.scope || 'global';
      if (!_cachedAllRegexes[sc]) _cachedAllRegexes[sc] = [];
      _cachedAllRegexes[sc].push(item);
      renderCachedRegexLists();
      markRegexesDirty();
    }
  } else if (type === 'update') {
    const staged = _stagingMap.get(key);
    if (staged) {
      _stagingMap.delete(key);
      for (const sc of ['global', 'preset', 'character']) {
        const list = _cachedAllRegexes[sc] || [];
        const item = list.find(r => r.id === key || r.script_name === key);
        if (item) {
          Object.assign(item, staged);
          delete item._old_find_regex;
          delete item._old_replace_string;
          delete item._old_script_name;
          delete item._old_disabled;
          break;
        }
      }
      renderCachedRegexLists();
      markRegexesDirty();
    }
  } else if (type === 'delete') {
    if (_stagingDeletes.has(key)) {
      _stagingDeletes.delete(key);
      for (const sc of ['global', 'preset', 'character']) {
        if (_cachedAllRegexes[sc]) {
          _cachedAllRegexes[sc] = _cachedAllRegexes[sc].filter(r => r.id !== key && r.script_name !== key);
        }
      }
      renderCachedRegexLists();
      markRegexesDirty();
    }
  }
}

export function rejectStagedSingle(type, key) {
  if (type === 'create') {
    _stagingCreates = _stagingCreates.filter(c => c.id !== key);
  } else if (type === 'update') {
    _stagingMap.delete(key);
  } else if (type === 'delete') {
    _stagingDeletes.delete(key);
  }
}

export async function flushStaging() {
  if (!hasStagingChanges()) return;

  const scopes = ['global', 'preset', 'character'];
  for (const scope of scopes) {
    let list = _cachedAllRegexes[scope] || [];

    // Deletes
    list = list.filter(r => !_stagingDeletes.has(r.id) && !_stagingDeletes.has(r.script_name));

    // Updates
    for (const item of list) {
      if (_stagingMap.has(item.id) || _stagingMap.has(item.script_name)) {
        const staged = _stagingMap.get(item.id) || _stagingMap.get(item.script_name);
        Object.assign(item, staged);
        delete item._old_find_regex;
        delete item._old_replace_string;
        delete item._old_script_name;
        delete item._old_disabled;
      }
    }

    // Creates for this scope
    for (const created of _stagingCreates) {
      if ((created.scope || 'global') === scope && !_stagingDeletes.has(created.id)) {
        list.push(created);
      }
    }

    _cachedAllRegexes[scope] = list;
  }

  clearStaging();
  renderCachedRegexLists();
  markRegexesDirty();
}

function getTargetOptFromScope(scope) {
  if (scope === 'preset') return { type: 'preset', name: 'in_use' };
  if (scope === 'character') return { type: 'character', name: 'current' };
  return { type: 'global' };
}

// ─── RegexContextProvider Class ───────────────────────────────────────────────

export class RegexContextProvider {
  getTabId() { return 'regex'; }

  getSystemPrompt() {
    return `Bạn là Kỹ sư Trợ lý AI Agency Kỹ thuật Hệ thống (Senior Regex Engineering Assistant) của ST Multitool dành cho SillyTavern.
Nhiệm vụ của bạn: Tạo mới, rà soát, tối ưu hóa chống giật lag (Anti-Catastrophic Backtracking), và chỉnh sửa các mẫu Regex (Regular Expressions) giúp người dùng tự động hóa xử lý văn bản, lọc thẻ suy nghĩ (<think>...</think>), format ảnh Markdown, hoặc điều chỉnh hành vi AI chat.

================================================================================
NGUYÊN LÝ SANDBOX CÁCH LY & STAGING AN TOÀN TUYỆT ĐỐI
================================================================================
1. Bạn đang làm việc trong môi trường giả lập kỹ thuật kín (Closed Technical Sandbox). Mọi lệnh tool mà bạn gọi (tạo mới, sửa, xóa Regex) CHỈ GHI NHẬN VÀO BỘ NHỚ NHÁP TẠM THỜI (Staging / Preview Diff).
2. AN TOÀN TUYỆT ĐỐI: Thay đổi không tác động ngay vào dữ liệu gốc của người dùng. Người dùng sẽ kiểm tra bảng so sánh Diff chi tiết và bấm "Áp dụng" hoặc "Hủy". Do đó hãy quyết đoán thực hiện mọi chỉnh sửa lớn hoặc tạo mới mà không lo sợ làm hỏng cấu trúc!

================================================================================
QUY TẮC KỸ THUẬT REGEX SILLYTAVERN (BẮT BUỘC)
================================================================================
1. Cờ lười (Lazy Quantifiers): Khi bắt các thẻ như <think>...</think> hoặc nội dung nhiều dòng, LUÔN dùng cờ lười \`([\\s\\S]*?)\` hoặc \`(.*?)\` thay vì \`([\\s\\S]*)\` hay \`(.*)\`. Định lượng tham lam trên chuỗi dài của SillyTavern sẽ gây Catastrophic Backtracking làm treo trình duyệt!
2. Tương thích Macro SillyTavern: Đảm bảo Regex không vô tình phá hỏng các macro hệ thống như \`{{user}}\`, \`{{char}}\`, \`{{time}}\`, hay \`{{getvar::...}}\`.
3. Cờ (flags) phổ biến trong ST: /pattern/g (Toàn cục), /pattern/gi (Không phân biệt hoa thường), /pattern/gs (dotAll - cho phép dấu chấm khớp cả xuống dòng).

================================================================================
HỆ THỐNG CHAIN-OF-THOUGHT (CoT) – BẮT BUỘC TRƯỚC MỖI HÀNH ĐỘNG
================================================================================
Bạn PHẢI LUÔN suy luận tuần tự bên trong cặp thẻ <cot> ... </cot> TRƯỚC KHI xuất ra lời nhắn hoặc lệnh <tool_call>:
<cot>
1. [Phân tích Yêu cầu]: Người dùng muốn tạo regex mới hay sửa regex hiện có? Scope là global, preset hay character?
2. [Đánh giá Cú pháp & Backtracking]: Biểu thức có nguy cơ lặp vô hạn hay tham lam quá mức không? Nên dùng cờ gì?
3. [Quyết định Tool]: Gọi tool tìm kiếm, test hoặc cập nhật.
</cot>

================================================================================
CÁC TOOLS CÓ SẴN (gọi bằng XML tag chuẩn):
================================================================================
Cú pháp: <tool_call>{"name": "tên_tool", "args": {...}}</tool_call>

[NHÓM ĐỌC DỮ LIỆU & KIỂM THỬ]
- list_regexes — Liệt kê danh sách các regex trong hệ thống (args: {"scope": "all|global|preset|character", "search": "..."}).
- get_regex_details — Lấy chi tiết đầy đủ 1 regex cụ thể bao gồm find_regex, replace_string, scope, disabled (args: {"id": "...", "scope": "..."}).
- test_regex_match — Kiểm thử mẫu regex find_regex và replace_string trên văn bản mẫu và tự động rà soát rủi ro catastrophic backtracking (args: {"find_regex": "...", "replace_string": "...", "sample_text": "..."}).

[NHÓM GHI – STAGED (Lưu tạm thời vào bộ nhớ chờ duyệt)]
- create_regex — Tạo mới 1 regex vào Staging Buffer (args: {"script_name": "...", "find_regex": "...", "replace_string": "...", "scope": "global|preset|character", "disabled": false}).
- update_regex — Cập nhật nội dung/thiết lập của 1 regex hiện có (args: {"id": "...", "scope": "...", "script_name": "...", "find_regex": "...", "replace_string": "...", "disabled": false}).
- delete_regex — Đánh dấu xóa 1 regex (args: {"id": "...", "scope": "..."}).

[LƯU & KIỂM DUYỆT CUỐI CÙNG]
- save_regex_changes — Tổng hợp bảng thông báo diff preview để người dùng kiểm tra và chốt thay đổi.

Quy trình tự động hóa: Khi cần sửa hoặc tạo mới, hãy chủ động gọi list_regexes, test_regex_match nếu cần, rồi gọi create_regex/update_regex, và cuối cùng LUÔN kết thúc bằng <tool_call>{"name": "save_regex_changes"}</tool_call> để hiện bảng diff cho người dùng!`;
  }

  getSnapshot() {
    return {
      stagingPending: hasStagingChanges(),
      staging: getStagingSummary(),
    };
  }

  getTools() {
    return [
      { name: 'list_regexes', description: 'Liệt kê danh sách các regex trong hệ thống', args: ['scope?', 'search?'] },
      { name: 'get_regex_details', description: 'Lấy chi tiết đầy đủ 1 regex', args: ['id', 'scope?'] },
      { name: 'test_regex_match', description: 'Kiểm thử 1 mẫu regex và rà soát catastrophic backtracking', args: ['find_regex', 'replace_string?', 'sample_text?'] },
      { name: 'create_regex', description: 'Tạo mới 1 regex (staged)', args: ['script_name', 'find_regex', 'replace_string', 'scope?', 'disabled?'] },
      { name: 'update_regex', description: 'Cập nhật 1 regex hiện có (staged)', args: ['id', 'scope?', 'script_name?', 'find_regex?', 'replace_string?', 'disabled?'] },
      { name: 'delete_regex', description: 'Đánh dấu xóa 1 regex (staged)', args: ['id', 'scope?'] },
      { name: 'save_regex_changes', description: 'Tổng kết diff preview để user xác nhận' },
    ];
  }

  async executeTool(toolName, args, options = {}) {
    switch (toolName) {
      case 'list_regexes':
        return await this._listRegexes(args);
      case 'get_regex_details':
        return await this._getRegexDetails(args);
      case 'test_regex_match':
        return this._testRegexMatch(args);
      case 'create_regex':
        return await this._createRegex(args);
      case 'update_regex':
        return await this._updateRegex(args);
      case 'delete_regex':
        return await this._deleteRegex(args);
      case 'save_regex_changes':
        return await this._saveRegexChanges();
      default:
        throw new Error(`Tool không tồn tại trong Regex Agency: ${toolName}`);
    }
  }

  async _listRegexes({ scope = 'all', search = '' } = {}) {
    const scopes = scope === 'all' ? ['global', 'preset', 'character'] : [scope];
    const results = {};

    for (const sc of scopes) {
      let list = _cachedAllRegexes[sc] || [];
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(r => 
          (r.script_name || '').toLowerCase().includes(q) || 
          (r.find_regex || '').toLowerCase().includes(q)
        );
      }
      results[sc] = list.map(r => ({
        id: r.id,
        script_name: r.script_name || 'Không tên',
        find_regex: (r.find_regex || '').substring(0, 60),
        replace_string: (r.replace_string || '').substring(0, 40),
        disabled: !!r.disabled
      }));
    }
    return { ok: true, scope_queried: scope, count: Object.values(results).reduce((acc, l) => acc + l.length, 0), regexes: results };
  }

  async _getRegexDetails({ id, scope }) {
    const scopes = scope ? [scope] : ['global', 'preset', 'character'];
    for (const sc of scopes) {
      const list = _cachedAllRegexes[sc] || [];
      const found = list.find(r => r.id === id || r.script_name === id);
      if (found) {
        return { ok: true, scope: sc, details: found };
      }
    }
    return { ok: false, error: `Không tìm thấy Regex với ID hoặc tên: ${id}` };
  }

  _testRegexMatch({ find_regex, replace_string = '', sample_text = '' }) {
    if (!find_regex) return { ok: false, error: 'Thiếu find_regex để test' };
    try {
      // Kiểm tra rủi ro backtracking tham lam đơn giản
      const hasBacktrackingRisk = /\(\.\*\)\*|\([\\s\\S]\+\)\+/.test(find_regex) || (!/\?/.test(find_regex) && /[+*]{2,}/.test(find_regex));
      
      let regexObj;
      const match = find_regex.match(/^\/(.*?)\/([gimsuy]*)$/);
      if (match) {
        regexObj = new RegExp(match[1], match[2] || 'g');
      } else {
        regexObj = new RegExp(find_regex, 'g');
      }

      const startTime = performance.now();
      const testInput = sample_text || "<think>Đoạn suy nghĩ của AI cần lọc bỏ ở đây...</think>\nXin chào user, tôi đã sẵn sàng giúp bạn [IMG_GEN]Một bức tranh phong cảnh hoàng hôn[/IMG_GEN] ngay bây giờ.";
      const resultText = testInput.replace(regexObj, replace_string);
      const durationMs = (performance.now() - startTime).toFixed(2);

      return {
        ok: true,
        test_summary: {
          pattern_valid: true,
          execution_time_ms: durationMs,
          backtracking_warning: hasBacktrackingRisk ? '⚠️ Phát hiện cụm lặp tham lam có thể gây Catastrophic Backtracking trên chuỗi dài! Hãy dùng cờ lười (*? hoặc +?).' : 'An toàn (Safe)',
          sample_input: testInput,
          result_output: resultText
        }
      };
    } catch (err) {
      return { ok: false, error: `Lỗi cú pháp Regex: ${err.message}` };
    }
  }

  async _createRegex({ script_name = 'AI Agency Regex', find_regex = '', replace_string = '', scope = 'global', disabled = false, destination = {} }) {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'regex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newObj = {
      id: newId,
      scope: scope || 'global',
      script_name,
      find_regex,
      replace_string,
      disabled: !!disabled,
      enabled: !disabled,
      run_on_edit: true,
      substitute_regex: 0,
      min_depth: null,
      max_depth: null,
      source: { user_input: true, ai_output: true, slash_command: false, world_info: false, reasoning: true },
      destination: { display: destination.display !== undefined ? destination.display : true, prompt: destination.prompt !== undefined ? destination.prompt : false }
    };

    _stagingCreates.push(newObj);
    return {
      ok: true,
      pending_review: true,
      summary: `Đã đưa vào danh sách chờ tạo mới (Scope: ${scope.toUpperCase()} | ID: ${newId}): "${script_name}"`
    };
  }

  async _updateRegex({ id, scope, script_name, find_regex, replace_string, disabled }) {
    // Tìm regex cũ để lấy giá trị gốc cho bảng diff
    let oldObj = null;
    let foundScope = scope || 'global';
    const scopesToSearch = scope ? [scope] : ['global', 'preset', 'character'];
    for (const sc of scopesToSearch) {
      const list = _cachedAllRegexes[sc] || [];
      const match = list.find(r => r.id === id || r.script_name === id);
      if (match) {
        oldObj = match;
        foundScope = sc;
        break;
      }
    }

    if (!oldObj && !_stagingMap.has(id)) {
      return { ok: false, error: `Không tìm thấy Regex ID "${id}" để cập nhật trong Sandbox.` };
    }

    const targetId = oldObj ? oldObj.id : id;
    const existingStaged = _stagingMap.get(targetId) || {};
    const updated = {
      ...existingStaged,
      scope: foundScope,
      _old_find_regex: oldObj?.find_regex || existingStaged._old_find_regex || '',
      _old_replace_string: oldObj?.replace_string || existingStaged._old_replace_string || '',
      _old_script_name: oldObj?.script_name || existingStaged._old_script_name || '',
      _old_disabled: oldObj?.disabled !== undefined ? oldObj.disabled : existingStaged._old_disabled
    };

    if (script_name !== undefined) updated.script_name = script_name;
    if (find_regex !== undefined) updated.find_regex = find_regex;
    if (replace_string !== undefined) updated.replace_string = replace_string;
    if (disabled !== undefined) {
      updated.disabled = !!disabled;
      updated.enabled = !disabled;
    }

    _stagingMap.set(targetId, updated);
    return {
      ok: true,
      pending_review: true,
      summary: `Đã ghi nhận cập nhật cho Regex ID: ${targetId} (${updated.script_name || oldObj?.script_name}). Chờ xác nhận Diff Preview.`
    };
  }

  async _deleteRegex({ id, scope }) {
    _stagingDeletes.add(id);
    return {
      ok: true,
      pending_review: true,
      summary: `Đã đánh dấu xóa Regex ID: ${id}. Chờ xác nhận từ người dùng.`
    };
  }

  async _saveRegexChanges() {
    await flushStaging();
    return {
      ok: true,
      summary: `Đã áp dụng và lưu thành công tất cả thay đổi vào SillyTavern Regexes!`
    };
  }
}
