export const escapeHtml = unsafe => {
  if (unsafe === null || typeof unsafe === 'undefined') return '';
  return $('<div>').text(String(unsafe)).html();
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
