/* holiday.js — thin logic layer over HolidayData */
const Holiday = (() => {
  function getTodayHoliday(date = new Date()) {
    return HolidayData.byDate(DateUtils.toKey(date));
  }

  function isUpcomingHoliday(withinDays = 7, from = new Date()) {
    const all = HolidayData.all();
    const fromKey = DateUtils.toKey(from);
    return all
      .filter(h => h.date >= fromKey && h.date <= DateUtils.toKey(DateUtils.addDays(from, withinDays)))
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  }

  function daysUntil(dateKey, from = new Date()) {
    const target = DateUtils.fromKey(dateKey);
    const diffMs = target.setHours(0, 0, 0, 0) - new Date(from).setHours(0, 0, 0, 0);
    return Math.round(diffMs / 86400000);
  }

  function listUpcoming(days = 30, from = new Date()) {
    const fromKey = DateUtils.toKey(from);
    const toKey = DateUtils.toKey(DateUtils.addDays(from, days));
    return HolidayData.all()
      .filter(h => h.date >= fromKey && h.date <= toKey)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Returns the banner-ready message: today's holiday takes priority over an upcoming one. */
  function bannerContext(from = new Date()) {
    const today = getTodayHoliday(from);
    if (today) return { kind: 'today', holiday: today };
    const upcoming = isUpcomingHoliday(7, from);
    if (upcoming) return { kind: 'upcoming', holiday: upcoming, daysUntil: daysUntil(upcoming.date, from) };
    return null;
  }

  return { getTodayHoliday, isUpcomingHoliday, daysUntil, listUpcoming, bannerContext };
})();
