document.addEventListener('DOMContentLoaded', async () => {
  const session = Auth.requireRole('student');
  if (!session) return;

  document.getElementById('studentName').textContent = session.name;
  document.getElementById('logoutBtn').addEventListener('click', () => {
    Auth.logout();
    window.location.href = '../login.html';
  });

  Notify.renderHolidayBanner(document.getElementById('holidayBanner'));

  let menus = [];
  try {
    menus = (await API.studentMenus()).menus || [];
  } catch (error) {
    Notify.toast(error.message, 'error');
  }

  // Client-side dummy fallback so the UI is never empty if DB seed was skipped
  function ensureDummyMenus() {
    const today = new Date();
    for (let i = -1; i <= 13; i++) {
      const d = DateUtils.addDays(today, i);
      const key = DateUtils.toKey(d);
      const hasAny = menus.some((m) => String(m.date).slice(0, 10) === key);
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
  ensureDummyMenus();

  let selectedKey = DateUtils.todayKey();
  let attendanceMap = {}; // mealType -> willAttend
  let feedbackMap = {}; // mealType -> { rating, comment }

  async function loadAttendanceAndFeedback(dateKey) {
    attendanceMap = {};
    feedbackMap = {};
    try {
      const att = await API.getAttendance(dateKey);
      (att.attendance || []).forEach((a) => {
        attendanceMap[a.mealType] = a.willAttend;
      });
    } catch (e) { /* optional when offline */ }
    try {
      const fb = await API.getFeedback(dateKey);
      (fb.feedback || []).forEach((f) => {
        feedbackMap[f.mealType] = { rating: f.rating, comment: f.comment || '' };
      });
    } catch (e) { /* optional */ }
  }

  function renderMealTimings() {
    document.getElementById('mealClock').innerHTML = MealTimer.buildClockSVG();
    document.getElementById('mealTimingList').innerHTML = MealTimer.snapshot()
      .map(
        (m) => `<div class="meal-card ${m.status === 'open' ? 'meal-card--open' : 'meal-card--closed'}">
          <div class="meal-card__top">
            <div>
              <div class="meal-card__name">${m.label}</div>
              <div class="meal-card__window">${m.window}</div>
            </div>
            <span class="badge badge--${m.status}"><i class="badge__dot"></i>${m.status}</span>
          </div>
          <div class="meal-card__countdown">${m.countdownLabel}</div>
        </div>`
      )
      .join('');
  }

  function renderDayMenu(dateKey) {
    selectedKey = dateKey;
    const dateMenus = menus.filter((menu) => String(menu.date).slice(0, 10) === dateKey);
    const holiday = HolidayData.byDate(dateKey);
    document.getElementById('menuDateLabel').textContent =
      (dateKey === DateUtils.todayKey() ? 'Today · ' : '') + DateUtils.formatLong(DateUtils.fromKey(dateKey));
    document.getElementById('menuHolidayNote').innerHTML = holiday
      ? `<span class="badge badge--upcoming"><i class="badge__dot"></i>${holiday.name}</span>`
      : '';

    document.getElementById('dayMenu').innerHTML = ['breakfast', 'lunch', 'dinner']
      .map((meal) => {
        const menu = dateMenus.find((entry) => entry.mealType === meal);
        const items = menu ? menu.items : [];
        const willAttend = attendanceMap[meal] !== false;
        const existing = feedbackMap[meal] || { rating: 0, comment: '' };
        return `
          <div class="day-menu__meal" data-meal="${meal}">
            <h4>${meal}</h4>
            ${
              items.length
                ? `<ul>${items.map((item) => `<li>${item.name || item}</li>`).join('')}</ul>`
                : '<p style="font-size:0.85rem;color:var(--steel-600);">No service</p>'
            }
            <div class="meal-actions">
              <div class="attend-row">
                <label class="attend-toggle">
                  <input type="checkbox" data-attend="${meal}" ${willAttend ? 'checked' : ''} ${items.length ? '' : 'disabled'} />
                  <span>I will have this meal</span>
                </label>
              </div>
              <div class="feedback-box">
                <label>Feedback for ${meal}</label>
                <div class="star-row" data-stars="${meal}">
                  ${[1, 2, 3, 4, 5]
                    .map(
                      (n) =>
                        `<button type="button" data-rating="${n}" class="${existing.rating >= n ? 'is-on' : ''}" ${items.length ? '' : 'disabled'}>★</button>`
                    )
                    .join('')}
                </div>
                <textarea data-comment="${meal}" placeholder="Optional comment…" ${items.length ? '' : 'disabled'}>${existing.comment || ''}</textarea>
                <button type="button" class="btn btn--primary btn--sm" data-submit-feedback="${meal}" ${items.length ? '' : 'disabled'}>Save feedback</button>
                <div class="feedback-status" data-fb-status="${meal}"></div>
              </div>
            </div>
          </div>`;
      })
      .join('');

    // Attendance handlers
    document.querySelectorAll('[data-attend]').forEach((input) => {
      input.addEventListener('change', async () => {
        const meal = input.getAttribute('data-attend');
        try {
          await API.setAttendance({ date: selectedKey, mealType: meal, willAttend: input.checked });
          attendanceMap[meal] = input.checked;
          Notify.toast(input.checked ? `Marked attending ${meal}` : `Marked skipping ${meal}`, 'success');
        } catch (error) {
          input.checked = !input.checked;
          Notify.toast(error.message, 'error');
        }
      });
    });

    // Star rating
    document.querySelectorAll('[data-stars]').forEach((row) => {
      const meal = row.getAttribute('data-stars');
      row.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const rating = Number(btn.getAttribute('data-rating'));
          feedbackMap[meal] = feedbackMap[meal] || { rating: 0, comment: '' };
          feedbackMap[meal].rating = rating;
          row.querySelectorAll('button').forEach((b) => {
            b.classList.toggle('is-on', Number(b.getAttribute('data-rating')) <= rating);
          });
        });
      });
    });

    // Submit feedback
    document.querySelectorAll('[data-submit-feedback]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const meal = btn.getAttribute('data-submit-feedback');
        const rating = (feedbackMap[meal] && feedbackMap[meal].rating) || 0;
        const commentEl = document.querySelector(`[data-comment="${meal}"]`);
        const comment = commentEl ? commentEl.value.trim() : '';
        const statusEl = document.querySelector(`[data-fb-status="${meal}"]`);
        if (!rating) {
          if (statusEl) statusEl.textContent = 'Pick a star rating first.';
          return;
        }
        try {
          await API.submitFeedback({ date: selectedKey, mealType: meal, rating, comment });
          feedbackMap[meal] = { rating, comment };
          if (statusEl) statusEl.textContent = 'Feedback saved.';
          Notify.toast(`Feedback saved for ${meal}`, 'success');
        } catch (error) {
          if (statusEl) statusEl.textContent = error.message;
          Notify.toast(error.message, 'error');
        }
      });
    });
  }

  function renderCalendar() {
    const date = DateUtils.fromKey(selectedKey);
    Calendar.render(document.getElementById('calendar'), {
      year: date.getFullYear(),
      month: date.getMonth(),
      selectedKey,
      onSelect: async (key) => {
        await loadAttendanceAndFeedback(key);
        renderDayMenu(key);
        renderCalendar();
      }
    });
  }

  await loadAttendanceAndFeedback(selectedKey);
  renderMealTimings();
  renderDayMenu(selectedKey);
  renderCalendar();
  setInterval(renderMealTimings, 30000);
});
