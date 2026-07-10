import { escapeHtml } from '../utils.js';
import { showSubView } from '../ui.js';

let currentMode = 'ctx'; // 'ctx' or 'win'
let treeData = {};
let maxDepth = 4;
let visitedObjects = new WeakSet();

export function initExplorer() {
  $('#st-multitool-manage-explorer-btn').on('click', () => {
    showSubView('st-multitool-explorer-view');
    loadData();
  });

  $('#st-multitool-explorer-tab-ctx').on('click', () => {
    currentMode = 'ctx';
    updateTabs();
    loadData();
  });

  $('#st-multitool-explorer-tab-win').on('click', () => {
    currentMode = 'win';
    updateTabs();
    loadData();
  });

  $('#st-multitool-explorer-refresh-btn').on('click', () => {
    loadData();
  });

  $('#st-multitool-explorer-search').on('input', function() {
    const query = $(this).val().toLowerCase();
    filterTree(query);
  });

  $('#st-multitool-explorer-tree-container').on('click', '.st-multitool-tree-toggle', function() {
    const $this = $(this);
    const $children = $this.siblings('.st-multitool-tree-children');
    if ($children.is(':visible')) {
      $children.hide();
      $this.find('i').attr('data-lucide', 'chevron-right');
    } else {
      $children.show();
      $this.find('i').attr('data-lucide', 'chevron-down');
    }
    if (window.lucide) window.lucide.createIcons();
  });

  $('#st-multitool-explorer-console-run').on('click', () => {
    runConsole();
  });
  
  $('#st-multitool-explorer-console-input').on('keydown', function(e) {
    if (e.key === 'Enter') runConsole();
  });
}

function updateTabs() {
  $('#st-multitool-explorer-tab-ctx').css({
    'border-bottom': currentMode === 'ctx' ? '2px solid #00d2b4' : 'none',
    'opacity': currentMode === 'ctx' ? '1' : '0.7'
  });
  $('#st-multitool-explorer-tab-win').css({
    'border-bottom': currentMode === 'win' ? '2px solid #00d2b4' : 'none',
    'opacity': currentMode === 'win' ? '1' : '0.7'
  });
}

function loadData() {
  $('#st-multitool-explorer-tree-container').html('<div style="text-align:center; padding: 20px;"><i data-lucide="loader-2" class="lucide-spin"></i> Đang tải dữ liệu...</div>');
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    visitedObjects = new WeakSet();
    if (currentMode === 'ctx') {
      try {
        treeData = window.SillyTavern && window.SillyTavern.getContext ? window.SillyTavern.getContext() : { error: "SillyTavern context not available" };
      } catch (e) {
        treeData = { error: e.message };
      }
    } else {
      treeData = {};
      for (let key of Object.keys(window)) {
        try {
          if (['window', 'document', 'top', 'parent', 'frames', 'self', 'globalThis'].includes(key)) continue;
          treeData[key] = window[key];
        } catch (e) {
          treeData[key] = `[Error Accessing: ${e.message}]`;
        }
      }
    }

    const html = buildTreeHtml(treeData, 'Root', 0);
    $('#st-multitool-explorer-tree-container').html(html);
    if (window.lucide) window.lucide.createIcons();
    
    const query = $('#st-multitool-explorer-search').val().toLowerCase();
    if (query) filterTree(query);
  }, 10);
}

function buildTreeHtml(obj, keyName, depth) {
  if (depth > maxDepth) return `<div class="st-multitool-tree-node"><span class="st-multitool-tree-key">${escapeHtml(keyName)}</span>: <span style="color:#aaa;">[Max Depth Reached]</span></div>`;

  let type = typeof obj;
  if (obj === null) type = 'null';
  else if (Array.isArray(obj)) type = 'array';
  
  if (type === 'object' || type === 'array') {
    if (visitedObjects.has(obj)) {
      return `<div class="st-multitool-tree-node"><span class="st-multitool-tree-key">${escapeHtml(keyName)}</span>: <span style="color:#f28b82;">[Circular Reference]</span></div>`;
    }
    visitedObjects.add(obj);
  }

  if (type === 'object' || type === 'array') {
    let keys = [];
    try {
      keys = Object.keys(obj);
    } catch(e) {}
    
    if (keys.length === 0) {
      return `<div class="st-multitool-tree-node" data-search-text="${escapeHtml(keyName.toLowerCase())}"><span class="st-multitool-tree-key">${escapeHtml(keyName)}</span>: ${type === 'array' ? '[]' : '{}'}</div>`;
    }

    let childrenHtml = '';
    const renderKeys = keys.slice(0, 100);
    for (let k of renderKeys) {
      try {
        childrenHtml += buildTreeHtml(obj[k], k, depth + 1);
      } catch (e) {
        childrenHtml += `<div class="st-multitool-tree-node"><span class="st-multitool-tree-key">${escapeHtml(k)}</span>: <span style="color:#f28b82;">[Error]</span></div>`;
      }
    }
    if (keys.length > 100) {
      childrenHtml += `<div class="st-multitool-tree-node" style="color:#aaa;">...and ${keys.length - 100} more items</div>`;
    }

    const isRoot = depth === 0;
    const displayStyle = isRoot ? 'block' : 'none';
    const icon = isRoot ? 'chevron-down' : 'chevron-right';
    const labelColor = type === 'array' ? '#fbbc04' : '#00d2b4';

    return `
      <div class="st-multitool-tree-node" data-search-text="${escapeHtml(keyName.toLowerCase())}" style="margin-left: ${depth > 0 ? 15 : 0}px;">
        <span class="st-multitool-tree-toggle" style="cursor:pointer; user-select:none; color: ${labelColor};">
          <i data-lucide="${icon}" style="width: 14px; height: 14px; vertical-align: -2px;"></i>
          <span class="st-multitool-tree-key" style="font-weight: bold;">${escapeHtml(keyName)}</span>
          <span style="color:#aaa; font-size: 11px;">(${type === 'array' ? 'Array' : 'Object'} [${keys.length}])</span>
        </span>
        <div class="st-multitool-tree-children" style="display: ${displayStyle}; border-left: 1px dashed rgba(255,255,255,0.2); padding-left: 5px; margin-top: 2px;">
          ${childrenHtml}
        </div>
      </div>
    `;
  } else if (type === 'function') {
    return `<div class="st-multitool-tree-node" data-search-text="${escapeHtml(keyName.toLowerCase())}" style="margin-left: ${depth > 0 ? 15 : 0}px;">
      <span class="st-multitool-tree-key" style="color:#c58af9;">${escapeHtml(keyName)}</span>: <span style="color:#aaa;">ƒ ()</span>
    </div>`;
  } else {
    let valStr = String(obj);
    if (type === 'string') valStr = `"${valStr}"`;
    if (valStr.length > 100) valStr = valStr.substring(0, 100) + '...';
    
    let color = '#a5d6ff';
    if (type === 'number') color = '#b5e5a4';
    else if (type === 'boolean') color = '#ff8a65';
    else if (type === 'null' || type === 'undefined') color = '#999';

    return `<div class="st-multitool-tree-node" data-search-text="${escapeHtml(keyName.toLowerCase())}" style="margin-left: ${depth > 0 ? 15 : 0}px;">
      <span class="st-multitool-tree-key" style="color:#c58af9;">${escapeHtml(keyName)}</span>: <span style="color:${color};">${escapeHtml(valStr)}</span>
    </div>`;
  }
}

function filterTree(query) {
  if (!query) {
    $('.st-multitool-tree-node').show();
    return;
  }
  
  $('.st-multitool-tree-node').hide();
  $('.st-multitool-tree-node').each(function() {
    const text = $(this).attr('data-search-text') || '';
    if (text.includes(query)) {
      $(this).show();
      $(this).parents('.st-multitool-tree-node').show();
      $(this).parents('.st-multitool-tree-children').show();
      $(this).parents('.st-multitool-tree-node').find('> .st-multitool-tree-toggle i').attr('data-lucide', 'chevron-down');
    }
  });
  if (window.lucide) window.lucide.createIcons();
}

function runConsole() {
  const code = $('#st-multitool-explorer-console-input').val();
  if (!code) return;
  const $out = $('#st-multitool-explorer-console-output');
  try {
    let result = eval(code);
    let outStr = '';
    if (typeof result === 'object') {
      try {
        outStr = JSON.stringify(result, null, 2);
      } catch(e) {
        outStr = String(result);
      }
    } else {
      outStr = String(result);
    }
    $out.html(`<span style="color:#b5e5a4;">${escapeHtml(outStr)}</span>`);
  } catch (e) {
    $out.html(`<span style="color:#f28b82;">Error: ${escapeHtml(e.message)}</span>`);
  }
}
