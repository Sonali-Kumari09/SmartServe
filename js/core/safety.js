/* safety.js — storage time/temperature -> safe-until countdown.
 * Based on the standard food-safety "danger zone" rule (5°C–60°C):
 *   - Cold storage  (<= 5°C)   : safe for 72h
 *   - Hot holding   (>= 60°C)  : safe for 4h
 *   - Danger zone   (5–60°C)   : safe for only 2h cumulative
 * These are conservative defaults for a demo — a real deployment should use
 * your local food-safety authority's guidance. */
const Safety = (() => {
  const RULES = [
    { max: 5, hours: 72, band: 'Cold storage' },
    { min: 5, max: 60, hours: 2, band: 'Danger zone' },
    { min: 60, hours: 4, band: 'Hot holding' }
  ];

  function bandFor(tempC) {
    if (tempC <= 5) return RULES[0];
    if (tempC >= 60) return RULES[2];
    return RULES[1];
  }

  /**
   * @param {Object} p
   * @param {string|number} p.storedAt - ISO string or epoch ms of when the food was logged
   * @param {number} p.tempC - storage temperature in Celsius
   * @param {Date} [now]
   */
  function computeSafety({ storedAt, tempC }, now = new Date()) {
    const rule = bandFor(tempC);
    const storedDate = new Date(storedAt);
    const totalMs = rule.hours * 3600000;
    const safeUntil = new Date(storedDate.getTime() + totalMs);
    const remainingMs = safeUntil - now;
    const fractionRemaining = remainingMs / totalMs;

    let status;
    if (remainingMs <= 0) status = 'expired';
    else if (fractionRemaining <= 0.25 || remainingMs <= 30 * 60000) status = 'warning';
    else status = 'safe';

    return {
      band: rule.band,
      safeUntil,
      remainingMs,
      remainingLabel: remainingMs > 0 ? DateUtils.humanDuration(remainingMs) : 'expired',
      status
    };
  }

  /** Hard gate: unsafe/expired items must never be offered for redistribution. */
  function isSafeToRedistribute(entry, now = new Date()) {
    const { status } = computeSafety(entry, now);
    return status !== 'expired';
  }

  return { RULES, bandFor, computeSafety, isSafeToRedistribute };
})();
