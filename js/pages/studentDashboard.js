document.addEventListener('DOMContentLoaded', () => {
  SeedData.seedDatabase();
  const session = Auth.requireRole('student');
  if (!session) return;

  document.getElementById('studentName').textContent = session.name;
  document.getElementById('logoutBtn').addEventListener('click', () => {
    Auth.logout();
    window.location.href = '../login.html';
  });

  const bannerEl = document.getElementById('holidayBanner');
  Notify.renderHolidayBanner(bannerEl);

  let selectedKey = DateUtils.todayKey();

  function renderMealTimings() {
    document.getElementById('mealClock').innerHTML = MealTimer.buildClockSVG();
    const snapshot = MealTimer.snapshot();
    document.getElementById('mealTimingList').innerHTML = snapshot.map(m => `
      <div class="meal-card ${m.status === 'open' ? 'meal-card--open' : 'meal-card--closed'}">
        <div class="meal-card__top">
          <div>
            <div class="meal-card__name">${m.label}</div>
            <div class="meal-card__window">${m.window}</div>
          </div>
          <span class="badge badge--${m.status}"><i class="badge__dot"></i>${m.status}</span>
        </div>
        <div class="meal-card__countdown">${m.countdownLabel}</div>
      </div>`).join('');
  }

  function renderDayMenu(dateKey) {
    selectedKey = dateKey;
    const menu = SeedData.menuForDate(dateKey);
    const holiday = HolidayData.byDate(dateKey);
    const isToday = dateKey === DateUtils.todayKey();
    document.getElementById('menuDateLabel').textContent =
      (isToday ? 'Today · ' : '') + DateUtils.formatLong(DateUtils.fromKey(dateKey));
    document.getElementById('menuHolidayNote').innerHTML = holiday
      ? `<span class="badge badge--upcoming"><i class="badge__dot"></i>${holiday.name}</span>`
      : '';
    const wrap = document.getElementById('dayMenu');
    wrap.innerHTML = ['breakfast', 'lunch', 'dinner'].map(meal => {
      const items = menu[meal] || [];
      return `<div class="day-menu__meal">
                <h4>${meal}</h4>
                ${items.length ? `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>` : '<p style="font-size:0.85rem;color:var(--steel-600);">No service</p>'}
              </div>`;
    }).join('');
  }

  function renderCalendar() {
    const d = DateUtils.fromKey(selectedKey);
    Calendar.render(document.getElementById('calendar'), {
      year: d.getFullYear(), month: d.getMonth(), selectedKey,
      onSelect: (key) => { renderDayMenu(key); renderCalendar(); }
    });
  }

  renderMealTimings();
  renderDayMenu(selectedKey);
  renderCalendar();

  setInterval(renderMealTimings, 30000);
});
