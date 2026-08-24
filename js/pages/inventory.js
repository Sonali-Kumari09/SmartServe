document.addEventListener('DOMContentLoaded', async () => {
  const session = Auth.requireRole('admin');
  if (!session) return;
  document.getElementById('adminName').textContent = session.name;
  document.getElementById('logoutBtn').addEventListener('click', () => { Auth.logout(); window.location.href = '../login.html'; });
  const form = document.getElementById('inventoryForm');
  const tbody = document.getElementById('inventoryBody');
  let items = [];
  function render() {
    if (!items.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No stored items logged yet.</td></tr>'; return; }
    tbody.innerHTML = items.map(item => { const tempC = ((Number(item.currentTempF) - 32) * 5 / 9).toFixed(1); const danger = Math.round(Number(item.timeInDangerZoneMinutes || 0)); return `<tr data-id="${item._id}"><td>${item.foodItem}</td><td class="qty-cell">${item.quantityKg} kg</td><td>${item.location || '—'}</td><td class="qty-cell">${tempC}°C <span style="color:var(--steel-600);font-size:0.75rem;">(${item.currentTempF}°F)</span></td><td><span class="badge badge--${item.status}"><i class="badge__dot"></i>${item.status}</span></td><td class="safety-remaining">${danger ? `${danger} min in danger zone` : 'within safe range'}</td><td class="surplus-row__actions"><button class="btn btn--outline btn--sm" data-action="surplus" ${item.status === 'Spoiled/Unsafe' || item.status === 'Redistributed' ? 'disabled' : ''}>Send to surplus</button><button class="btn btn--danger btn--sm" data-action="remove">Remove</button></td></tr>`; }).join('');
  }
  async function load() { try { items = (await API.inventory()).inventory; render(); } catch (error) { Notify.toast(error.message, 'error'); } }
  form.addEventListener('submit', async (event) => { event.preventDefault(); const fd = new FormData(form); const tempC = Number(fd.get('tempC')); if (!fd.get('name').trim() || Number(fd.get('qtyKg')) <= 0 || Number.isNaN(tempC)) { Notify.toast('Enter valid item, quantity, and temperature.', 'error'); return; } try { await API.createInventory({ foodItem: fd.get('name').trim(), quantityKg: Number(fd.get('qtyKg')), currentTempF: tempC * 9 / 5 + 32, location: fd.get('location').trim() }); form.reset(); await load(); Notify.toast('Inventory item logged.', 'success'); } catch (error) { Notify.toast(error.message, 'error'); } });
  tbody.addEventListener('click', async (event) => { const button = event.target.closest('button[data-action]'); if (!button) return; const item = items.find(entry => entry._id === button.closest('tr').dataset.id); if (!item) return; try { if (button.dataset.action === 'remove') await API.deleteInventory(item._id); else { const quantityKg = Number(prompt(`How many kg of "${item.foodItem}" is surplus?`, item.quantityKg)); if (!quantityKg || quantityKg <= 0 || quantityKg > item.quantityKg) throw new Error('Enter a valid quantity within the available amount.'); await API.createSurplus({ inventoryRef: item._id, quantityKg }); } await load(); Notify.toast(button.dataset.action === 'remove' ? 'Inventory item removed.' : 'Sent to surplus.', 'success'); } catch (error) { Notify.toast(error.message, 'error'); } });
  await load();
});
