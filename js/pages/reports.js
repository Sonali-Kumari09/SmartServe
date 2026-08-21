document.addEventListener('DOMContentLoaded', () => {
  SeedData.seedDatabase();
  const session = Auth.requireRole('admin');
  if (!session) return;
  document.getElementById('adminName').textContent = session.name;
  document.getElementById('logoutBtn').addEventListener('click', () => { Auth.logout(); window.location.href = '../login.html'; });

  const reports = DB.get('reports', { totalFoodSavedKg: 0, totalCostSavedRs: 0, totalCarbonSavedKg: 0, donationLog: [] });
  const history = DB.get('history', []);

  document.getElementById('reportStats').innerHTML = `
    <div class="card report-stat">
      <span class="card__eyebrow">Food diverted</span>
      <div class="stat__value">${reports.totalFoodSavedKg} kg</div>
      <div class="stat__label">from landfill, via donation</div>
    </div>
    <div class="card report-stat report-stat--veg">
      <span class="card__eyebrow">Cost saved</span>
      <div class="stat__value">₹${reports.totalCostSavedRs.toLocaleString('en-IN')}</div>
      <div class="stat__label">at ₹${SeedData.CONFIG.COST_PER_KG}/kg avg cooked cost</div>
    </div>
    <div class="card report-stat report-stat--steel">
      <span class="card__eyebrow">Carbon avoided</span>
      <div class="stat__value">${reports.totalCarbonSavedKg} kg CO<sub>2</sub>e</div>
      <div class="stat__label">at ${SeedData.CONFIG.CARBON_KG_CO2E_PER_KG} kg CO₂e/kg food</div>
    </div>
  `;

  // -- 7-day waste trend from history (kg wasted per day, summed across meals) --
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(DateUtils.toKey(DateUtils.addDays(new Date(), -i)));
  const wasteByDay = days.map(d => Math.round(history.filter(h => h.date === d).reduce((s, h) => s + h.wasteKg, 0)));
  const maxWaste = Math.max(1, ...wasteByDay);

  document.getElementById('wasteChart').innerHTML = `
    <div class="bar-chart">
      ${days.map((d, i) => `
        <div class="bar-chart__col">
          <div class="bar-chart__bar" style="height:${Math.round((wasteByDay[i] / maxWaste) * 100)}%;" title="${wasteByDay[i]} kg"></div>
          <span class="bar-chart__label">${DateUtils.WEEKDAYS[DateUtils.fromKey(d).getDay()]}</span>
        </div>`).join('')}
    </div>
  `;

  // -- donation log --
  const logEl = document.getElementById('donationLog');
  const log = reports.donationLog.slice().reverse();
  logEl.innerHTML = log.length
    ? log.map(l => `<tr><td>${DateUtils.formatLong(DateUtils.fromKey(l.date))}</td><td>${l.name}</td><td class="qty-cell">${l.qtyKg} kg</td><td>${l.shelters.join(', ')}</td></tr>`).join('')
    : `<tr><td colspan="4" class="empty-state">No donations confirmed yet.</td></tr>`;
});
