export const escapeHtml = unsafe => {
  if (unsafe === null || typeof unsafe === 'undefined') return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const delay = ms => new Promise(res => setTimeout(res, ms));

export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Highly optimized, scoped Lucide icon renderer.
 * Prevents full DOM traversal across SillyTavern and prevents re-rendering existing <svg> icons.
 */
export function refreshIcons(rootEl = null) {
  if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;

  let rootNode = null;
  if (rootEl) {
    rootNode = rootEl instanceof jQuery ? rootEl[0] : (typeof rootEl === 'string' ? document.querySelector(rootEl) : rootEl);
  } else {
    rootNode = document.getElementById('st-multitool-modal') || document.body;
  }
  if (!rootNode) return;

  // Check if there are un-converted icons (i.e. tags with data-lucide that are NOT <svg>)
  const pendingIcons = rootNode.querySelectorAll('i[data-lucide], span[data-lucide], [data-lucide]:not(svg)');
  if (pendingIcons.length === 0) return; // Zero work if already rendered!

  window.lucide.createIcons({ root: rootNode });

  // Mark all rendered <svg data-lucide="..."> so future checks do not re-parse/re-render them
  const renderedSvgs = rootNode.querySelectorAll('svg[data-lucide]');
  for (let i = 0; i < renderedSvgs.length; i++) {
    const svg = renderedSvgs[i];
    const iconName = svg.getAttribute('data-lucide');
    if (iconName) {
      svg.setAttribute('data-lucide-rendered', iconName);
      svg.removeAttribute('data-lucide');
    }
  }
}

