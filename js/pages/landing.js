document.addEventListener('DOMContentLoaded', async () => {
  SeedData.seedDatabase();

  const todayKey = DateUtils.todayKey();
  document.getElementById('todayLabel').textContent = DateUtils.formatLong(new Date());

  // meal clock
  document.getElementById('mealClock').innerHTML = MealTimer.buildClockSVG();

  // today's menu + timing list
  let menu = SeedData.menuForDate(todayKey);
  try {
    const response = await API.publicMenus();
    const todayMenus = response.menus.filter(entry => String(entry.date).slice(0, 10) === todayKey);
    if (todayMenus.length) menu = todayMenus.reduce((result, entry) => ({ ...result, [entry.mealType]: entry.items.map(item => item.name || item) }), {});
  } catch (error) { /* The public board keeps its offline preview when the API is unavailable. */ }
  const snapshot = MealTimer.snapshot();
  const listEl = document.getElementById('todayMenuList');
  listEl.innerHTML = snapshot.map(m => {
    const items = menu[m.mealType] || [];
    return `
      <div class="meal-card ${m.status === 'open' ? 'meal-card--open' : 'meal-card--closed'}">
        <div class="meal-card__top">
          <div>
            <div class="meal-card__name">${m.label}</div>
            <div class="meal-card__window">${m.window}</div>
          </div>
          <span class="badge badge--${m.status}"><i class="badge__dot"></i>${m.status}</span>
        </div>
        <div class="meal-card__countdown">${m.countdownLabel}</div>
        ${items.length ? `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>` : '<p style="font-size:0.82rem;opacity:0.7;margin-top:6px;">No service</p>'}
      </div>`;
  }).join('');

  // mini calendar (read-only preview, click routes to student login)
  const calEl = document.getElementById('miniCalendar');
  const today = new Date();
  Calendar.render(calEl, {
    year: today.getFullYear(), month: today.getMonth(), selectedKey: todayKey,
    onSelect: () => { window.location.href = 'login.html'; }
  });

  // holiday banner
  const bannerEl = document.getElementById('holidayBanner');
  if (bannerEl) Notify.renderHolidayBanner(bannerEl);

  // keep the clock + countdowns live
  setInterval(() => {
    document.getElementById('mealClock').innerHTML = MealTimer.buildClockSVG();
  }, 30000);
});
