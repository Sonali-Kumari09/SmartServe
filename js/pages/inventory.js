document.addEventListener('DOMContentLoaded', () => {
  SeedData.seedDatabase();
  const session = Auth.requireRole('admin');
  if (!session) return;
  document.getElementById('adminName').textContent = session.name;
  document.getElementById('logoutBtn').addEventListener('click', () => { Auth.logout(); window.location.href = '../login.html'; });

  const form = document.getElementById('inventoryForm');
  const tbody = document.getElementById('inventoryBody');

  function render() {
    const items = DB.get('inventory', []);
    if (!items.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No stored items logged yet.</td></tr>`; return; }
    tbody.innerHTML = items.map(item => {
      const safety = Safety.computeSafety(item);
      return `
        <tr data-id="${item.id}">
          <td>${item.name}</td>
          <td class="qty-cell">${item.qtyKg} kg</td>
          <td>${item.location}</td>
          <td class="qty-cell">${item.tempC}°C <span style="color:var(--steel-600);font-size:0.75rem;">(${safety.band})</span></td>
          <td><span class="badge badge--${safety.status}"><i class="badge__dot"></i>${safety.status}</span></td>
          <td class="safety-remaining">${safety.remainingLabel}</td>
          <td class="surplus-row__actions">
            <button class="btn btn--outline btn--sm" data-action="surplus" ${safety.status === 'expired' ? 'disabled' : ''}>Send to surplus</button>
            <button class="btn btn--danger btn--sm" data-action="remove">Remove</button>
          </td>
        </tr>`;
    }).join('');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const entry = {
      id: DB.nextId('inv'),
      name: fd.get('name').trim(),
      qtyKg: Number(fd.get('qtyKg')),
      tempC: Number(fd.get('tempC')),
      location: fd.get('location').trim(),
      storedAt: new Date().toISOString()
    };
    if (!entry.name || entry.qtyKg <= 0) { Notify.toast('Enter a valid item and quantity.', 'error'); return; }
    DB.push('inventory', entry);
    form.reset();
    render();
    Notify.toast(`Logged ${entry.name} — safe-until countdown started.`, 'success');
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('tr');
    const id = row.dataset.id;
    const items = DB.get('inventory', []);
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (btn.dataset.action === 'remove') {
      DB.set('inventory', items.filter(i => i.id !== id));
      render();
      return;
    }

    if (btn.dataset.action === 'surplus') {
      const qtyStr = prompt(`How many kg of "${item.name}" is surplus? (available: ${item.qtyKg} kg)`, item.qtyKg);
      const qty = Number(qtyStr);
      if (!qty || qty <= 0 || qty > item.qtyKg) { Notify.toast('Enter a valid quantity within what is available.', 'error'); return; }
      const foodType = confirm('Click OK for Vegetarian, Cancel for Non-vegetarian/Other') ? 'veg' : 'other';

      DB.push('surplus', {
        id: DB.nextId('sur'),
        sourceInvId: item.id,
        name: item.name,
        qtyKg: qty,
        foodType,
        tempC: item.tempC,
        storedAt: item.storedAt,
        verified: false,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      const remaining = Math.round((item.qtyKg - qty) * 10) / 10;
      if (remaining > 0) {
        DB.updateWhere('inventory', i => i.id === id, i => ({ ...i, qtyKg: remaining }));
      } else {
        DB.set('inventory', DB.get('inventory', []).filter(i => i.id !== id));
      }
      render();
      Notify.toast(`${qty} kg sent to Surplus for verification.`, 'success');
    }
  });

  render();
  setInterval(render, 30000);
});
