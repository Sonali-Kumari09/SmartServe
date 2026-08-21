/* calendar.js — renders a month grid into a container, highlighting today and holidays */
const Calendar = (() => {

  /**
   * @param {HTMLElement} container
   * @param {Object} opts
   * @param {number} opts.year
   * @param {number} opts.month - 0-indexed
   * @param {string} opts.selectedKey - 'YYYY-MM-DD'
   * @param {(dateKey:string)=>void} opts.onSelect
   */
  function render(container, opts) {
    const { year, month, selectedKey, onSelect } = opts;
    const matrix = DateUtils.getMonthMatrix(year, month);
    const todayKey = DateUtils.todayKey();

    const head = `
      <div class="cal-head">
        <button class="cal-nav" data-nav="-1" aria-label="Previous month">‹</button>
        <span class="cal-title">${DateUtils.MONTHS[month]} ${year}</span>
        <button class="cal-nav" data-nav="1" aria-label="Next month">›</button>
      </div>
      <div class="cal-weekdays">${DateUtils.WEEKDAYS.map(w => `<span>${w}</span>`).join('')}</div>
    `;

    const cells = matrix.map(week => week.map(date => {
      const key = DateUtils.toKey(date);
      const inMonth = date.getMonth() === month;
      const holiday = HolidayData.byDate(key);
      const classes = ['cal-cell'];
      if (!inMonth) classes.push('cal-cell--muted');
      if (key === todayKey) classes.push('cal-cell--today');
      if (key === selectedKey) classes.push('cal-cell--selected');
      if (holiday) classes.push('cal-cell--holiday');
      return `<button class="${classes.join(' ')}" data-date="${key}" title="${holiday ? holiday.name : ''}">
                <span>${date.getDate()}</span>${holiday ? '<i class="cal-dot"></i>' : ''}
              </button>`;
    }).join('')).join('');

    container.innerHTML = `${head}<div class="cal-grid">${cells}</div>`;

    container.querySelectorAll('.cal-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = Number(btn.dataset.nav);
        const newDate = new Date(year, month + delta, 1);
        render(container, { ...opts, year: newDate.getFullYear(), month: newDate.getMonth() });
      });
    });

    container.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => onSelect && onSelect(cell.dataset.date));
    });
  }

  return { render };
})();
