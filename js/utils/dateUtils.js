/* dateUtils.js — small date helpers, no external deps */
const DateUtils = (() => {
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  function toKey(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function fromKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function isSameDay(a, b) { return toKey(a) === toKey(b); }

  function todayKey() { return toKey(new Date()); }

  function formatLong(date) {
    const d = new Date(date);
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatTime(date) {
    const d = new Date(date);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  /** "HH:MM" -> minutes since midnight */
  function timeStrToMinutes(str) {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  }

  function minutesNow(date = new Date()) { return date.getHours() * 60 + date.getMinutes(); }

  /** Human countdown like "1h 24m" or "38m" from a millisecond delta. */
  function humanDuration(ms) {
    if (ms <= 0) return '0m';
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  /** Build a 6x7 calendar matrix of Date objects (with leading/trailing days) for a month. */
  function getMonthMatrix(year, month) {
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const gridStart = addDays(first, -startOffset);
    const matrix = [];
    let cursor = gridStart;
    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) { week.push(cursor); cursor = addDays(cursor, 1); }
      matrix.push(week);
    }
    return matrix;
  }

  return {
    WEEKDAYS, MONTHS, toKey, fromKey, addDays, isSameDay, todayKey,
    formatLong, formatTime, timeStrToMinutes, minutesNow, humanDuration, getMonthMatrix
  };
})();
