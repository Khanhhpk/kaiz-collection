/**
 * var-inspector.js
 * Floating sidebar that scans the current AI preset's prompt blocks
 * for {{setvar}}, {{getvar}}, /setvar, /getvar usage and shows
 * the live values of chat-level and global variables.
 */

// ─── Regex patterns (same approach as STPresetEditor) ─────────────────────────
const PATTERNS = {
  setvarMacro:    /\{\{setvar::([^:}]+)::([^}]*)\}\}/g,
  getvarMacro:    /\{\{getvar::([^}]+)\}\}/g,
  addvarMacro:    /\{\{addvar::([^:}]+)::([^}]*)\}\}/g,
  setglobalMacro: /\{\{setglobalvar::([^:}]+)::([^}]*)\}\}/g,
  getglobalMacro: /\{\{getglobalvar::([^}]+)\}\}/g,
  setvarSlash:    /\/setvar\s+(?:key=(\S+)\s+(.+)|(\S+)\s+(.+))/g,
  getvarSlash:    /\/getvar\s+(?:key=(\S+)|(\S+))/g,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s, max = 60) {
  s = String(s ?? '');
  return s.length > max ? s.slice(0, max) + '…' : s;
}

/**
 * Scan a prompt block's content and collect setvar / getvar references.
 * @param {string} content
 * @param {string} promptName
 * @param {string} promptId
 * @returns {{ name: string, type: 'set'|'get'|'addvar'|'setglobal'|'getglobal', value?: string, scope: 'local'|'global', promptName: string, promptId: string, excerpt: string }[]}
 */
function scanPromptContent(content, promptName, promptId) {
  const refs = [];
  if (!content) return refs;

  const addRef = (name, type, value, scope, matchStr) => {
    refs.push({ name: name.trim(), type, value: value?.trim(), scope, promptName, promptId, excerpt: truncate(matchStr, 80) });
  };

  let m;

  // {{setvar::name::value}}
  const sv = new RegExp(PATTERNS.setvarMacro.source, 'g');
  while ((m = sv.exec(content)) !== null) addRef(m[1], 'set', m[2], 'local', m[0]);

  // {{getvar::name}}
  const gv = new RegExp(PATTERNS.getvarMacro.source, 'g');
  while ((m = gv.exec(content)) !== null) addRef(m[1], 'get', undefined, 'local', m[0]);

  // {{addvar::name::value}}
  const av = new RegExp(PATTERNS.addvarMacro.source, 'g');
  while ((m = av.exec(content)) !== null) addRef(m[1], 'addvar', m[2], 'local', m[0]);

  // {{setglobalvar::name::value}}
  const sgv = new RegExp(PATTERNS.setglobalMacro.source, 'g');
  while ((m = sgv.exec(content)) !== null) addRef(m[1], 'set', m[2], 'global', m[0]);

  // {{getglobalvar::name}}
  const ggv = new RegExp(PATTERNS.getglobalMacro.source, 'g');
  while ((m = ggv.exec(content)) !== null) addRef(m[1], 'get', undefined, 'global', m[0]);

  // /setvar key=X value  or  /setvar X value
  const ssv = new RegExp(PATTERNS.setvarSlash.source, 'g');
  while ((m = ssv.exec(content)) !== null) {
    const name = m[1] || m[3];
    const val  = m[2] || m[4];
    if (name) addRef(name, 'set', val, 'local', m[0]);
  }

  // /getvar key=X  or  /getvar X
  const gsv = new RegExp(PATTERNS.getvarSlash.source, 'g');
  while ((m = gsv.exec(content)) !== null) {
    const name = m[1] || m[2];
    if (name) addRef(name, 'get', undefined, 'local', m[0]);
  }

  return refs;
}

/**
 * Read current prompt blocks from the loaded preset via ST context.
 * Returns { prompts: Array<{identifier, name, content}>, presetName: string }
 */
function getPresetData() {
  try {
    const ctx = SillyTavern.getContext();
    const oai = ctx.chatCompletionSettings;
    if (!oai || !Array.isArray(oai.prompts)) return { prompts: [], presetName: 'Unknown' };
    const prompts = oai.prompts.filter(Boolean).map(p => ({
      identifier: p.identifier || '',
      name: p.name || p.identifier || '(no name)',
      content: p.content || '',
    }));
    return { prompts, presetName: oai.preset_settings_novel || 'Current preset' };
  } catch (e) {
    console.error('[VarInspector] getPresetData error:', e);
    return { prompts: [], presetName: 'Error' };
  }
}

/**
 * Read live variable values from ST context.
 * Returns { local: Record<string, string>, global: Record<string, string> }
 */
function getLiveVariables() {
  try {
    const ctx = SillyTavern.getContext();
    const local  = ctx.chatMetadata?.variables ?? {};
    const extSettings = ctx.extensionSettings ?? {};
    const global = extSettings.variables?.global ?? {};
    return { local, global };
  } catch (e) {
    console.error('[VarInspector] getLiveVariables error:', e);
    return { local: {}, global: {} };
  }
}

// ─── Build the complete analysis ───────────────────────────────────────────────
function analyse() {
  const { prompts } = getPresetData();
  const liveVars = getLiveVariables();

  /** @type {Map<string, { scope: string, liveValue: string|null, sources: Array }>} */
  const varMap = new Map();

  for (const p of prompts) {
    const refs = scanPromptContent(p.content, p.name, p.identifier);
    for (const ref of refs) {
      const key = ref.scope + '::' + ref.name;
      if (!varMap.has(key)) {
        const lv = ref.scope === 'local'
          ? (liveVars.local[ref.name] ?? null)
          : (liveVars.global[ref.name] ?? null);
        varMap.set(key, { name: ref.name, scope: ref.scope, liveValue: lv, sources: [] });
      }
      varMap.get(key).sources.push(ref);
    }
  }

  // Also include live variables that are NOT referenced in the preset (orphans)
  for (const [name, val] of Object.entries(liveVars.local)) {
    const key = 'local::' + name;
    if (!varMap.has(key)) varMap.set(key, { name, scope: 'local', liveValue: val, sources: [] });
  }
  for (const [name, val] of Object.entries(liveVars.global)) {
    const key = 'global::' + name;
    if (!varMap.has(key)) varMap.set(key, { name, scope: 'global', liveValue: val, sources: [] });
  }

  return [...varMap.values()].sort((a, b) => {
    if (a.scope !== b.scope) return a.scope === 'local' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ─── Render ────────────────────────────────────────────────────────────────────
function typeLabel(type) {
  return { set: '📝 set', get: '👁 get', addvar: '➕ add', setglobal: '📝 setGlobal', getglobal: '👁 getGlobal' }[type] || type;
}

function renderVarList(vars) {
  if (vars.length === 0) {
    return '<div class="kvi-empty">Không tìm thấy biến nào trong preset hiện tại.</div>';
  }

  return vars.map(v => {
    const scopeClass = v.scope === 'global' ? 'kvi-global' : 'kvi-local';
    const scopeLabel = v.scope === 'global' ? '🌍 Global' : '🗨 Local';
    const liveDisplay = v.liveValue !== null
      ? `<span class="kvi-val-live" title="Giá trị hiện tại">${escHtml(truncate(v.liveValue, 50))}</span>`
      : `<span class="kvi-val-null">chưa có giá trị</span>`;

    const sourcesHtml = v.sources.length === 0
      ? '<div class="kvi-no-src">Không tìm thấy trong prompt nào (biến runtime)</div>'
      : v.sources.map(s => `
          <div class="kvi-source-item">
            <span class="kvi-src-type">${typeLabel(s.type)}</span>
            <span class="kvi-src-prompt" title="${escHtml(s.promptId)}">${escHtml(s.promptName)}</span>
            ${s.value !== undefined ? `<span class="kvi-src-val">= ${escHtml(s.value)}</span>` : ''}
            <div class="kvi-src-excerpt">${escHtml(s.excerpt)}</div>
          </div>`).join('');

    return `
      <div class="kvi-var-card ${scopeClass}" data-varkey="${escHtml(v.scope + '::' + v.name)}">
        <div class="kvi-var-header">
          <span class="kvi-var-name">${escHtml(v.name)}</span>
          <span class="kvi-scope-badge">${scopeLabel}</span>
          <span class="kvi-chevron">▶</span>
        </div>
        <div class="kvi-var-value">${liveDisplay}</div>
        <div class="kvi-var-sources" style="display:none">
          <div class="kvi-sources-title">Xuất hiện trong preset:</div>
          ${sourcesHtml}
        </div>
      </div>`;
  }).join('');
}

// ─── UI wiring ─────────────────────────────────────────────────────────────────
let _initialized = false;

function refresh() {
  const body = document.getElementById('kvi-body');
  const status = document.getElementById('kvi-status');
  if (!body) return;

  body.innerHTML = '<div class="kvi-loading">Đang quét preset...</div>';
  const vars = analyse();
  body.innerHTML = renderVarList(vars);

  if (status) {
    const localCount  = vars.filter(v => v.scope === 'local').length;
    const globalCount = vars.filter(v => v.scope === 'global').length;
    status.textContent = `${localCount} local · ${globalCount} global`;
  }

  // Accordion toggle
  body.querySelectorAll('.kvi-var-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const card = hdr.closest('.kvi-var-card');
      const sources = card.querySelector('.kvi-var-sources');
      const chevron = hdr.querySelector('.kvi-chevron');
      const isOpen = sources.style.display !== 'none';
      sources.style.display = isOpen ? 'none' : 'block';
      chevron.textContent = isOpen ? '▶' : '▼';
    });
  });
}

export function initVarInspector() {
  if (_initialized) return;
  _initialized = true;

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    /* ── Floating toggle button ── */
    #kvi-toggle-btn {
      position: fixed;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      z-index: 9999;
      background: linear-gradient(135deg, #00e6b8, #00b38f);
      color: #0a1a14;
      border: none;
      border-radius: 8px 0 0 8px;
      padding: 10px 8px;
      cursor: pointer;
      font-size: 18px;
      writing-mode: vertical-rl;
      letter-spacing: 1px;
      font-weight: 700;
      box-shadow: -2px 0 12px rgba(0,230,184,0.3);
      transition: background 0.2s, transform 0.2s;
      line-height: 1;
    }
    #kvi-toggle-btn:hover { background: linear-gradient(135deg, #00ffd0, #00d4ab); }

    /* ── Sidebar panel ── */
    #kvi-panel {
      position: fixed;
      right: -360px;
      top: 0;
      width: 340px;
      height: 100vh;
      z-index: 9998;
      background: rgba(10, 18, 14, 0.96);
      backdrop-filter: blur(12px);
      border-left: 1px solid rgba(0,230,184,0.25);
      box-shadow: -4px 0 32px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      transition: right 0.3s cubic-bezier(0.4,0,0.2,1);
      font-family: 'Inter', 'Segoe UI', sans-serif;
    }
    #kvi-panel.kvi-open { right: 0; }

    /* ── Header ── */
    #kvi-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      background: rgba(0,230,184,0.08);
      border-bottom: 1px solid rgba(0,230,184,0.2);
      flex-shrink: 0;
    }
    #kvi-header-title {
      flex: 1;
      font-size: 0.9em;
      font-weight: 700;
      color: #00e6b8;
    }
    #kvi-status {
      font-size: 0.72em;
      color: #aaa;
      white-space: nowrap;
    }
    #kvi-refresh-btn, #kvi-close-btn {
      background: none;
      border: 1px solid rgba(0,230,184,0.3);
      color: #00e6b8;
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 0.8em;
      transition: background 0.2s;
    }
    #kvi-refresh-btn:hover, #kvi-close-btn:hover { background: rgba(0,230,184,0.12); }

    /* ── Filter bar ── */
    #kvi-filter-bar {
      display: flex;
      gap: 6px;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }
    #kvi-search {
      flex: 1;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px;
      color: #eee;
      padding: 5px 8px;
      font-size: 0.8em;
    }
    #kvi-search::placeholder { color: #666; }
    .kvi-scope-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px;
      color: #aaa;
      padding: 4px 9px;
      cursor: pointer;
      font-size: 0.75em;
      transition: all 0.15s;
    }
    .kvi-scope-btn.active { background: rgba(0,230,184,0.18); border-color: #00e6b8; color: #00e6b8; }

    /* ── Body ── */
    #kvi-body {
      flex: 1;
      overflow-y: auto;
      padding: 10px 10px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    #kvi-body::-webkit-scrollbar { width: 4px; }
    #kvi-body::-webkit-scrollbar-thumb { background: rgba(0,230,184,0.3); border-radius: 4px; }

    /* ── Cards ── */
    .kvi-var-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.15s;
    }
    .kvi-var-card.kvi-local { border-left: 3px solid #00e6b8; }
    .kvi-var-card.kvi-global { border-left: 3px solid #a78bfa; }
    .kvi-var-card:hover { border-color: rgba(0,230,184,0.3); }

    .kvi-var-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      cursor: pointer;
      user-select: none;
    }
    .kvi-var-name { flex: 1; font-weight: 600; color: #e2e8f0; font-size: 0.85em; font-family: monospace; }
    .kvi-scope-badge { font-size: 0.65em; color: #888; white-space: nowrap; }
    .kvi-chevron { font-size: 0.7em; color: #555; }

    .kvi-var-value {
      padding: 2px 10px 8px;
      font-size: 0.78em;
    }
    .kvi-val-live {
      color: #86efac;
      font-family: monospace;
      background: rgba(134,239,172,0.08);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .kvi-val-null { color: #555; font-style: italic; }

    .kvi-var-sources { padding: 0 10px 10px; border-top: 1px solid rgba(255,255,255,0.05); }
    .kvi-sources-title { font-size: 0.7em; color: #666; margin: 6px 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .kvi-source-item {
      background: rgba(255,255,255,0.03);
      border-radius: 5px;
      padding: 5px 8px;
      margin-bottom: 4px;
      font-size: 0.77em;
    }
    .kvi-src-type { color: #00e6b8; font-weight: 600; margin-right: 4px; }
    .kvi-src-prompt { color: #a0c4ff; }
    .kvi-src-val { color: #fde68a; margin-left: 4px; font-family: monospace; }
    .kvi-src-excerpt { color: #666; font-family: monospace; font-size: 0.9em; margin-top: 3px; word-break: break-all; }
    .kvi-no-src { color: #555; font-style: italic; font-size: 0.8em; padding: 4px 0; }

    .kvi-empty { color: #666; text-align: center; padding: 30px 20px; font-size: 0.85em; }
    .kvi-loading { color: #00e6b8; text-align: center; padding: 30px 20px; font-size: 0.85em; animation: kvi-pulse 1s infinite; }
    @keyframes kvi-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
  `;
  document.head.appendChild(style);

  // Inject HTML
  const html = `
    <button id="kvi-toggle-btn" title="Variable Inspector">🔍 VAR</button>
    <div id="kvi-panel">
      <div id="kvi-header">
        <span id="kvi-header-title">🔍 Variable Inspector</span>
        <span id="kvi-status">-</span>
        <button id="kvi-refresh-btn" title="Làm mới">↺</button>
        <button id="kvi-close-btn" title="Đóng">×</button>
      </div>
      <div id="kvi-filter-bar">
        <input id="kvi-search" type="text" placeholder="Tìm tên biến…">
        <button class="kvi-scope-btn active" data-scope="all">Tất cả</button>
        <button class="kvi-scope-btn" data-scope="local">Local</button>
        <button class="kvi-scope-btn" data-scope="global">Global</button>
      </div>
      <div id="kvi-body"></div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  const panel      = document.getElementById('kvi-panel');
  const toggleBtn  = document.getElementById('kvi-toggle-btn');
  const closeBtn   = document.getElementById('kvi-close-btn');
  const refreshBtn = document.getElementById('kvi-refresh-btn');
  const searchInput = document.getElementById('kvi-search');
  let currentScope = 'all';
  let allVars = [];

  const open = () => { panel.classList.add('kvi-open'); refresh(); };
  const close = () => panel.classList.remove('kvi-open');

  toggleBtn.addEventListener('click', () => {
    panel.classList.contains('kvi-open') ? close() : open();
  });
  closeBtn.addEventListener('click', close);
  refreshBtn.addEventListener('click', () => {
    allVars = analyse();
    applyFilter();
    const status = document.getElementById('kvi-status');
    if (status) {
      const lc = allVars.filter(v => v.scope === 'local').length;
      const gc = allVars.filter(v => v.scope === 'global').length;
      status.textContent = `${lc} local · ${gc} global`;
    }
  });

  // Scope filter buttons
  document.querySelectorAll('.kvi-scope-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.kvi-scope-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScope = btn.dataset.scope;
      applyFilter();
    });
  });

  // Search filter
  searchInput.addEventListener('input', applyFilter);

  function applyFilter() {
    const term = searchInput.value.trim().toLowerCase();
    const body = document.getElementById('kvi-body');
    if (!body) return;

    const filtered = allVars.filter(v => {
      const scopeOk = currentScope === 'all' || v.scope === currentScope;
      const termOk  = !term || v.name.toLowerCase().includes(term);
      return scopeOk && termOk;
    });

    body.innerHTML = renderVarList(filtered);

    // Re-bind accordion
    body.querySelectorAll('.kvi-var-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const card    = hdr.closest('.kvi-var-card');
        const sources = card.querySelector('.kvi-var-sources');
        const chevron = hdr.querySelector('.kvi-chevron');
        const isOpen  = sources.style.display !== 'none';
        sources.style.display = isOpen ? 'none' : 'block';
        chevron.textContent   = isOpen ? '▶' : '▼';
      });
    });
  }
}
