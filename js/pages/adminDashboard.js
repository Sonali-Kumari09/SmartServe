document.addEventListener('DOMContentLoaded', async () => {
  SeedData.seedDatabase();
  const session = Auth.requireRole('admin');
  if (!session) return;

  document.getElementById('adminName').textContent = session.name;
  document.getElementById('logoutBtn').addEventListener('click', () => {
    Auth.logout();
    window.location.href = '../login.html';
  });

  Notify.renderHolidayBanner(document.getElementById('holidayBanner'));
  document.getElementById('mealClock').innerHTML = MealTimer.buildClockSVG();

  const todayKey = DateUtils.todayKey();
  const history = DB.get('history', []);

  // -- weather widget --
  const wxEl = document.getElementById('weatherWidget');
  wxEl.innerHTML = '<p class="empty-state">Loading weather…</p>';
  const weather = await Weather.getToday();
  wxEl.innerHTML = `
    <div class="weather-widget__temp">${weather.tempC}°C</div>
    <div>
      <div class="weather-widget__cond">${weather.condition}</div>
      <div class="weather-widget__meta">Rain chance ${weather.precipitationProb}% · demand ×${Weather.demandFactor(weather).toFixed(2)} · ${weather.source === 'live' ? 'live forecast' : 'offline estimate'}</div>
    </div>`;

  // -- forecast cards --
  const forecasts = Forecast.forecastAllMeals(todayKey, history, weather);
  document.getElementById('forecastCards').innerHTML = forecasts.map(f => `
    <div class="card">
      <div class="forecast-card__head">
        <span class="forecast-card__meal">${f.mealType}</span>
        <span class="badge badge--info">${f.confidence} confidence</span>
      </div>
      <div class="forecast-card__attendance">${f.expectedAttendance} <span>expected</span></div>
      <div class="forecast-card__qty">Prep ≈ ${f.recommendedQtyKg} kg</div>
      <ul class="forecast-card__factors">${f.factorsApplied.map(x => `<li>${x}</li>`).join('')}</ul>
    </div>`).join('');

  // -- quick stats: yesterday's actual vs expected, running waste trend --
  const yesterdayKey = DateUtils.toKey(DateUtils.addDays(new Date(), -1));
  const yData = history.filter(h => h.date === yesterdayKey);
  const totalActual = yData.reduce((s, h) => s + h.actual, 0);
  const totalWaste = yData.reduce((s, h) => s + h.wasteKg, 0);
  const last7Waste = history.filter(h => h.date >= DateUtils.toKey(DateUtils.addDays(new Date(), -7)))
    .reduce((s, h) => s + h.wasteKg, 0);

  document.getElementById('quickStats').innerHTML = `
    <div class="stat"><div class="stat__value">${totalActual}</div><div class="stat__label">Attendance yesterday</div></div>
    <div class="stat"><div class="stat__value">${totalWaste} kg</div><div class="stat__label">Waste yesterday</div></div>
    <div class="stat"><div class="stat__value">${last7Waste} kg</div><div class="stat__label">Waste, last 7 days</div></div>
  `;

  // -- upcoming holidays list --
  const upcoming = Holiday.listUpcoming(30);
  document.getElementById('upcomingHolidays').innerHTML = upcoming.length
    ? upcoming.map(h => `<li><strong>${DateUtils.formatLong(DateUtils.fromKey(h.date))}</strong> — ${h.name} <span class="badge badge--info">demand ×${h.demandFactor}</span></li>`).join('')
    : '<li class="empty-state">No holidays in the next 30 days.</li>';
});
