document.addEventListener('DOMContentLoaded', () => {
  SeedData.seedDatabase();
  const session = Auth.requireRole('admin');
  if (!session) return;
  document.getElementById('adminName').textContent = session.name;
  document.getElementById('logoutBtn').addEventListener('click', () => { Auth.logout(); window.location.href = '../login.html'; });

  const listEl = document.getElementById('surplusList');
  const shelters = DB.get('shelters', []);

  function render() {
    const items = DB.get('surplus', []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!items.length) { listEl.innerHTML = '<p class="empty-state">No surplus items logged yet — send items over from Inventory.</p>'; return; }

    listEl.innerHTML = items.map(item => {
      const safety = Safety.computeSafety(item);
      const isSafe = safety.status !== 'expired';
      const isDonated = item.status === 'donated';

      return `
      <div class="card" data-id="${item.id}" style="margin-bottom:14px;">
        <div class="forecast-card__head">
          <div>
            <span class="card__eyebrow">${item.foodType === 'veg' ? 'Vegetarian' : 'Non-veg / Other'} · ${item.qtyKg} kg</span>
            <div class="card__title" style="margin-bottom:4px;">${item.name}</div>
          </div>
          <div style="text-align:right;">
            <span class="badge badge--${safety.status}"><i class="badge__dot"></i>${safety.status}</span>
            <div class="safety-remaining" style="margin-top:4px;">${isSafe ? safety.remainingLabel + ' left' : 'unsafe — cannot redistribute'}</div>
          </div>
        </div>

        ${isDonated ? `
          <p style="margin-top:10px;"><span class="badge badge--donated"><i class="badge__dot"></i>Donated</span>
          ${item.donatedTo ? ' to ' + item.donatedTo.map(a => a.name).join(', ') : ''}</p>
        ` : `
          <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:0.88rem;">
            <input type="checkbox" data-action="verify" ${item.verified ? 'checked' : ''} ${!isSafe ? 'disabled' : ''} />
            Verified safe &amp; fit for donation by staff
          </label>
          <div class="surplus-row__actions" style="margin-top:10px;">
            <button class="btn btn--outline btn--sm" data-action="match" ${(!item.verified || !isSafe) ? 'disabled' : ''}>Find shelters</button>
            <button class="btn btn--primary btn--sm" data-action="confirm" ${(!item.verified || !isSafe) ? 'disabled' : ''}>Confirm donation</button>
          </div>
          <div class="allocation-preview"></div>
        `}
      </div>`;
    }).join('');
  }

  listEl.addEventListener('change', (e) => {
    if (e.target.dataset.action !== 'verify') return;
    const id = e.target.closest('[data-id]').dataset.id;
    DB.updateWhere('surplus', s => s.id === id, s => ({ ...s, verified: e.target.checked }));
    render();
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const cardEl = btn.closest('[data-id]');
    const id = cardEl.dataset.id;
    const items = DB.get('surplus', []);
    const item = items.find(s => s.id === id);
    if (!item) return;
    const safety = Safety.computeSafety(item);

    if (btn.dataset.action === 'match') {
      const result = Matching.matchShelters({ qtyKg: item.qtyKg, foodType: item.foodType, isSafe: safety.status !== 'expired' }, shelters);
      const preview = cardEl.querySelector('.allocation-preview');
      if (result.blocked) { preview.innerHTML = `<p class="empty-state">${result.reason}</p>`; return; }
      preview.innerHTML = `
        <ul class="allocation-list">
          ${result.allocations.map(a => `<li><span>${a.name} (${a.distanceKm} km)</span><span>${a.qtyKg} kg</span></li>`).join('')}
        </ul>
        ${result.unallocatedKg > 0 ? `<p style="font-size:0.8rem;color:var(--chilli);margin-top:6px;">${result.unallocatedKg} kg unmatched — no eligible shelter capacity left nearby.</p>` : ''}
      `;
    }

    if (btn.dataset.action === 'confirm') {
      if (safety.status === 'expired') { Notify.toast('This item is no longer safe to redistribute.', 'error'); return; }
      const result = Matching.matchShelters({ qtyKg: item.qtyKg, foodType: item.foodType, isSafe: true }, shelters);
      if (!result.allocations.length) { Notify.toast('No eligible shelter found. Try "Find shelters" first.', 'error'); return; }

      DB.updateWhere('surplus', s => s.id === id, s => ({
        ...s, status: 'donated', donatedTo: result.allocations, donatedAt: new Date().toISOString()
      }));

      // quantify savings and add to the running report totals
      const donatedKg = result.allocations.reduce((sum, a) => sum + a.qtyKg, 0);
      const costSaved = donatedKg * SeedData.CONFIG.COST_PER_KG;
      const carbonSaved = donatedKg * SeedData.CONFIG.CARBON_KG_CO2E_PER_KG;
      const reports = DB.get('reports', { totalFoodSavedKg: 0, totalCostSavedRs: 0, totalCarbonSavedKg: 0, donationLog: [] });
      reports.totalFoodSavedKg = Math.round((reports.totalFoodSavedKg + donatedKg) * 10) / 10;
      reports.totalCostSavedRs = Math.round(reports.totalCostSavedRs + costSaved);
      reports.totalCarbonSavedKg = Math.round((reports.totalCarbonSavedKg + carbonSaved) * 10) / 10;
      reports.donationLog.push({ date: DateUtils.todayKey(), name: item.name, qtyKg: donatedKg, shelters: result.allocations.map(a => a.name) });
      DB.set('reports', reports);

      Notify.toast(`Donated ${donatedKg} kg — food, cost and carbon savings recorded.`, 'success');
      render();
    }
  });

  render();
  setInterval(render, 30000);
});
