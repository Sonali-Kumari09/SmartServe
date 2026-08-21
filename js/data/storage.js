/* storage.js — thin wrapper around localStorage acting as the app's "DB" */
const DB = (() => {
  const PREFIX = 'sms_';

  function key(k) { return PREFIX + k; }

  function get(k, fallback = null) {
    try {
      const raw = localStorage.getItem(key(k));
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.error('DB.get failed for', k, e);
      return fallback;
    }
  }

  function set(k, value) {
    try {
      localStorage.setItem(key(k), JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('DB.set failed for', k, e);
      return false;
    }
  }

  function remove(k) { localStorage.removeItem(key(k)); }

  /** Seed a key only if it doesn't already exist, so re-visits don't wipe admin edits. */
  function seedOnce(k, value) {
    if (localStorage.getItem(key(k)) === null) set(k, value);
  }

  /** Push a record into an array-backed collection and persist it. Returns the record. */
  function push(k, record) {
    const list = get(k, []);
    list.push(record);
    set(k, list);
    return record;
  }

  /** Update the first record matching predicate, persist, return true if something changed. */
  function updateWhere(k, predicate, updater) {
    const list = get(k, []);
    let changed = false;
    const next = list.map(item => {
      if (predicate(item)) { changed = true; return updater({ ...item }); }
      return item;
    });
    if (changed) set(k, next);
    return changed;
  }

  function nextId(prefix) {
    return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  }

  return { get, set, remove, seedOnce, push, updateWhere, nextId };
})();
