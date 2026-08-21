/* notify.js — toast messages + the shared holiday banner widget */
const Notify = (() => {
  let container = null;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.className = 'toast-stack';
    document.body.appendChild(container);
    return container;
  }

  function toast(message, type = 'info', ms = 3200) {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    ensureContainer().appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--show'));
    setTimeout(() => {
      el.classList.remove('toast--show');
      setTimeout(() => el.remove(), 250);
    }, ms);
  }

  /** Renders (or clears) the holiday banner into targetEl based on today/upcoming holidays. */
  function renderHolidayBanner(targetEl) {
    const ctx = Holiday.bannerContext();
    if (!ctx) { targetEl.innerHTML = ''; targetEl.hidden = true; return; }
    targetEl.hidden = false;
    const { holiday, kind, daysUntil } = ctx;
    const headline = kind === 'today'
      ? `Today is ${holiday.name}`
      : `${holiday.name} in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
    targetEl.innerHTML = `
      <img src="${targetEl.dataset.iconPath || 'assets/icons/holiday.svg'}" alt="" class="holiday-banner__icon" />
      <div>
        <p class="holiday-banner__title">${headline}</p>
        <p class="holiday-banner__tagline">${holiday.tagline}</p>
      </div>
    `;
  }

  return { toast, renderHolidayBanner };
})();
