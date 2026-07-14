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
    rootNode = document.getElementById('st-multitool-popup') || document.getElementById('st-multitool-modal') || document.body;
  }
  if (!rootNode) return;

  // Check if rootNode itself is a pending icon element
  const isSelfPending = rootNode.hasAttribute && rootNode.hasAttribute('data-lucide') && rootNode.tagName && rootNode.tagName.toLowerCase() !== 'svg';
  const pendingIcons = rootNode.querySelectorAll ? rootNode.querySelectorAll('i[data-lucide], span[data-lucide], [data-lucide]:not(svg)') : [];
  if (!isSelfPending && pendingIcons.length === 0) return; // Zero work if already rendered!

  // If rootNode is the icon itself (e.g. <i> tag), createIcons needs the parent container to replace it
  const targetRoot = isSelfPending ? (rootNode.parentElement || rootNode) : rootNode;
  window.lucide.createIcons({ root: targetRoot });

  // Mark targetRoot itself if it became an <svg data-lucide="...">
  if (targetRoot.hasAttribute && targetRoot.hasAttribute('data-lucide') && targetRoot.tagName && targetRoot.tagName.toLowerCase() === 'svg') {
    const iconName = targetRoot.getAttribute('data-lucide');
    targetRoot.setAttribute('data-lucide-rendered', iconName);
    targetRoot.removeAttribute('data-lucide');
  }

  // Mark all rendered <svg data-lucide="..."> inside targetRoot so future checks do not re-parse/re-render them
  const renderedSvgs = targetRoot.querySelectorAll ? targetRoot.querySelectorAll('svg[data-lucide]') : [];
  for (let i = 0; i < renderedSvgs.length; i++) {
    const svg = renderedSvgs[i];
    const iconName = svg.getAttribute('data-lucide');
    if (iconName) {
      svg.setAttribute('data-lucide-rendered', iconName);
      svg.removeAttribute('data-lucide');
    }
  }
}

