/**
 * preset-provider.js
 * IContextProvider implementation cho Preset Editor tab.
 * Cung cấp 15 tools cho Agency Engine để đọc/ghi/quản lý ST Prompt Preset.
 */

import { addPromptBlock, deletePromptBlock, renderPromptBlocks, savePromptBlocks } from '../../features/manage-prompt.js';
import { getPendingVarChanges, refreshVarInspector } from '../../features/var-inspector.js';

// ─── Macro Tokenizer ──────────────────────────────────────────────────────────

const MACRO_MAP = [
  { re: /\{\{user\}\}/gi,            token: '⟦USER⟧' },
  { re: /\{\{char\}\}/gi,            token: '⟦CHAR⟧' },
  { re: /\{\{time\}\}/gi,            token: '⟦TIME⟧' },
  { re: /\{\{date\}\}/gi,            token: '⟦DATE⟧' },
  { re: /\{\{group\}\}/gi,           token: '⟦GROUP⟧' },
  { re: /\{\{model\}\}/gi,           token: '⟦MODEL⟧' },
  { re: /\{\{setvar::([^:}]+)::([^}]*)\}\}/gi, token: null }, // special
  { re: /\{\{getvar::([^}]+)\}\}/gi, token: null },
  { re: /\{\{addvar::([^:}]+)::([^}]*)\}\}/gi, token: null },
];

export function tokenizeMacros(content) {
  if (!content) return { tokenized: '', tokens: [] };
  const tokens = [];

  let result = content;

  // Special: setvar/addvar — giữ tên biến, tokenize cả chuỗi
  result = result.replace(/\{\{(setvar|addvar)::([^:}]+)::([^}]*)\}\}/gi, (match, cmd, name, val) => {
    const token = `⟦${cmd.toUpperCase()}:${name}⟧`;
    tokens.push({ token, original: match });
    return token;
  });

  // Special: getvar
  result = result.replace(/\{\{getvar::([^}]+)\}\}/gi, (match, name) => {
    const token = `⟦GETVAR:${name}⟧`;
    tokens.push({ token, original: match });
    return token;
  });

  // Named macros
  const namedMacros = [
    [/\{\{user\}\}/gi, '⟦USER⟧'],
    [/\{\{char\}\}/gi, '⟦CHAR⟧'],
    [/\{\{time\}\}/gi, '⟦TIME⟧'],
    [/\{\{date\}\}/gi, '⟦DATE⟧'],
    [/\{\{group\}\}/gi, '⟦GROUP⟧'],
    [/\{\{model\}\}/gi, '⟦MODEL⟧'],
    [/\{\{lastChatMessage\}\}/gi, '⟦LAST_MSG⟧'],
    [/\{\{scenario\}\}/gi, '⟦SCENARIO⟧'],
    [/\{\{personality\}\}/gi, '⟦PERSONALITY⟧'],
  ];
  for (const [re, token] of namedMacros) {
    result = result.replace(re, (match) => {
      tokens.push({ token, original: match });
      return token;
    });
  }

  // Catch-all: bất kỳ {{...}} nào còn lại
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, inner) => {
    const token = `⟦MACRO:${inner}⟧`;
    tokens.push({ token, original: match });
    return token;
  });

  return { tokenized: result, tokens };
}

export function restoreMacros(content, tokens) {
  if (!content || !tokens.length) return content;
  let result = content;
  // Restore theo thứ tự ngược để tránh token overlap
  for (const { token, original } of [...tokens].reverse()) {
    result = result.split(token).join(original);
  }
  return result;
}

// ─── Container helper ─────────────────────────────────────────────────────────

function getContainer() {
  if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
    const ctx = window.SillyTavern.getContext();
    if (ctx?.chatCompletionSettings && Array.isArray(ctx.chatCompletionSettings.prompts))
      return ctx.chatCompletionSettings;
    if (ctx?.power_user?.instruct && Array.isArray(ctx.power_user.instruct.prompts))
      return ctx.power_user.instruct;
  }
  if (window.chatCompletionSettings && Array.isArray(window.chatCompletionSettings.prompts))
    return window.chatCompletionSettings;
  return null;
}

function getPrompts() {
  return getContainer()?.prompts || [];
}

function getPromptOrder() {
  const container = getContainer();
  if (!container) return [];
  const raw = container.prompt_order || [];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === 'object' && Array.isArray(raw[0].order)) {
    return raw[0].order.map(o => typeof o === 'string' ? o : o.identifier).filter(Boolean);
  }
  return raw.map(o => typeof o === 'string' ? o : o.identifier).filter(Boolean);
}

function findPrompt(identifier) {
  return getPrompts().find(p => p.identifier === identifier) || null;
}

// ─── Staging Map ──────────────────────────────────────────────────────────────
// Các thay đổi write tool được staging ở đây, không ghi vào ST context ngay.
// Khi user bấm "Áp dụng" → _flushStaging() mới ghi thật.

let _stagingMap = new Map(); // identifier → { field: newValue }
let _stagingCreates = [];    // [newBlock] chờ addPromptBlock
let _stagingDeletes = new Set(); // identifier chờ deletePromptBlock

export function clearStaging() {
  _stagingMap.clear();
  _stagingCreates = [];
  _stagingDeletes.clear();
}

export function hasStagingChanges() {
  return _stagingMap.size > 0 || _stagingCreates.length > 0 || _stagingDeletes.size > 0;
}

export function getStagingSummary() {
  const updates = [..._stagingMap.entries()].map(([id, fields]) => {
    const block = findPrompt(id);
    return { identifier: id, name: block?.name || id, fields: Object.keys(fields) };
  });
  return {
    updates,
    creates: _stagingCreates.map(b => ({ name: b.name, role: b.role })),
    deletes: [..._stagingDeletes].map(id => {
      const b = findPrompt(id);
      return { identifier: id, name: b?.name || id };
    }),
    totalChanges: updates.length + _stagingCreates.length + _stagingDeletes.size,
  };
}

/**
 * Áp dụng tất cả staging changes vào DOM và save.
 * Gọi khi user click "Áp dụng".
 */
export async function flushStaging() {
  const container = getContainer();
  if (!container) throw new Error('Không tìm thấy ST container');

  // Apply field updates
  for (const [identifier, fields] of _stagingMap) {
    const block = container.prompts.find(p => p.identifier === identifier);
    if (!block) continue;
    Object.assign(block, fields);
    block.id = block.identifier; // đảm bảo id == identifier
  }

  // Apply creates
  for (const blockData of _stagingCreates) {
    const { addToLinked, insertTop, ...data } = blockData;
    addPromptBlock(data, addToLinked ?? false, insertTop ?? false);
  }

  // Apply deletes
  for (const id of _stagingDeletes) {
    deletePromptBlock(id);
  }

  clearStaging();
  renderPromptBlocks();
}

// ─── Tool Executor ────────────────────────────────────────────────────────────

async function executeTool(name, args) {
  switch (name) {

    // ── Read tools ─────────────────────────────────────────────────────────

    case 'list_prompts': {
      const order = getPromptOrder();
      const prompts = getPrompts();
      const linked = order.map(id => {
        const p = prompts.find(pr => pr.identifier === id);
        if (!p) return null;
        return {
          identifier: p.identifier,
          name: p.name,
          enabled: p.enabled,
          role: p.role,
          injection_depth: p.injection_depth,
          injection_position: p.injection_position,
          linked: true,
        };
      }).filter(Boolean);
      const linkedIds = new Set(order);
      const unlinked = prompts
        .filter(p => !linkedIds.has(p.identifier))
        .map(p => ({ identifier: p.identifier, name: p.name, enabled: p.enabled, role: p.role, linked: false }));
      return { linked, unlinked, total: prompts.length };
    }

    case 'get_prompt_content': {
      const p = findPrompt(args.identifier);
      if (!p) return { error: `Không tìm thấy prompt: ${args.identifier}` };
      const { tokenized, tokens } = tokenizeMacros(p.content);
      return {
        identifier: p.identifier,
        name: p.name,
        content_raw: p.content,
        content_tokenized: tokenized,
        tokens,
        role: p.role,
        enabled: p.enabled,
        system_prompt: p.system_prompt,
        injection_position: p.injection_position,
        injection_depth: p.injection_depth,
        injection_order: p.injection_order,
      };
    }

    case 'search_in_prompts': {
      const query = (args.query || '').toLowerCase();
      if (!query) return { results: [] };
      const results = [];
      for (const p of getPrompts()) {
        const matches = [];
        const lines = (p.content || '').split('\n');
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(query)) {
            matches.push({ line: i + 1, excerpt: line.trim().slice(0, 120) });
          }
        });
        if (p.name.toLowerCase().includes(query)) {
          matches.unshift({ line: 0, excerpt: `[Name match]: ${p.name}` });
        }
        if (matches.length > 0) {
          results.push({ identifier: p.identifier, name: p.name, matches });
        }
      }
      return { results, total_matches: results.length };
    }

    case 'list_vars': {
      try {
        const { renames, valuesBySource } = getPendingVarChanges();
        const prompts = getPrompts();
        const varMap = new Map();
        for (const p of prompts) {
          const content = p.content || '';
          const setMatches = [...content.matchAll(/\{\{setvar::([^:}]+)::([^}]*)\}\}/gi)];
          const getMatches = [...content.matchAll(/\{\{getvar::([^}]+)\}\}/gi)];
          for (const [, name, val] of setMatches) {
            if (!varMap.has(name)) varMap.set(name, { name, sources: [] });
            varMap.get(name).sources.push({ promptId: p.identifier, promptName: p.name, type: 'set', value: val });
          }
          for (const [, name] of getMatches) {
            if (!varMap.has(name)) varMap.set(name, { name, sources: [] });
            varMap.get(name).sources.push({ promptId: p.identifier, promptName: p.name, type: 'get' });
          }
        }
        return { vars: [...varMap.values()], total: varMap.size };
      } catch (e) {
        return { error: e.message };
      }
    }

    // ── Write tools – Block ─────────────────────────────────────────────────

    case 'create_prompt_block': {
      const { name, content = '', role = 'system', injection_position = 0,
              injection_depth = 4, injection_order = 100,
              addToLinked = true, insertTop = false } = args;
      if (!name) return { error: 'Thiếu trường name' };
      const blockData = { name, content, role, injection_position, injection_depth, injection_order, addToLinked, insertTop };
      _stagingCreates.push(blockData);
      return { ok: true, staged: true, summary: `Staged tạo block "${name}" (${addToLinked ? 'Linked' : 'Unlinked'})` };
    }

    case 'delete_prompt_block': {
      const { identifier } = args;
      if (!findPrompt(identifier)) return { error: `Không tìm thấy prompt: ${identifier}` };
      _stagingDeletes.add(identifier);
      const name = findPrompt(identifier)?.name || identifier;
      return { ok: true, staged: true, summary: `Staged xóa block "${name}"` };
    }

    case 'update_prompt_content': {
      const { identifier, content } = args;
      if (!findPrompt(identifier)) return { error: `Không tìm thấy prompt: ${identifier}` };
      if (!_stagingMap.has(identifier)) _stagingMap.set(identifier, {});
      _stagingMap.get(identifier).content = content;
      return { ok: true, staged: true, summary: `Staged cập nhật content cho "${findPrompt(identifier)?.name}"` };
    }

    case 'update_prompt_name': {
      const { identifier, name } = args;
      if (!findPrompt(identifier)) return { error: `Không tìm thấy prompt: ${identifier}` };
      if (!_stagingMap.has(identifier)) _stagingMap.set(identifier, {});
      _stagingMap.get(identifier).name = name;
      return { ok: true, staged: true, summary: `Staged đổi tên → "${name}"` };
    }

    case 'update_prompt_meta': {
      const { identifier, ...fields } = args;
      if (!findPrompt(identifier)) return { error: `Không tìm thấy prompt: ${identifier}` };
      const allowed = ['role', 'injection_position', 'injection_depth', 'injection_order', 'system_prompt', 'marker', 'forbid_overrides'];
      const update = {};
      for (const key of allowed) {
        if (fields[key] !== undefined) update[key] = fields[key];
      }
      if (!_stagingMap.has(identifier)) _stagingMap.set(identifier, {});
      Object.assign(_stagingMap.get(identifier), update);
      return { ok: true, staged: true, summary: `Staged cập nhật meta [${Object.keys(update).join(', ')}]` };
    }

    case 'toggle_prompt_enabled': {
      const { identifier, enabled } = args;
      if (!findPrompt(identifier)) return { error: `Không tìm thấy prompt: ${identifier}` };
      if (!_stagingMap.has(identifier)) _stagingMap.set(identifier, {});
      _stagingMap.get(identifier).enabled = Boolean(enabled);
      const name = findPrompt(identifier)?.name;
      return { ok: true, staged: true, summary: `Staged ${enabled ? 'bật' : 'tắt'} "${name}"` };
    }

    case 'reorder_prompts': {
      // args.order = [identifier, ...] — thứ tự mới
      const { order: newOrder } = args;
      if (!Array.isArray(newOrder)) return { error: 'order phải là mảng identifier' };
      // Validate tất cả identifier tồn tại
      const missing = newOrder.filter(id => !findPrompt(id));
      if (missing.length) return { error: `Không tìm thấy: ${missing.join(', ')}` };
      if (!_stagingMap.has('__ORDER__')) _stagingMap.set('__ORDER__', {});
      _stagingMap.get('__ORDER__').order = newOrder;
      return { ok: true, staged: true, summary: `Staged sắp xếp lại ${newOrder.length} prompts` };
    }

    case 'batch_update_prompts': {
      // args.updates = [{identifier, content?, name?, enabled?, ...}]
      const { updates } = args;
      if (!Array.isArray(updates)) return { error: 'updates phải là mảng' };
      const results = [];
      for (const upd of updates) {
        const { identifier, ...fields } = upd;
        if (!findPrompt(identifier)) {
          results.push({ identifier, ok: false, error: 'Không tìm thấy' });
          continue;
        }
        if (!_stagingMap.has(identifier)) _stagingMap.set(identifier, {});
        const allowed = ['name', 'content', 'role', 'enabled', 'injection_position', 'injection_depth', 'injection_order', 'system_prompt', 'marker', 'forbid_overrides'];
        for (const key of allowed) {
          if (fields[key] !== undefined) _stagingMap.get(identifier)[key] = fields[key];
        }
        results.push({ identifier, ok: true });
      }
      const ok = results.filter(r => r.ok).length;
      return { ok: true, staged: true, summary: `Staged batch ${ok}/${updates.length} prompts`, results };
    }

    // ── Write tools – Vars ──────────────────────────────────────────────────

    case 'update_var_value': {
      // sourceId = `promptId::varName::set` format
      const { sourceId, newValue } = args;
      if (!_stagingMap.has('__VARS__')) _stagingMap.set('__VARS__', {});
      _stagingMap.get('__VARS__')[sourceId] = newValue;
      return { ok: true, staged: true, summary: `Staged cập nhật var value [${sourceId}]` };
    }

    case 'rename_var': {
      const { oldName, newName } = args;
      if (!_stagingMap.has('__VAR_RENAMES__')) _stagingMap.set('__VAR_RENAMES__', {});
      _stagingMap.get('__VAR_RENAMES__')[oldName] = newName;
      return { ok: true, staged: true, summary: `Staged đổi tên biến "${oldName}" → "${newName}"` };
    }

    // ── Save ────────────────────────────────────────────────────────────────

    case 'save_preset': {
      // Không flush staging — việc áp dụng do user confirm.
      // Tool này trả về summary để AI báo cáo cho user.
      const summary = getStagingSummary();
      if (summary.totalChanges === 0) {
        return { ok: true, message: 'Không có thay đổi nào đang chờ áp dụng.' };
      }
      return {
        ok: true,
        pending_review: true,
        summary,
        message: `${summary.totalChanges} thay đổi đang chờ user xác nhận (Áp dụng/Hủy).`,
      };
    }

    default:
      return { error: `Tool không tồn tại: ${name}` };
  }
}

// ─── IContextProvider ─────────────────────────────────────────────────────────

export class PresetContextProvider {
  get tabId() { return 'preset'; }

  getSystemPrompt() {
    const container = getContainer();
    const promptCount = container?.prompts?.length ?? 0;
    const { contextLimit, maxOutput } = (window._stMultitoolLLMConfig || { contextLimit: 32000, maxOutput: 4000 });

    return `Bạn là AI Agency chuyên gia tối ưu hóa và quản lý AI Prompt Preset tích hợp trong ST Multitool (SillyTavern Extension).
Thông số hệ thống: Context Limit: ${contextLimit} tokens | Max Output per turn: ${maxOutput} tokens | Tổng số prompt blocks hiện tại: ${promptCount}.

================================================================================
HỆ THỐNG CHAIN-OF-THOUGHT (CoT) – BẮT BUỘC TRƯỚC MỖI HÀNH ĐỘNG
================================================================================
Để tránh sai sót, nhầm lẫn ID hoặc bị ngắt phản hồi giữa chừng, bạn PHẢI LUÔN suy luận tuần tự bên trong cặp thẻ <cot> ... </cot> TRƯỚC KHI xuất ra bất kỳ lời nhắn hay lệnh <tool_call> nào:
<cot>
1. [Phân tích Yêu cầu & Kế hoạch]: Người dùng muốn làm gì? Phạm vi tác động đến những block nào?
2. [Kiểm tra Dung lượng & Token]: Các block cần chỉnh sửa có nội dung nặng (dài hàng trăm dòng) hay không? Với Max Output = ${maxOutput} tokens (~${Math.floor(maxOutput * 3)} ký tự), nếu sửa/dịch/tạo nhiều block cùng lúc, liệu có nguy cơ bị cắt ngang (truncate) giữa chừng khi xuất JSON?
3. [Xác thực ID & Integrity]: Kiểm tra identifier chuẩn xác (ID bắt đầu bằng "block_..."). Đảm bảo các macro đã tokenize (⟦USER⟧, ⟦CHAR⟧, v.v.) tuyệt đối được giữ nguyên 100%, không dịch hay làm biến dạng.
4. [Lập chiến lược Prefill / Chia nhỏ]: Quyết định gọi tool ngay hay chia thành các batch nhỏ hơn (Prefill Chunking).
</cot>

================================================================================
HỆ THỐNG PREFILL / CHUNKING AN TOÀN (CHỐNG TRUNCATE VỚI PRESET NẶNG)
================================================================================
Khi xử lý preset nặng (dịch thuật, viết lại, hoặc cập nhật nhiều block dài cùng lúc), nếu bạn cố gắng xuất tất cả trong 1 lần gọi tool, API LLM sẽ ngắt phản hồi giữa chừng làm hỏng cú pháp JSON.
BẮT BUỘC tuân thủ các quy tắc Chunking sau:
- Quy tắc 1 (Batch Size tối đa): Trong mỗi lượt phản hồi, CHỈ ĐƯỢC phép cập nhật tối đa 2 đến 3 block (hoặc tổng dung lượng dưới 2000 tokens) thông qua <tool_call>{"name": "batch_update_prompts", ...}</tool_call> hoặc các tool ghi khác.
- Quy tắc 2 (Tiếp nối tự động): Sau khi hoàn thành 1 batch, hãy gọi ngay <tool_call> cho batch đó, sau đó kết thúc lượt bằng thông báo ngắn: "⏳ [Đã xử lý Batch X/Y: các block A, B]. Đang tiếp tục chuỗi xử lý..." Hệ thống sẽ tự động gửi tiếp hoặc người dùng sẽ xác nhận tiếp tục.
- Quy tắc 3 (Khôi phục khi ngắt): Nếu hệ thống thông báo phản hồi trước đó bị ngắt giữa chừng, bạn phải lập tức giảm kích thước batch xuống (sửa từng block một) để tiếp tục một cách an toàn.

================================================================================
CÁC TOOLS CÓ SẴN (gọi bằng XML tag chuẩn):
================================================================================
Cú pháp: <tool_call>{"name": "tên_tool", "args": {...}}</tool_call>

[NHÓM ĐỌC DỮ LIỆU]
- list_prompts — Liệt kê tất cả prompts (linked + unlinked, metadata, identifier).
- get_prompt_content — Đọc nội dung chi tiết 1 prompt (args: {"identifier": "..."}).
- search_in_prompts — Tìm kiếm văn bản trong tất cả prompts (args: {"query": "..."}).
- list_vars — Liệt kê tất cả biến {{setvar/getvar}} trong preset.

[NHÓM GHI – BLOCKS (Staged, lưu tạm thời vào bộ nhớ chờ duyệt)]
- create_prompt_block — Tạo block mới (args: {"name": "...", "content": "...", "role": "system|user|assistant", "addToLinked": true|false, ...}).
- delete_prompt_block — Đánh dấu xóa block (args: {"identifier": "..."}).
- update_prompt_content — Cập nhật nội dung 1 block (args: {"identifier": "...", "content": "..."}).
- update_prompt_name — Đổi tên block (args: {"identifier": "...", "name": "..."}).
- update_prompt_meta — Cập nhật metadata (args: {"identifier": "...", "role": "...", "injection_position": 0, "injection_depth": 4}).
- toggle_prompt_enabled — Bật/tắt block (args: {"identifier": "...", "enabled": true|false}).
- reorder_prompts — Sắp xếp lại thứ tự (args: {"order": ["id1", "id2", ...]}).
- batch_update_prompts — Cập nhật nhiều block (tối đa 2-3 block/batch) (args: {"updates": [{"identifier": "...", "content": "...", "name": "..."}]}).

[NHÓM GHI – BIẾN VARS (Staged)]
- update_var_value — Cập nhật giá trị biến (args: {"sourceId": "...", "newValue": "..."}).
- rename_var — Đổi tên biến toàn preset (args: {"oldName": "...", "newName": "..."}).

[LƯU & KIỂM DUYỆT CUỐI CÙNG]
- save_preset — Tổng hợp và hiển thị bảng thông báo (Diff Preview) để người dùng xem xét chốt thay đổi.

================================================================================
QUY TRÌNH THỰC THI CHUẨN (ENGAGEMENT WORKFLOW)
================================================================================
Bước 1: Luôn dùng 'list_prompts' hoặc 'get_prompt_content' để nắm rõ ID và nội dung block trước khi sửa.
Bước 2: Sử dụng thẻ <cot>...</cot> để suy luận và tính toán kích thước batch.
Bước 3: Thực hiện gọi các tool ghi (chỉ 2-3 block/lượt).
Bước 4: Khi toàn bộ các block đã được xử lý xong, GỌI BẮT BUỘC tool <tool_call>{"name": "save_preset"}</tool_call> ở cuối cùng để hiển thị bảng tóm tắt cho người dùng bấm Áp Dụng (Apply) hoặc Từ Chối (Reject).`;
  }

  getSnapshot() {
    return {
      promptCount: getPrompts().length,
      linkedCount: getPromptOrder().length,
      stagingPending: hasStagingChanges(),
      staging: getStagingSummary(),
    };
  }

  getTools() {
    return [
      { name: 'list_prompts',          description: 'Liệt kê tất cả prompts' },
      { name: 'get_prompt_content',    description: 'Đọc nội dung chi tiết 1 prompt', args: ['identifier'] },
      { name: 'search_in_prompts',     description: 'Tìm kiếm trong prompts', args: ['query'] },
      { name: 'list_vars',             description: 'Liệt kê tất cả biến' },
      { name: 'create_prompt_block',   description: 'Tạo block mới (staged)', args: ['name', 'content', 'role', 'addToLinked'] },
      { name: 'delete_prompt_block',   description: 'Xóa block (staged)', args: ['identifier'] },
      { name: 'update_prompt_content', description: 'Cập nhật nội dung (staged)', args: ['identifier', 'content'] },
      { name: 'update_prompt_name',    description: 'Đổi tên block (staged)', args: ['identifier', 'name'] },
      { name: 'update_prompt_meta',    description: 'Cập nhật metadata (staged)', args: ['identifier', '...fields'] },
      { name: 'toggle_prompt_enabled', description: 'Bật/tắt block (staged)', args: ['identifier', 'enabled'] },
      { name: 'reorder_prompts',       description: 'Sắp xếp lại thứ tự (staged)', args: ['order[]'] },
      { name: 'batch_update_prompts',  description: 'Cập nhật batch (staged)', args: ['updates[]'] },
      { name: 'update_var_value',      description: 'Cập nhật giá trị var (staged)', args: ['sourceId', 'newValue'] },
      { name: 'rename_var',            description: 'Đổi tên biến (staged)', args: ['oldName', 'newName'] },
      { name: 'save_preset',           description: 'Tổng kết thay đổi để user xem xét' },
    ];
  }

  async executeTool(name, args) {
    return await executeTool(name, args);
  }
}
