/* mealTimer.js — breakfast / lunch / dinner open-closed logic */
const MealTimer = (() => {
  const WINDOWS = {
    breakfast: { start: '07:30', end: '09:30', label: 'Breakfast' },
    lunch: { start: '12:30', end: '14:30', label: 'Lunch' },
    dinner: { start: '19:30', end: '21:30', label: 'Dinner' }
  };
  const ORDER = ['breakfast', 'lunch', 'dinner'];

  /** Status of one meal window right now: 'upcoming' | 'open' | 'closed' */
  function statusOf(mealType, now = new Date()) {
    const w = WINDOWS[mealType];
    const nowMin = DateUtils.minutesNow(now);
    const start = DateUtils.timeStrToMinutes(w.start);
    const end = DateUtils.timeStrToMinutes(w.end);
    if (nowMin < start) return 'upcoming';
    if (nowMin >= start && nowMin < end) return 'open';
    return 'closed';
  }

  /** Milliseconds until a window opens or closes (whichever is relevant to its current status). */
  function msUntilBoundary(mealType, now = new Date()) {
    const w = WINDOWS[mealType];
    const status = statusOf(mealType, now);
    const boundaryStr = status === 'upcoming' ? w.start : w.end;
    const [h, m] = boundaryStr.split(':').map(Number);
    const boundary = new Date(now);
    boundary.setHours(h, m, 0, 0);
    if (status === 'closed') boundary.setDate(boundary.getDate() + 1); // next occurrence tomorrow
    return boundary - now;
  }

  /** Full snapshot of all three meals, ready for rendering. */
  function snapshot(now = new Date()) {
    return ORDER.map(mealType => {
      const status = statusOf(mealType, now);
      return {
        mealType,
        label: WINDOWS[mealType].label,
        window: `${to12h(WINDOWS[mealType].start)} – ${to12h(WINDOWS[mealType].end)}`,
        status,
        countdownMs: msUntilBoundary(mealType, now),
        countdownLabel: status === 'open' ? `closes in ${DateUtils.humanDuration(msUntilBoundary(mealType, now))}`
          : status === 'upcoming' ? `opens in ${DateUtils.humanDuration(msUntilBoundary(mealType, now))}`
          : 'closed for today'
      };
    });
  }

  function to12h(str) {
    const [h, m] = str.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  function currentMeal(now = new Date()) {
    return ORDER.find(m => statusOf(m, now) === 'open') || null;
  }

  const STATUS_COLOR = { open: '#3F7D4F', upcoming: '#E3A008', closed: '#5B6D63' };

  function polarToXY(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function minutesToAngle(min) { return (min / 1440) * 360; }

  /** Builds the signature "meal clock" ring: a 24h circle with an arc per meal window. */
  function buildClockSVG(now = new Date()) {
    const cx = 54, cy = 54, r = 42;
    const nowAngle = minutesToAngle(DateUtils.minutesNow(now));
    const arcs = ORDER.map(mealType => {
      const w = WINDOWS[mealType];
      const a0 = minutesToAngle(DateUtils.timeStrToMinutes(w.start));
      const a1 = minutesToAngle(DateUtils.timeStrToMinutes(w.end));
      const p0 = polarToXY(cx, cy, r, a0);
      const p1 = polarToXY(cx, cy, r, a1);
      const largeArc = (a1 - a0) <= 180 ? 0 : 1;
      const color = STATUS_COLOR[statusOf(mealType, now)];
      return `<path d="M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}"
                fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" />`;
    }).join('');
    const marker = polarToXY(cx, cy, r, nowAngle);
    return `
      <svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Meal timing clock">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(120,120,120,0.18)" stroke-width="9" />
        ${arcs}
        <circle cx="${marker.x.toFixed(2)}" cy="${marker.y.toFixed(2)}" r="4.5" fill="#1B2420" stroke="#FAF7EC" stroke-width="1.5" />
        <text x="54" y="58" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" fill="currentColor">${DateUtils.formatTime(now)}</text>
      </svg>`;
  }

  return { WINDOWS, ORDER, statusOf, msUntilBoundary, snapshot, currentMeal, buildClockSVG, STATUS_COLOR };
})();
