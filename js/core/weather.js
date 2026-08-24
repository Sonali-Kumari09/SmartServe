/* weather.js — fetches live weather (Open-Meteo, free/no key) and converts it into a
 * demand-adjustment factor used by forecast.js. Falls back to a deterministic mock
 * if the network call fails (offline demo, blocked network, etc). */
const Weather = (() => {
  // Default location: Patna, Bihar. Change to your campus coordinates.
  const LAT = 25.5941, LON = 85.1376;
  const CACHE_KEY = 'weather_cache';

  const WEATHER_CODE_MAP = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
    80: 'Rain showers', 81: 'Rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm'
  };

  async function fetchLive() {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,precipitation,weather_code&daily=precipitation_probability_max&timezone=auto&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('weather fetch failed');
    const data = await res.json();
    return {
      tempC: data.current.temperature_2m,
      precipitationMm: data.current.precipitation,
      precipitationProb: data.daily?.precipitation_probability_max?.[0] ?? 0,
      condition: WEATHER_CODE_MAP[data.current.weather_code] || 'Unknown',
      source: 'live'
    };
  }

  function mock(dateKey) {
    const r = SeedData.seededRand('wx' + dateKey);
    const conditions = ['Clear sky', 'Partly cloudy', 'Overcast', 'Light rain', 'Rain'];
    return {
      tempC: Math.round(24 + r * 14),
      precipitationMm: r > 0.75 ? Math.round(r * 20) : 0,
      precipitationProb: Math.round(r * 100),
      condition: conditions[Math.floor(r * conditions.length)],
      source: 'mock'
    };
  }

  /** Cached-per-day weather lookup; tries live API once per day, then reuses cache. */
  async function getToday() {
    const todayKey = DateUtils.todayKey();
    const cached = DB.get(CACHE_KEY);
    if (cached && cached.dateKey === todayKey) return cached.data;

    let data;
    try { data = await fetchLive(); }
    catch (e) { data = mock(todayKey); }

    DB.set(CACHE_KEY, { dateKey: todayKey, data });
    return data;
  }

  /** Converts a weather snapshot into a multiplier applied to expected attendance.
   *  Rain and extreme temperatures reduce footfall; pleasant weather is neutral. */
  function demandFactor(weather) {
    let factor = 1;
    if (weather.precipitationProb >= 70 || weather.precipitationMm > 5) factor -= 0.18;
    else if (weather.precipitationProb >= 40) factor -= 0.08;
    if (weather.tempC >= 38) factor -= 0.1;
    if (weather.tempC <= 12) factor -= 0.05;
    return Math.max(0.6, factor);
  }

  return { getToday, demandFactor, mock };
})();
