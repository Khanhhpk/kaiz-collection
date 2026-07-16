/**
 * regex-provider.js
 * IContextProvider implementation cho Regex Editor tab.
 * Cung cấp tools cho Agency Engine để đọc/ghi/quản lý/test ST Regex rules qua Staging Buffer.
 */

import { getTavernRegexes } from '../../api.js';
import { _cachedAllRegexes, renderCachedRegexLists, markRegexesDirty } from '../../features/manage-regex.js';

// ─── Attribute Normalizer ─────────────────────────────────────────────────────
// Chuẩn hóa và đồng bộ 100% giữa thuộc tính gốc của SillyTavern (snake_case/camelCase) & Trợ lý AI Agency
export function normalizeRegexAttributes(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  // 1. Script Name
  if (obj.script_name !== undefined) obj.scriptName = obj.script_name;
  else if (obj.scriptName !== undefined) obj.script_name = obj.scriptName;
  else if (!obj.script_name && !obj.scriptName) { obj.script_name = 'Regex chưa có tên'; obj.scriptName = 'Regex chưa có tên'; }

  // 2. Find Pattern & Replace String
  if (obj.find_regex !== undefined) obj.findRegex = obj.find_regex;
  else if (obj.findRegex !== undefined) obj.find_regex = obj.findRegex;
  else { obj.find_regex = ''; obj.findRegex = ''; }

  if (obj.replace_string !== undefined) obj.replaceString = obj.replace_string;
  else if (obj.replaceString !== undefined) obj.replace_string = obj.replaceString;
  else { obj.replace_string = ''; obj.replaceString = ''; }

  // 3. Trim Strings (Chuỗi cần loại bỏ trước khi replace)
  if (obj.trim_strings !== undefined) {
    if (Array.isArray(obj.trim_strings)) {
      obj.trimStrings = obj.trim_strings;
      obj.trim_strings = obj.trim_strings.join('\n');
    } else if (typeof obj.trim_strings === 'string') {
      obj.trimStrings = obj.trim_strings.split('\n').map(s => s.trim()).filter(s => s !== '');
    }
  } else if (obj.trimStrings !== undefined) {
    if (Array.isArray(obj.trimStrings)) {
      obj.trim_strings = obj.trimStrings.join('\n');
    } else if (typeof obj.trimStrings === 'string') {
      obj.trim_strings = obj.trimStrings;
      obj.trimStrings = obj.trimStrings.split('\n').map(s => s.trim()).filter(s => s !== '');
    }
  } else {
    obj.trimStrings = [];
    obj.trim_strings = '';
  }

  // 4. Options: run_on_edit, substitute_regex, min_depth, max_depth
  if (obj.run_on_edit !== undefined) obj.runOnEdit = !!obj.run_on_edit;
  else if (obj.runOnEdit !== undefined) obj.run_on_edit = !!obj.runOnEdit;
  else { obj.runOnEdit = true; obj.run_on_edit = true; }

  if (obj.substitute_regex !== undefined) obj.substituteRegex = parseInt(obj.substitute_regex) || 0;
  else if (obj.substituteRegex !== undefined) obj.substitute_regex = parseInt(obj.substituteRegex) || 0;
  else { obj.substituteRegex = 0; obj.substitute_regex = 0; }

  if (obj.min_depth !== undefined) obj.minDepth = obj.min_depth !== null && obj.min_depth !== '' ? parseInt(obj.min_depth) : null;
  else if (obj.minDepth !== undefined) obj.min_depth = obj.minDepth !== null && obj.minDepth !== '' ? parseInt(obj.minDepth) : null;
  else { obj.minDepth = null; obj.min_depth = null; }

  if (obj.max_depth !== undefined) obj.maxDepth = obj.max_depth !== null && obj.max_depth !== '' ? parseInt(obj.max_depth) : null;
  else if (obj.maxDepth !== undefined) obj.max_depth = obj.maxDepth !== null && obj.maxDepth !== '' ? parseInt(obj.maxDepth) : null;
  else { obj.maxDepth = null; obj.max_depth = null; }

  // 5. Destination (markdownOnly / promptOnly)
  if (!obj.destination) obj.destination = {};
  if (obj.markdown_only !== undefined) {
    obj.markdownOnly = !!obj.markdown_only;
    obj.destination.display = obj.markdownOnly;
  } else if (obj.markdownOnly !== undefined) {
    obj.markdown_only = !!obj.markdownOnly;
    obj.destination.display = obj.markdownOnly;
  } else if (obj.destination?.display !== undefined) {
    obj.markdownOnly = !!obj.destination.display;
    obj.markdown_only = obj.markdownOnly;
  } else {
    obj.markdownOnly = true;
    obj.markdown_only = true;
    obj.destination.display = true;
  }

  if (obj.prompt_only !== undefined) {
    obj.promptOnly = !!obj.prompt_only;
    obj.destination.prompt = obj.promptOnly;
  } else if (obj.promptOnly !== undefined) {
    obj.prompt_only = !!obj.promptOnly;
    obj.destination.prompt = obj.promptOnly;
  } else if (obj.destination?.prompt !== undefined) {
    obj.promptOnly = !!obj.destination.prompt;
    obj.prompt_only = obj.promptOnly;
  } else {
    obj.promptOnly = false;
    obj.prompt_only = false;
    obj.destination.prompt = false;
  }

  // 6. Placement & Source (Phạm vi áp dụng)
  // ST placement numbers: 1 = User Input, 2 = AI Output, 3/4 = Slash Commands, 5/3 = World Info, 6/5 = Reasoning
  if (obj.placement && Array.isArray(obj.placement)) {
    obj.source = {
      user_input: obj.placement.includes(1),
      ai_output: obj.placement.includes(2),
      slash_command: obj.placement.includes(3) || obj.placement.includes(4),
      world_info: obj.placement.includes(5) || (obj.placement.includes(3) && !obj.placement.includes(4)),
      reasoning: obj.placement.includes(6) || obj.placement.includes(5)
    };
  } else if (obj.source && typeof obj.source === 'object') {
    const p = [];
    if (obj.source.user_input) p.push(1);
    if (obj.source.ai_output) p.push(2);
    if (obj.source.slash_command) p.push(4);
    if (obj.source.world_info) p.push(3);
    if (obj.source.reasoning) p.push(5);
    obj.placement = p.length ? p : [2];
  } else {
    obj.placement = [2];
    obj.source = { user_input: false, ai_output: true, slash_command: false, world_info: false, reasoning: false };
  }

  if (obj.disabled !== undefined) {
    obj.disabled = !!obj.disabled;
    obj.enabled = !obj.disabled;
  } else if (obj.enabled !== undefined) {
    obj.enabled = !!obj.enabled;
    obj.disabled = !obj.enabled;
  } else {
    obj.disabled = false;
    obj.enabled = true;
  }

  return obj;
}

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
        { field: 'Replace String', oldVal: '(Chưa có)', newVal: item.replace_string || '' },
        { field: 'Trim Strings', oldVal: '(Chưa có)', newVal: item.trim_strings || '(Không)' },
        { field: 'Phạm vi (Placement)', oldVal: '(Chưa có)', newVal: JSON.stringify(item.placement || [2]) },
        { field: 'Tùy chọn khác', oldVal: '(Chưa có)', newVal: `runOnEdit=${item.run_on_edit}, sub=${item.substitute_regex}, depth=[${item.min_depth ?? 'min'},${item.max_depth ?? 'max'}], display=${item.markdown_only}, prompt=${item.prompt_only}` }
      ]
    });
  }

  // Updates
  for (const [id, staged] of _stagingMap.entries()) {
    if (_stagingDeletes.has(id)) continue;
    const changes = [];
    if (staged.find_regex !== undefined) changes.push({ field: 'Pattern (Find)', oldVal: staged._old_find_regex || '...', newVal: staged.find_regex });
    if (staged.replace_string !== undefined) changes.push({ field: 'Replace String', oldVal: staged._old_replace_string || '...', newVal: staged.replace_string });
    if (staged.trim_strings !== undefined && staged.trim_strings !== staged._old_trim_strings) changes.push({ field: 'Trim Strings', oldVal: staged._old_trim_strings || '...', newVal: staged.trim_strings });
    if (staged.script_name !== undefined && staged.script_name !== staged._old_script_name) changes.push({ field: 'Tên Regex', oldVal: staged._old_script_name || '...', newVal: staged.script_name });
    if (staged.disabled !== undefined && staged.disabled !== staged._old_disabled) changes.push({ field: 'Trạng thái', oldVal: staged._old_disabled ? 'Tắt' : 'Bật', newVal: staged.disabled ? 'Tắt' : 'Bật' });
    if (staged.placement !== undefined && JSON.stringify(staged.placement) !== JSON.stringify(staged._old_placement)) changes.push({ field: 'Phạm vi áp dụng', oldVal: JSON.stringify(staged._old_placement || []), newVal: JSON.stringify(staged.placement) });
    if (staged.run_on_edit !== undefined && staged.run_on_edit !== staged._old_run_on_edit) changes.push({ field: 'Chạy khi chỉnh sửa', oldVal: String(staged._old_run_on_edit), newVal: String(staged.run_on_edit) });
    if (staged.substitute_regex !== undefined && staged.substitute_regex !== staged._old_substitute_regex) changes.push({ field: 'Macro Find Regex', oldVal: String(staged._old_substitute_regex), newVal: String(staged.substitute_regex) });
    if (staged.min_depth !== undefined && staged.min_depth !== staged._old_min_depth) changes.push({ field: 'Min Depth', oldVal: String(staged._old_min_depth ?? 'null'), newVal: String(staged.min_depth ?? 'null') });
    if (staged.max_depth !== undefined && staged.max_depth !== staged._old_max_depth) changes.push({ field: 'Max Depth', oldVal: String(staged._old_max_depth ?? 'null'), newVal: String(staged.max_depth ?? 'null') });
    if (staged.markdown_only !== undefined && staged.markdown_only !== staged._old_markdown_only) changes.push({ field: 'Alter Chat Display', oldVal: String(staged._old_markdown_only), newVal: String(staged.markdown_only) });
    if (staged.prompt_only !== undefined && staged.prompt_only !== staged._old_prompt_only) changes.push({ field: 'Alter Outgoing Prompt', oldVal: String(staged._old_prompt_only), newVal: String(staged.prompt_only) });

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
      normalizeRegexAttributes(item);
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
          delete item._old_trim_strings;
          delete item._old_script_name;
          delete item._old_disabled;
          delete item._old_placement;
          delete item._old_run_on_edit;
          delete item._old_substitute_regex;
          delete item._old_min_depth;
          delete item._old_max_depth;
          delete item._old_markdown_only;
          delete item._old_prompt_only;
          normalizeRegexAttributes(item);
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
        delete item._old_trim_strings;
        delete item._old_script_name;
        delete item._old_disabled;
        delete item._old_placement;
        delete item._old_run_on_edit;
        delete item._old_substitute_regex;
        delete item._old_min_depth;
        delete item._old_max_depth;
        delete item._old_markdown_only;
        delete item._old_prompt_only;
        normalizeRegexAttributes(item);
      }
    }

    // Creates for this scope
    for (const created of _stagingCreates) {
      if ((created.scope || 'global') === scope && !_stagingDeletes.has(created.id)) {
        normalizeRegexAttributes(created);
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
  constructor() {
    this._targetRegexId = '__AUTO__';
  }

  get tabId() { return 'regex'; }
  getTabId() { return 'regex'; }

  setTargetRegexId(id) {
    this._targetRegexId = id || '__AUTO__';
  }

  getSystemPrompt() {
    let targetSection = '';
    let toolListText = '';

    if (this._targetRegexId === '__AUTO__') {
      targetSection = `\n================================================================================\n🎯 CHẾ ĐỘ HOẠT ĐỘNG: REGEX AGENCY TỰ ĐỘNG TOÀN QUYỀN (AUTO / GLOBAL MODE)\n================================================================================\nBạn đang làm việc trên quy mô rộng, quản lý toàn bộ danh sách Regex hiện có của người dùng.\n- Bạn được phép tự do tìm kiếm, liệt kê ('list_regexes'), rà soát chi tiết ('get_regex_details'), và tự chủ gọi 'create_regex', 'update_regex', hay 'delete_regex' theo yêu cầu của người dùng.\n`;
      toolListText = `[NHÓM ĐỌC DỮ LIỆU & KIỂM THỬ]
- list_regexes — Liệt kê danh sách các regex trong hệ thống (args: {"scope": "all|global|preset|character", "search": "..."}).
- get_regex_details — Lấy chi tiết đầy đủ 1 regex cụ thể bao gồm find_regex, replace_string, scope, disabled (args: {"id": "...", "scope": "..."}).
- test_regex_match — Kiểm thử mẫu regex find_regex và replace_string trên văn bản mẫu và tự động rà soát rủi ro catastrophic backtracking (args: {"find_regex": "...", "replace_string": "...", "sample_text": "..."}).

[NHÓM GHI – STAGED (Lưu tạm thời vào bộ nhớ chờ duyệt)]
- create_regex — Tạo mới 1 regex vào Staging Buffer (args: {"script_name": "...", "find_regex": "...", "replace_string": "...", "scope": "global|preset|character", "disabled": false}).
- update_regex — Cập nhật nội dung/thiết lập của 1 regex hiện có (args: {"id": "...", "scope": "...", "script_name": "...", "find_regex": "...", "replace_string": "...", "disabled": false}).
- delete_regex — Đánh dấu xóa 1 regex (args: {"id": "...", "scope": "..."}).

[LƯU & KIỂM DUYỆT CUỐI CÙNG]
- save_regex_changes — Tổng hợp bảng thông báo diff preview để người dùng kiểm tra và chốt thay đổi.`;
    } else if (this._targetRegexId === '__NEW__') {
      targetSection = `\n================================================================================\n✨ CHẾ ĐỘ HOẠT ĐỘNG: TẠO REGEX MỚI TỪ ĐẦU (CREATE NEW REGEX)\n================================================================================\nBạn đang tập trung cùng người dùng thiết kế mới 1 biểu thức Regex từ mô tả ngôn ngữ tự nhiên.\n- Hãy sử dụng 'test_regex_match' để chạy thử mẫu trước nếu cần, sau đó gọi 'create_regex' để đưa vào Sandbox.\n`;
      toolListText = `[NHÓM ĐỌC DỮ LIỆU & KIỂM THỬ]
- list_regexes — Liệt kê danh sách các regex trong hệ thống (args: {"scope": "all|global|preset|character", "search": "..."}).
- get_regex_details — Lấy chi tiết đầy đủ 1 regex cụ thể (args: {"id": "...", "scope": "..."}).
- test_regex_match — Kiểm thử mẫu regex find_regex và replace_string trên văn bản mẫu và rà soát catastrophic backtracking (args: {"find_regex": "...", "replace_string": "...", "sample_text": "..."}).

[NHÓM GHI – STAGED (Lưu tạm thời vào bộ nhớ chờ duyệt)]
- create_regex — Tạo mới 1 regex vào Staging Buffer (args: {"script_name": "...", "find_regex": "...", "replace_string": "...", "scope": "global|preset|character", "disabled": false}).

[LƯU & KIỂM DUYỆT CUỐI CÙNG]
- save_regex_changes — Tổng hợp bảng thông báo diff preview để người dùng kiểm tra và chốt thay đổi.`;
    } else {
      let targetObj = null;
      for (const sc of ['global', 'preset', 'character']) {
        if (_cachedAllRegexes[sc]) {
          const found = _cachedAllRegexes[sc].find(r => r.id === this._targetRegexId || r.script_name === this._targetRegexId);
          if (found) {
            targetObj = normalizeRegexAttributes(found);
            break;
          }
        }
      }
      if (targetObj) {
        const trimStr = Array.isArray(targetObj.trimStrings) ? targetObj.trimStrings.join('\n') : (targetObj.trim_strings || '');
        const placementArr = targetObj.placement ? JSON.stringify(targetObj.placement) : JSON.stringify(targetObj.source || {});
        targetSection = `\n================================================================================\n🎯 CHẾ ĐỘ HOẠT ĐỘNG: TẬP TRUNG CHỈNH SỬA REGEX MỤC TIÊU\n================================================================================\nNgười dùng và bạn đang TẬP TRUNG 100% vào việc rà soát và chỉnh sửa đúng biểu thức Regex sau:\n- ID: "${targetObj.id || ''}"\n- Tên (script_name): "${targetObj.script_name || 'Không tên'}"\n- Phân loại (scope): "${targetObj.scope || 'global'}"\n- Trạng thái: ${targetObj.disabled ? 'Đang tắt (disabled)' : 'Đang bật (enabled)'}\n- Pattern (find_regex): \`${targetObj.find_regex || ''}\`\n- Replace string: \`${targetObj.replace_string || ''}\`\n- Chuỗi cần loại bỏ trước khi replace (trim_strings): \`${trimStr || '(Không có)'}\`\n- Phạm vi áp dụng (placement/source): ${placementArr} (1=User Input, 2=AI Output, 3=Slash Cmds, 5=World Info, 6=Reasoning)\n- Khả năng áp dụng (markdown_only/prompt_only): markdown_only=${targetObj.markdownOnly ?? true}, prompt_only=${targetObj.promptOnly ?? false}\n- Tùy chọn khác: run_on_edit=${targetObj.runOnEdit ?? true}, substitute_regex=${targetObj.substituteRegex ?? 0}, min_depth=${targetObj.minDepth ?? null}, max_depth=${targetObj.maxDepth ?? null}\n\nQuy tắc tập trung (Focused Editing Rules):\n1. Các tool chung không cần thiết (list_regexes, create_regex, delete_regex) đã được ngắt bỏ. Bạn CHỈ CẦN gọi tool 'update_regex' với tham số \`id: "${targetObj.id || targetObj.script_name}"\` để cập nhật Pattern, Replace string, Chuỗi cần loại bỏ (trim_strings), Phạm vi áp dụng (placement), Độ sâu (min_depth/max_depth), hoặc các thiết lập khác của chính Regex này!\n2. Sử dụng 'test_regex_match' nếu bạn hoặc người dùng muốn kiểm thử khớp chuỗi trước hoặc sau khi sửa.\n`;
      } else {
        targetSection = `\n================================================================================\n🎯 CHẾ ĐỘ HOẠT ĐỘNG: TẬP TRUNG CHỈNH SỬA REGEX ID: "${this._targetRegexId}"\n================================================================================\nBạn đang tập trung chỉnh sửa độc quyền cho Regex có ID/Tên là "${this._targetRegexId}".\n`;
      }
      toolListText = `[NHÓM KIỂM THỬ & RÀ SOÁT]
- get_regex_details — Lấy chi tiết đầy đủ 1 regex cụ thể (args: {"id": "${this._targetRegexId}"}).
- test_regex_match — Kiểm thử mẫu regex find_regex và replace_string trên văn bản mẫu và rà soát catastrophic backtracking (args: {"find_regex": "...", "replace_string": "...", "sample_text": "..."}).

[NHÓM GHI – STAGED (Lưu tạm thời vào bộ nhớ chờ duyệt)]
- update_regex — Cập nhật nội dung/thiết lập của Regex mục tiêu hiện tại (args: {"id": "${this._targetRegexId}", "scope": "...", "script_name": "...", "find_regex": "...", "replace_string": "...", "trim_strings": "...", "placement": [2], "disabled": false, "run_on_edit": true, "substitute_regex": 0, "min_depth": null, "max_depth": null, "markdown_only": true, "prompt_only": false}).

[LƯU & KIỂM DUYỆT CUỐI CÙNG]
- save_regex_changes — Tổng hợp bảng thông báo diff preview để người dùng kiểm tra và chốt thay đổi.`;
    }

    return `Bạn là Kỹ sư Trợ lý AI Agency Kỹ thuật Hệ thống (Senior Regex Engineering Assistant) của ST Multitool dành cho SillyTavern.
Nhiệm vụ của bạn: Tạo mới, rà soát, tối ưu hóa chống giật lag (Anti-Catastrophic Backtracking), và chỉnh sửa các mẫu Regex (Regular Expressions) giúp người dùng tự động hóa xử lý văn bản, lọc thẻ suy nghĩ (<think>...</think>), format ảnh Markdown, hoặc điều chỉnh hành vi AI chat.
${targetSection}
================================================================================
NGUYÊN LÝ SANDBOX CÁCH LY & STAGING AN TOÀN TUYỆT ĐỐI
================================================================================
1. Bạn đang làm việc trong môi trường giả lập kỹ thuật kín (Closed Technical Sandbox). Mọi lệnh tool mà bạn gọi (tạo mới, sửa, xóa Regex) CHỈ GHI NHẬN VÀO BỘ NHỚ NHÁP TẠM THỜI (Staging / Preview Diff).
2. AN TOÀN TUYỆT ĐỐI: Thay đổi không tác động ngay vào dữ liệu gốc của người dùng. Người dùng sẽ kiểm tra bảng so sánh Diff chi tiết và bấm "Áp dụng" hoặc "Hủy". Do đó hãy quyết đoán thực hiện mọi chỉnh sửa lớn hoặc tạo mới mà không lo sợ làm hỏng cấu trúc!

================================================================================
QUY TẮC KỸ THUẬT REGEX SILLYTAVERN (BẮT BUỘC & CHI TIẾT CẤU TRÚC)
================================================================================
1. Cờ lười (Lazy Quantifiers): Khi bắt các thẻ như <think>...</think> hoặc nội dung nhiều dòng, LUÔN dùng cờ lười \`([\\s\\S]*?)\` hoặc \`(.*?)\` thay vì \`([\\s\\S]*)\` hay \`(.*)\`. Định lượng tham lam trên chuỗi dài của SillyTavern sẽ gây Catastrophic Backtracking làm treo trình duyệt!
2. Tương thích Macro SillyTavern: Đảm bảo Regex không vô tình phá hỏng các macro hệ thống như \`{{user}}\`, \`{{char}}\`, \`{{time}}\`, hay \`{{getvar::...}}\`.
3. Cờ (flags) phổ biến trong ST: /pattern/g (Toàn cục), /pattern/gi (Không phân biệt hoa thường), /pattern/gs (dotAll - cho phép dấu chấm khớp cả xuống dòng).
4. Cấu trúc đầy đủ của 1 Regex rule SillyTavern:
   - \`script_name\`: Tên gọi gợi nhớ của rule.
   - \`find_regex\`: Pattern regex (ví dụ: \`/<think>([\\s\\S]*?<\\/think>/\` hoặc \`/pattern/gi\`).
   - \`replace_string\`: Chuỗi thay thế (ví dụ: \`\` để xóa, hoặc \`$1\` để giữ lại nhóm 1).
   - \`trim_strings\`: Mảng chuỗi hoặc chuỗi cách nhau bởi xuống dòng (\`\\n\`) để tự động cắt bỏ rác trước khi chạy.
   - \`placement\` / \`source\`: Phạm vi áp dụng (Mảng số: \`[1]\`=User Input, \`[2]\`=AI Output, \`[3]\`/\`[4]\`=Slash Cmds, \`[5]\`/\`[3]\`=World Info, \`[6]\`/\`[5]\`=Reasoning). Mặc định là \`[2]\` (AI Output).
   - \`markdown_only\` (\`destination.display\`): \`true\` = chỉ thay đổi trên hiển thị Chat (mặc định \`true\`).
   - \`prompt_only\` (\`destination.prompt\`): \`true\` = chỉ thay đổi trên Prompt gửi đi cho LLM (mặc định \`false\`).
   - \`run_on_edit\`: \`true\`/\`false\` có chạy lại khi sửa tin nhắn hay không (mặc định \`true\`).
   - \`substitute_regex\`: \`0\` = Không thay thế macro trong find_regex, \`1\` = Có thay thế macro.
   - \`min_depth\` / \`max_depth\`: Số nguyên hoặc \`null\`, giới hạn chỉ chạy trên các tin nhắn ở độ sâu nhất định (ví dụ tin nhắn mới nhất là depth 0).

================================================================================
HỆ THỐNG CHAIN-OF-THOUGHT (CoT) – BẮT BUỘC TRƯỚC MỖI HÀNH ĐỘNG
================================================================================
Bạn PHẢI LUÔN suy luận tuần tự bên trong cặp thẻ <agency_cot> ... </agency_cot> TRƯỚC KHI xuất ra lời nhắn hoặc lệnh <tool_call>:
<agency_cot>
1. [Phân tích Yêu cầu]: Người dùng muốn tạo regex mới hay sửa regex hiện có? Cần thay đổi pattern, replace, placement hay trim_strings?
2. [Đánh giá Cú pháp & Backtracking]: Biểu thức có nguy cơ lặp vô hạn hay tham lam quá mức không? Nên dùng cờ gì?
3. [Quyết định Tool]: Gọi tool tìm kiếm, test hoặc cập nhật (với đầy đủ các thuộc tính cần thiết).
</agency_cot>

================================================================================
CÁC TOOLS CÓ SẴN TRONG CHẾ ĐỘ NÀY (gọi bằng XML tag chuẩn):
================================================================================
Cú pháp: <tool_call>{"name": "tên_tool", "args": {...}}</tool_call>

${toolListText}

Quy trình tự động hóa: Khi cần sửa hoặc tạo mới, hãy chủ động gọi list_regexes/test_regex_match nếu cần, rồi gọi create_regex/update_regex (với đầy đủ các tham số cấu trúc mà bạn muốn thiết lập), và cuối cùng LUÔN kết thúc bằng <tool_call>{"name": "save_regex_changes"}</tool_call> để hiện bảng diff cho người dùng!`;
  }

  getSnapshot() {
    return {
      stagingPending: hasStagingChanges(),
      staging: getStagingSummary(),
    };
  }

  getTools() {
    const allTools = [
      { name: 'list_regexes', description: 'Liệt kê danh sách các regex trong hệ thống', args: ['scope?', 'search?'] },
      { name: 'get_regex_details', description: 'Lấy chi tiết cấu trúc đầy đủ 1 regex (bao gồm placement, trim_strings, depth...)', args: ['id', 'scope?'] },
      { name: 'test_regex_match', description: 'Kiểm thử 1 mẫu regex và rà soát catastrophic backtracking', args: ['find_regex', 'replace_string?', 'sample_text?'] },
      { name: 'create_regex', description: 'Tạo mới 1 regex với cấu trúc đầy đủ (staged)', args: ['script_name', 'find_regex', 'replace_string', 'trim_strings?', 'placement?', 'disabled?', 'run_on_edit?', 'substitute_regex?', 'min_depth?', 'max_depth?', 'markdown_only?', 'prompt_only?', 'scope?'] },
      { name: 'update_regex', description: 'Cập nhật nội dung/thiết lập đầy đủ của 1 regex hiện có (staged)', args: ['id', 'scope?', 'script_name?', 'find_regex?', 'replace_string?', 'trim_strings?', 'placement?', 'disabled?', 'run_on_edit?', 'substitute_regex?', 'min_depth?', 'max_depth?', 'markdown_only?', 'prompt_only?'] },
      { name: 'delete_regex', description: 'Đánh dấu xóa 1 regex (staged)', args: ['id', 'scope?'] },
      { name: 'save_regex_changes', description: 'Tổng kết diff preview để user xác nhận' },
    ];

    if (this._targetRegexId === '__AUTO__') {
      return allTools;
    } else if (this._targetRegexId === '__NEW__') {
      return allTools.filter(t => ['create_regex', 'test_regex_match', 'list_regexes', 'get_regex_details', 'save_regex_changes'].includes(t.name));
    } else {
      // Khi chọn 1 regex cụ thể -> Ngắt bớt create_regex, delete_regex, list_regexes (không cần thiết)
      return allTools.filter(t => ['update_regex', 'test_regex_match', 'get_regex_details', 'save_regex_changes'].includes(t.name));
    }
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
      results[sc] = list.map(r => {
        const norm = normalizeRegexAttributes(r);
        return {
          id: norm.id,
          script_name: norm.script_name || 'Không tên',
          find_regex: (norm.find_regex || '').substring(0, 60),
          replace_string: (norm.replace_string || '').substring(0, 40),
          placement: norm.placement || [2],
          disabled: !!norm.disabled
        };
      });
    }
    return { ok: true, scope_queried: scope, count: Object.values(results).reduce((acc, l) => acc + l.length, 0), regexes: results };
  }

  async _getRegexDetails({ id, scope }) {
    const scopes = scope ? [scope] : ['global', 'preset', 'character'];
    for (const sc of scopes) {
      const list = _cachedAllRegexes[sc] || [];
      const found = list.find(r => r.id === id || r.script_name === id);
      if (found) {
        const norm = normalizeRegexAttributes({ ...found });
        return { ok: true, scope: sc, details: norm };
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

  async _createRegex({ script_name = 'AI Agency Regex', find_regex = '', replace_string = '', scope = 'global', disabled = false, trim_strings = '', placement = [2], run_on_edit = true, substitute_regex = 0, min_depth = null, max_depth = null, markdown_only = true, prompt_only = false }) {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'regex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newObj = normalizeRegexAttributes({
      id: newId,
      scope: scope || 'global',
      script_name,
      find_regex,
      replace_string,
      trim_strings,
      placement,
      disabled: !!disabled,
      enabled: !disabled,
      run_on_edit: !!run_on_edit,
      substitute_regex: parseInt(substitute_regex) || 0,
      min_depth: min_depth !== null && min_depth !== '' ? parseInt(min_depth) : null,
      max_depth: max_depth !== null && max_depth !== '' ? parseInt(max_depth) : null,
      markdown_only: !!markdown_only,
      prompt_only: !!prompt_only
    });

    _stagingCreates.push(newObj);
    return {
      ok: true,
      pending_review: true,
      summary: `Đã đưa vào danh sách chờ tạo mới (Scope: ${scope.toUpperCase()} | ID: ${newId}): "${script_name}"`
    };
  }

  async _updateRegex({ id, scope, script_name, find_regex, replace_string, trim_strings, placement, disabled, run_on_edit, substitute_regex, min_depth, max_depth, markdown_only, prompt_only }) {
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
    const normOld = normalizeRegexAttributes(oldObj ? { ...oldObj } : {});
    const updated = {
      ...existingStaged,
      scope: foundScope,
      _old_find_regex: normOld.find_regex || existingStaged._old_find_regex || '',
      _old_replace_string: normOld.replace_string || existingStaged._old_replace_string || '',
      _old_trim_strings: normOld.trim_strings || existingStaged._old_trim_strings || '',
      _old_script_name: normOld.script_name || existingStaged._old_script_name || '',
      _old_disabled: normOld.disabled !== undefined ? normOld.disabled : existingStaged._old_disabled,
      _old_placement: normOld.placement || existingStaged._old_placement || [2],
      _old_run_on_edit: normOld.run_on_edit !== undefined ? normOld.run_on_edit : existingStaged._old_run_on_edit,
      _old_substitute_regex: normOld.substitute_regex !== undefined ? normOld.substitute_regex : existingStaged._old_substitute_regex,
      _old_min_depth: normOld.min_depth !== undefined ? normOld.min_depth : existingStaged._old_min_depth,
      _old_max_depth: normOld.max_depth !== undefined ? normOld.max_depth : existingStaged._old_max_depth,
      _old_markdown_only: normOld.markdown_only !== undefined ? normOld.markdown_only : existingStaged._old_markdown_only,
      _old_prompt_only: normOld.prompt_only !== undefined ? normOld.prompt_only : existingStaged._old_prompt_only
    };

    if (script_name !== undefined) updated.script_name = script_name;
    if (find_regex !== undefined) updated.find_regex = find_regex;
    if (replace_string !== undefined) updated.replace_string = replace_string;
    if (trim_strings !== undefined) updated.trim_strings = trim_strings;
    if (placement !== undefined) updated.placement = placement;
    if (disabled !== undefined) {
      updated.disabled = !!disabled;
      updated.enabled = !disabled;
    }
    if (run_on_edit !== undefined) updated.run_on_edit = !!run_on_edit;
    if (substitute_regex !== undefined) updated.substitute_regex = parseInt(substitute_regex) || 0;
    if (min_depth !== undefined) updated.min_depth = min_depth !== null && min_depth !== '' ? parseInt(min_depth) : null;
    if (max_depth !== undefined) updated.max_depth = max_depth !== null && max_depth !== '' ? parseInt(max_depth) : null;
    if (markdown_only !== undefined) updated.markdown_only = !!markdown_only;
    if (prompt_only !== undefined) updated.prompt_only = !!prompt_only;

    normalizeRegexAttributes(updated);
    _stagingMap.set(targetId, updated);
    return {
      ok: true,
      pending_review: true,
      summary: `Đã ghi nhận cập nhật đầy đủ cấu trúc cho Regex ID: ${targetId} (${updated.script_name || normOld.script_name}). Chờ xác nhận Diff Preview.`
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
