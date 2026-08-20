/* forecast.js — demand forecasting engine
 * expected attendance = weekday baseline (from history) x recent trend x weather factor x holiday factor
 * recommended prep qty  = expected attendance x per-head grams x (1 + safety buffer) */
const Forecast = (() => {

  function weekdayBaseline(history, mealType, weekday) {
    const sameWeekday = history.filter(h => h.mealType === mealType && DateUtils.fromKey(h.date).getDay() === weekday);
    const pool = sameWeekday.length ? sameWeekday : history.filter(h => h.mealType === mealType);
    if (!pool.length) return { avg: Math.round(SeedData.CONFIG.TOTAL_STUDENTS * 0.6), sampleSize: 0 };
    const avg = pool.reduce((s, h) => s + h.actual, 0) / pool.length;
    return { avg, sampleSize: pool.length };
  }

  /** Recent 7-day average vs the 7 days before that, for the same meal — captures a rising/falling trend. */
  function trendFactor(history, mealType) {
    const forMeal = history.filter(h => h.mealType === mealType).sort((a, b) => a.date.localeCompare(b.date));
    if (forMeal.length < 10) return 1;
    const recent = forMeal.slice(-7);
    const prior = forMeal.slice(-14, -7);
    const recentAvg = recent.reduce((s, h) => s + h.actual, 0) / recent.length;
    const priorAvg = prior.reduce((s, h) => s + h.actual, 0) / (prior.length || 1);
    if (!priorAvg) return 1;
    return Math.max(0.85, Math.min(1.15, recentAvg / priorAvg));
  }

  /**
   * @param {Object} p
   * @param {'breakfast'|'lunch'|'dinner'} p.mealType
   * @param {string} p.dateKey - 'YYYY-MM-DD'
   * @param {Array} p.history
   * @param {Object|null} p.weather - from Weather.getToday()
   */
  function forecastDemand({ mealType, dateKey, history, weather }) {
    const weekday = DateUtils.fromKey(dateKey).getDay();
    const { avg: baseline, sampleSize } = weekdayBaseline(history, mealType, weekday);
    const trend = trendFactor(history, mealType);
    const wxFactor = weather ? Weather.demandFactor(weather) : 1;
    const holiday = HolidayData.byDate(dateKey);
    const holidayFactor = holiday ? holiday.demandFactor : 1;

    const rawExpected = baseline * trend * wxFactor * holidayFactor;
    const expectedAttendance = Math.max(0, Math.min(SeedData.CONFIG.TOTAL_STUDENTS, Math.round(rawExpected)));

    const factorsApplied = [];
    factorsApplied.push(`Weekday baseline: ${Math.round(baseline)} (from ${sampleSize} past record${sampleSize === 1 ? '' : 's'})`);
    if (trend !== 1) factorsApplied.push(`Recent trend: ${trend > 1 ? '+' : ''}${Math.round((trend - 1) * 100)}%`);
    if (weather) factorsApplied.push(`Weather (${weather.condition}, ${weather.tempC}°C): ${wxFactor < 1 ? Math.round((wxFactor - 1) * 100) + '%' : 'no change'}`);
    if (holiday) factorsApplied.push(`Holiday "${holiday.name}": ${holidayFactor < 1 ? '' : '+'}${Math.round((holidayFactor - 1) * 100)}%`);

    const confidence = sampleSize >= 4 ? 'High' : sampleSize >= 1 ? 'Medium' : 'Low';
    const recommendedQtyKg = recommendQuantity(mealType, expectedAttendance);

    return { mealType, dateKey, expectedAttendance, recommendedQtyKg, confidence, factorsApplied, holiday };
  }

  function recommendQuantity(mealType, attendance) {
    const perHeadKg = SeedData.CONFIG.PER_HEAD_GRAMS[mealType] / 1000;
    const qty = attendance * perHeadKg * (1 + SeedData.CONFIG.PREP_BUFFER_PCT);
    return Math.round(qty * 10) / 10;
  }

  function forecastAllMeals(dateKey, history, weather) {
    return MealTimer.ORDER.map(mealType => forecastDemand({ mealType, dateKey, history, weather }));
  }

  return { forecastDemand, forecastAllMeals, recommendQuantity };
})();
