document.addEventListener('DOMContentLoaded', async () => {
  const session = Auth.requireRole('admin');
  if (!session) return;
  document.getElementById('adminName').textContent = session.name;
  document.getElementById('logoutBtn').addEventListener('click', () => {
    Auth.logout();
    window.location.href = '../login.html';
  });
  Notify.renderHolidayBanner(document.getElementById('holidayBanner'));
  document.getElementById('mealClock').innerHTML = MealTimer.buildClockSVG();

  const wxEl = document.getElementById('weatherWidget');
  wxEl.innerHTML = '<p class="empty-state">Loading weather...</p>';
  try {
    const weather = await Weather.getToday();
    wxEl.innerHTML = `<div class="weather-widget__temp">${weather.tempC}°C</div>
      <div>
        <div class="weather-widget__cond">${weather.condition}</div>
        <div class="weather-widget__meta">Rain chance ${weather.precipitationProb}% · ${weather.source === 'live' ? 'live forecast' : 'offline estimate'}</div>
      </div>`;
  } catch (error) {
    wxEl.innerHTML = '<p class="empty-state">Weather unavailable.</p>';
  }

  let menus = [];
  let selectedKey = DateUtils.todayKey();

  function dateKeyOf(menu) {
    return String(menu.date).slice(0, 10);
  }

    async function loadMenus() {
    try {
      const from = DateUtils.toKey(DateUtils.addDays(new Date(), -3));
      const to = DateUtils.toKey(DateUtils.addDays(new Date(), 21));
      const res = await API.menus(`?from=${from}&to=${to}`);
      menus = res.menus || [];
    } catch (error) {
      menus = [];
      Notify.toast(error.message, 'error');
    }
    // Same client-side dummy fallback as student dashboard when DB has no menus
    ensureDummyMenus();
  }

  function ensureDummyMenus() {
    const today = new Date();
    for (let i = -1; i <= 13; i++) {
      const d = DateUtils.addDays(today, i);
      const key = DateUtils.toKey(d);
      const hasAny = menus.some((m) => dateKeyOf(m) === key);
      if (hasAny) continue;
      const template = SeedData.menuForDate(key);
      ['breakfast', 'lunch', 'dinner'].forEach((meal) => {
        const items = (template[meal] || []).map((name) => ({ name, category: 'Main' }));
        menus.push({
          date: key,
          mealType: meal,
          items,
          baselineAttendance: meal === 'lunch' ? 500 : meal === 'dinner' ? 450 : 320,
          _dummy: true
        });
      });
    }
  }

  function renderDayMenu(dateKey) {
    selectedKey = dateKey;
    const dateMenus = menus.filter((menu) => dateKeyOf(menu) === dateKey);
    const holiday = HolidayData.byDate(dateKey);
    document.getElementById('menuDateLabel').textContent =
      (dateKey === DateUtils.todayKey() ? 'Today · ' : '') + DateUtils.formatLong(DateUtils.fromKey(dateKey));
    document.getElementById('menuHolidayNote').innerHTML = holiday
      ? `<span class="badge badge--upcoming"><i class="badge__dot"></i>${holiday.name}</span>`
      : '';

    document.getElementById('dayMenu').innerHTML = ['breakfast', 'lunch', 'dinner']
      .map((meal) => {
        const menu = dateMenus.find((entry) => entry.mealType === meal);
        const items = menu ? menu.items || [] : [];
        const baseline = menu ? menu.baselineAttendance : null;
        return `
          <div class="day-menu__meal">
            <h4>${meal}${baseline != null ? ` <span class="badge badge--info">${baseline} expected</span>` : ''}</h4>
            ${
              items.length
                ? `<ul>${items.map((item) => `<li>${item.name || item}</li>`).join('')}</ul>`
                : '<p style="font-size:0.85rem;color:var(--steel-600);">No service</p>'
            }
          </div>`;
      })
      .join('');
  }

  function renderCalendar() {
    const date = DateUtils.fromKey(selectedKey);
    Calendar.render(document.getElementById('calendar'), {
      year: date.getFullYear(),
      month: date.getMonth(),
      selectedKey,
      onSelect: (key) => {
        renderDayMenu(key);
        renderCalendar();
      }
    });
  }

  function renderMenuList() {
    const today = DateUtils.todayKey();
    const upcoming = menus
      .filter((m) => dateKeyOf(m) >= today)
      .slice(0, 42);
    if (!upcoming.length) {
      document.getElementById('menuList').innerHTML =
        '<p class="empty-state">No menus configured yet. Use the form above or re-run database seed.</p>';
      return;
    }
    const byDate = {};
    upcoming.forEach((m) => {
      const k = dateKeyOf(m);
      if (!byDate[k]) byDate[k] = [];
      byDate[k].push(m);
    });
    document.getElementById('menuList').innerHTML = Object.keys(byDate)
      .sort()
      .map((k) => {
        const meals = byDate[k]
          .map(
            (m) =>
              `<span class="menu-chip"><strong>${m.mealType}</strong>: ${(m.items || []).map((i) => i.name || i).join(', ') || '—'} <em>(${m.baselineAttendance})</em></span>`
          )
          .join('');
        return `<div class="menu-list__row"><div class="menu-list__date">${DateUtils.formatLong(DateUtils.fromKey(k))}</div><div class="menu-list__meals">${meals}</div></div>`;
      })
      .join('');
  }

  async function loadForecastAndStats() {
    try {
      const meals = await Promise.all(
        ['breakfast', 'lunch', 'dinner'].map(async (mealType) => ({
          mealType,
          data: await API.forecast(`?mealType=${mealType}&date=${selectedKey}`)
        }))
      );
      document.getElementById('forecastCards').innerHTML = meals
        .map(({ mealType, data }) => {
          const factors = (data.factorsApplied || []).join(', ') || 'historical';
          const rsvp = data.rsvpTotal
            ? `${data.rsvpYes}/${data.rsvpTotal} students attending (RSVP)`
            : 'No student RSVPs yet';
          return `<div class="card">
            <div class="forecast-card__head">
              <span class="forecast-card__meal">${mealType}</span>
              <span class="badge badge--info">${Math.round((data.confidence || 0) * 100)}% confidence</span>
            </div>
            <div class="forecast-card__attendance">${data.forecast} <span>expected diners</span></div>
            <div class="forecast-card__qty">Prep ~ <strong>${data.recommendedQtyKg ?? '—'} kg</strong></div>
            <div class="forecast-card__qty" style="margin-top:6px;font-size:0.8rem;color:var(--steel-600);">
              ${rsvp} · factors: ${factors}<br/>
              Based on ${data.basedOnMenus} menu records
            </div>
          </div>`;
        })
        .join('');

      const report = await API.reportSummary();
      const carbon =
        report.totals?.carbonSavedKg != null
          ? report.totals.carbonSavedKg
          : Math.round((report.totals?.deliveredKg || 0) * 2.5);
      const cost =
        report.totals?.costSaved != null
          ? report.totals.costSaved
          : Math.round((report.totals?.deliveredKg || 0) * 80);

      document.getElementById('quickStats').innerHTML = `
        <div class="stat"><div class="stat__value">${report.menuCount}</div><div class="stat__label">Menus configured</div></div>
        <div class="stat"><div class="stat__value">${report.totals.totalKg} kg</div><div class="stat__label">Surplus tracked</div></div>
        <div class="stat"><div class="stat__value">${report.totals.deliveredKg} kg</div><div class="stat__label">Delivered</div></div>
        <div class="stat"><div class="stat__value">₹${cost}</div><div class="stat__label">Est. cost saved</div></div>
        <div class="stat"><div class="stat__value">${carbon} kg</div><div class="stat__label">Est. CO₂ avoided</div></div>`;
    } catch (error) {
      Notify.toast(error.message, 'error');
    }
  }

  await loadMenus();
  renderDayMenu(selectedKey);
  renderCalendar();
  renderMenuList();
  await loadForecastAndStats();

  document.getElementById('menuForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await API.createMenu({
        date: document.getElementById('menuDate').value,
        mealType: document.getElementById('menuMeal').value,
        baselineAttendance: Number(document.getElementById('menuAttendance').value),
        items: document
          .getElementById('menuItems')
          .value.split(',')
          .map((name) => ({
            name: name.trim(),
            category: 'Main',
            portionsPlanned: Number(document.getElementById('menuAttendance').value)
          }))
          .filter((item) => item.name)
      });
      Notify.toast('Menu saved.', 'success');
      event.target.reset();
      await loadMenus();
      renderDayMenu(selectedKey);
      renderMenuList();
      await loadForecastAndStats();
    } catch (error) {
      Notify.toast(error.message, 'error');
    }
  });

  document.getElementById('upcomingHolidays').innerHTML =
    Holiday.listUpcoming(30)
      .map(
        (h) =>
          `<li><strong>${DateUtils.formatLong(DateUtils.fromKey(h.date))}</strong> - ${h.name} <span class="badge badge--info">demand x${h.demandFactor}</span></li>`
      )
      .join('') || '<li class="empty-state">No holidays in the next 30 days.</li>';
});
