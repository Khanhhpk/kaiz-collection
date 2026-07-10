/**
 * var-inspector.js
 * Scans the current AI preset's prompt blocks for {{setvar}}, {{getvar}},
 * /setvar, /getvar usage and shows the live values of chat-level and global variables.
 * Renders inside the Prompt Manager view (not as a floating sidebar).
 */

import { escapeHtml } from '../utils.js';

// ─── Scan helpers ──────────────────────────────────────────────────────────────

function truncate(s, max = 80) {
  s = String(s ?? '');
  return s.length > max ? s.slice(0, max) + '…' : s;
}

/**
 * Scan a prompt block's content and collect setvar / getvar references.
 */
function scanPromptContent(content, promptName, promptId) {
  const refs = [];
  if (!content) return refs;

  const add = (name, type, value, scope, matchStr) => {
    refs.push({ name: name.trim(), type, value: value?.trim(), scope, promptName, promptId, excerpt: truncate(matchStr, 80) });
  };

  let m;

  // {{setvar::name::value}}
  const p1 = /\{\{setvar::([^:}]+)::([^}]*)\}\}/gi;
  while ((m = p1.exec(content))) add(m[1], 'set', m[2], 'local', m[0]);

  // {{getvar::name}}
  const p2 = /\{\{getvar::([^}]+)\}\}/gi;
  while ((m = p2.exec(content))) add(m[1], 'get', undefined, 'local', m[0]);

  // {{addvar::name::value}}
  const p3 = /\{\{addvar::([^:}]+)::([^}]*)\}\}/gi;
  while ((m = p3.exec(content))) add(m[1], 'addvar', m[2], 'local', m[0]);

  // {{setglobalvar::name::value}}
  const p4 = /\{\{setglobalvar::([^:}]+)::([^}]*)\}\}/gi;
  while ((m = p4.exec(content))) add(m[1], 'set', m[2], 'global', m[0]);

  // {{getglobalvar::name}}
  const p5 = /\{\{getglobalvar::([^}]+)\}\}/gi;
  while ((m = p5.exec(content))) add(m[1], 'get', undefined, 'global', m[0]);

  // /setvar key=X value
  const p6 = /\/setvar\s+key=(\S+)\s+(.*?)(?:\||$)/gm;
  while ((m = p6.exec(content))) add(m[1], 'set', m[2], 'local', m[0]);

  // /getvar key=X  or  /getvar X
  const p7 = /\/getvar\s+(?:key=)?(\S+)/g;
  while ((m = p7.exec(content))) add(m[1], 'get', undefined, 'local', m[0]);

  // /setglobalvar key=X value
  const p8 = /\/setglobalvar\s+key=(\S+)\s+(.*?)(?:\||$)/gm;
  while ((m = p8.exec(content))) add(m[1], 'set', m[2], 'global', m[0]);

  // /getglobalvar key=X  or  /getglobalvar X
  const p9 = /\/getglobalvar\s+(?:key=)?(\S+)/g;
  while ((m = p9.exec(content))) add(m[1], 'get', undefined, 'global', m[0]);

  return refs;
}

function getPresetPrompts() {
  try {
    const ctx = SillyTavern.getContext();
    const oai = ctx.chatCompletionSettings;
    if (!oai || !Array.isArray(oai.prompts)) return [];
    return oai.prompts.filter(Boolean).map(p => ({
      identifier: p.identifier || '',
      name: p.name || p.identifier || '(no name)',
      content: p.content || '',
    }));
  } catch (e) {
    console.error('[VarInspector] getPresetPrompts error:', e);
    return [];
  }
}

function getLiveVariables() {
  try {
    const ctx = SillyTavern.getContext();
    const local = ctx.chatMetadata?.variables ?? {};
    const extSettings = ctx.extensionSettings ?? {};
    const global = extSettings.variables?.global ?? {};
    return { local, global };
  } catch (e) {
    console.error('[VarInspector] getLiveVariables error:', e);
    return { local: {}, global: {} };
  }
}

function analyse() {
  const prompts = getPresetPrompts();
  const liveVars = getLiveVariables();
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

  // Include live variables not found in preset (orphans)
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
  const labels = { set: '📝 set', get: '👁 get', addvar: '➕ add' };
  return labels[type] || type;
}

function renderVarList(vars) {
  if (vars.length === 0) {
    return '<div class="st-multitool-vi-empty">Không tìm thấy biến nào.</div>';
  }

  return vars.map(v => {
    const borderColor = v.scope === 'global' ? '#a78bfa' : '#00e6b8';
    const scopeLabel = v.scope === 'global' ? '🌍 Global' : '🗨 Local';
    const liveDisplay = v.liveValue !== null
      ? `<span class="st-multitool-vi-val-live">${escapeHtml(truncate(v.liveValue, 50))}</span>`
      : `<span class="st-multitool-vi-val-null">chưa có giá trị</span>`;

    const sourcesHtml = v.sources.length === 0
      ? '<div class="st-multitool-vi-no-src">Không tìm thấy trong prompt nào (biến runtime)</div>'
      : v.sources.map(s => `
          <div class="st-multitool-vi-src-item">
            <span class="st-multitool-vi-src-type">${typeLabel(s.type)}</span>
            <span class="st-multitool-vi-src-prompt" title="${escapeHtml(s.promptId)}">${escapeHtml(s.promptName)}</span>
            ${s.value !== undefined ? `<span class="st-multitool-vi-src-val"> = ${escapeHtml(truncate(s.value, 40))}</span>` : ''}
            <div class="st-multitool-vi-src-excerpt">${escapeHtml(s.excerpt)}</div>
          </div>`).join('');

    return `
      <div class="st-multitool-vi-card" style="border-left:3px solid ${borderColor} !important;">
        <div class="st-multitool-vi-header">
          <span class="st-multitool-vi-var-name">${escapeHtml(v.name)}</span>
          <span class="st-multitool-vi-scope">${scopeLabel}</span>
          <span class="st-multitool-vi-chevron">▶</span>
        </div>
        <div class="st-multitool-vi-value">${liveDisplay}</div>
        <div class="st-multitool-vi-sources" style="display:none;">
          <div class="st-multitool-vi-src-title">Xuất hiện trong preset:</div>
          ${sourcesHtml}
        </div>
      </div>`;
  }).join('');
}

// ─── Init ──────────────────────────────────────────────────────────────────────

let _initialized = false;
let _allVars = [];
let _currentScope = 'all';

function doRefresh() {
  _allVars = analyse();
  applyFilter();
  const status = document.getElementById('st-multitool-var-inspector-status');
  if (status) {
    const lc = _allVars.filter(v => v.scope === 'local').length;
    const gc = _allVars.filter(v => v.scope === 'global').length;
    status.textContent = `📊 ${lc} biến local · ${gc} biến global · ${_allVars.length} tổng cộng`;
    status.style.color = '#aaa';
  }
}

function applyFilter() {
  const searchInput = document.getElementById('st-multitool-vi-search');
  const body = document.getElementById('st-multitool-var-inspector-body');
  if (!body) return;

  const term = (searchInput?.value ?? '').trim().toLowerCase();

  const filtered = _allVars.filter(v => {
    const scopeOk = _currentScope === 'all' || v.scope === _currentScope;
    const termOk = !term || v.name.toLowerCase().includes(term);
    return scopeOk && termOk;
  });

  body.innerHTML = renderVarList(filtered);

  // Bind accordion
  body.querySelectorAll('.st-multitool-vi-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const card = hdr.closest('.st-multitool-vi-card');
      const sources = card.querySelector('.st-multitool-vi-sources');
      const chevron = hdr.querySelector('.st-multitool-vi-chevron');
      const isOpen = sources.style.display !== 'none';
      sources.style.display = isOpen ? 'none' : 'block';
      chevron.textContent = isOpen ? '▶' : '▼';
    });
  });
}

export function initVarInspector() {
  if (_initialized) return;
  _initialized = true;

  // Inject CSS with extremely high specificity to fight ST overrides
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #st-multitool-var-inspector-body .st-multitool-vi-card {
      background: rgba(255,255,255,0.04) !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 8px !important;
      overflow: visible !important;
      min-height: 40px !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-card * {
      visibility: visible !important;
      opacity: 1 !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-header {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 8px 10px !important;
      cursor: pointer !important;
      min-height: 32px !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-var-name {
      flex: 1 !important;
      font-weight: 600 !important;
      color: #e2e8f0 !important;
      font-size: 0.88em !important;
      font-family: 'Courier New', monospace !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-scope {
      font-size: 0.7em !important;
      color: #999 !important;
      white-space: nowrap !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-chevron {
      font-size: 0.7em !important;
      color: #666 !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-value {
      padding: 2px 10px 8px !important;
      font-size: 0.82em !important;
      display: block !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-val-live {
      color: #86efac !important;
      font-family: 'Courier New', monospace !important;
      background: rgba(134,239,172,0.1) !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-val-null {
      color: #666 !important;
      font-style: italic !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-sources {
      padding: 0 10px 10px !important;
      border-top: 1px solid rgba(255,255,255,0.05) !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-src-title {
      font-size: 0.72em !important;
      color: #777 !important;
      margin: 6px 0 4px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-src-item {
      background: rgba(255,255,255,0.04) !important;
      border-radius: 5px !important;
      padding: 5px 8px !important;
      margin-bottom: 4px !important;
      font-size: 0.82em !important;
      display: block !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-src-type {
      color: #00e6b8 !important;
      font-weight: 600 !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-src-prompt {
      color: #a0c4ff !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-src-val {
      color: #fde68a !important;
      font-family: 'Courier New', monospace !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-src-excerpt {
      color: #888 !important;
      font-family: 'Courier New', monospace !important;
      font-size: 0.88em !important;
      margin-top: 3px !important;
      word-break: break-all !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-empty {
      color: #888 !important;
      text-align: center !important;
      padding: 20px !important;
    }
    #st-multitool-var-inspector-body .st-multitool-vi-no-src {
      color: #666 !important;
      font-style: italic !important;
      font-size: 0.82em !important;
      padding: 4px 0 !important;
    }
    #st-multitool-var-inspector-status {
      color: #aaa !important;
      font-size: 0.8em !important;
    }
  `;
  document.head.appendChild(styleEl);

  const $popup = $('#st-multitool-popup');

  // Toggle panel visibility
  $popup.on('click', '#st-multitool-var-inspector-btn', function () {
    const panel = document.getElementById('st-multitool-var-inspector-panel');
    if (!panel) return;
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    if (isHidden) doRefresh();
  });

  // Scope filter buttons
  $popup.on('click', '.st-multitool-vi-scope-btn', function () {
    $('.st-multitool-vi-scope-btn').removeClass('active')
      .css({ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#aaa' });
    $(this).addClass('active')
      .css({ background: 'rgba(0,230,184,0.18)', border: '1px solid #00e6b8', color: '#00e6b8' });
    _currentScope = $(this).data('scope');
    applyFilter();
  });

  // Search filter (live on input)
  $popup.on('input', '#st-multitool-vi-search', function () {
    applyFilter();
  });

  // Init scope button default styles
  setTimeout(() => {
    $('.st-multitool-vi-scope-btn').each(function () {
      if ($(this).hasClass('active')) {
        $(this).css({ background: 'rgba(0,230,184,0.18)', border: '1px solid #00e6b8', color: '#00e6b8' });
      } else {
        $(this).css({ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#aaa' });
      }
    });
  }, 500);
}

