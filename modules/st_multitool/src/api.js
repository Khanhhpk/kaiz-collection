import { delay } from './utils.js';

let tavernHelperApi;

export async function waitForTavernHelper(retries = 10, interval = 300) {
  for (let i = 0; i < retries; i++) {
    if (window.TavernHelper) {
      return window.TavernHelper;
    }
    await delay(interval);
  }
  throw new Error('TavernHelper API Chưa tải, hãy đảm bảo đã cài và bật tiện ích JS-Slash-Runner.');
}

export async function getTavernHelper() {
  if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
  return tavernHelperApi;
}

export async function getAllLorebooks() {
  const api = await getTavernHelper();
  const names = await api.getWorldbookNames();
  return names.map(name => ({ name, file_name: name }));
}

export async function getLorebookSettings() {
  const api = await getTavernHelper();
  return await api.getLorebookSettings();
}

export async function setLorebookSettings(settings) {
  const api = await getTavernHelper();
  await api.setLorebookSettings(settings);
}

export async function getLorebookEntries(bookName) {
  const api = await getTavernHelper();
  return await api.getWorldbook(bookName);
}

export async function setLorebookEntries(bookName, entries) {
  const api = await getTavernHelper();
  await api.replaceWorldbook(bookName, entries, { render: 'debounced' });
}

export async function createLorebookEntry(bookName, entryData) {
  const api = await getTavernHelper();
  const result = await api.createWorldbookEntries(bookName, [entryData], { render: 'debounced' });
  return result.new_entries[0];
}

export async function createLorebookEntries(bookName, entriesData) {
  const api = await getTavernHelper();
  return await api.createWorldbookEntries(bookName, entriesData, { render: 'debounced' });
}

export async function getTavernRegexes(targetOpt) {
  const api = await getTavernHelper();
  return await api.getTavernRegexes(targetOpt);
}

export async function updateTavernRegexesWith(updater, targetOpt) {
  const api = await getTavernHelper();
  return await api.updateTavernRegexesWith(updater, targetOpt);
}

export async function getScriptTrees(targetOpt) {
  const api = await getTavernHelper();
  return await api.getScriptTrees(targetOpt);
}

export async function updateScriptTreesWith(updater, targetOpt) {
  const api = await getTavernHelper();
  return await api.updateScriptTreesWith(updater, targetOpt);
}

export async function createWorldbook(name, entries = []) {
  const api = await getTavernHelper();
  return await api.createWorldbook(name, entries);
}

export async function deleteWorldbook(name) {
  const api = await getTavernHelper();
  return await api.deleteWorldbook(name);
}

export async function deleteWorldbookEntries(bookName, predicate, options = {}) {
  const api = await getTavernHelper();
  return await api.deleteWorldbookEntries(bookName, predicate, options);
}

export async function deleteLorebookEntriesByUids(bookName, uids) {
  const api = await getTavernHelper();
  return await api.deleteLorebookEntries(bookName, uids);
}

export async function getWorldbook(name) {
  return await getLorebookEntries(name);
}

export async function getChatMessages(floor) {
  const api = await getTavernHelper();
  return await api.getChatMessages(floor);
}
