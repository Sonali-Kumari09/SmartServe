// File: backend/models/helpers.js
function mapUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at };
}

function mapMenu(row) {
  if (!row) return null;
  return { id: row.id, _id: row.id, date: row.date, mealType: row.meal_type, items: row.items, baselineAttendance: row.baseline_attendance, createdBy: row.created_by, createdAt: row.created_at };
}

function mapInventory(row) {
  if (!row) return null;
  const prepared = new Date(row.time_prepared).getTime();
  const temperature = Number(row.current_temp_f);
  return { id: row.id, _id: row.id, batchId: row.batch_id, foodItem: row.food_item, quantityKg: Number(row.quantity_kg), timePrepared: row.time_prepared, currentTempF: temperature, status: row.status, location: row.location, checkedBy: row.checked_by, lastUpdated: row.last_updated, timeInDangerZoneMinutes: temperature >= 41 && temperature <= 135 ? Math.max(0, (Date.now() - prepared) / 60000) : 0 };
}

function mapRecipient(row) {
  if (!row) return null;
  return { id: row.id, _id: row.id, name: row.name, contactPerson: row.contact_person, phone: row.phone, email: row.email, address: row.address, city: row.city, capacityKg: Number(row.capacity_kg), isActive: row.is_active, createdAt: row.created_at };
}

function mapSurplus(row) {
  if (!row) return null;
  return { id: row.id, _id: row.id, inventoryRef: row.inventory_ref, foodItem: row.food_item, quantityKg: Number(row.quantity_kg), weightLbs: Number(row.weight_lbs), status: row.status, matchedTo: row.matched_to, matchedAt: row.matched_at, safeUntil: row.safe_until, createdAt: row.created_at };
}

module.exports = { mapUser, mapMenu, mapInventory, mapRecipient, mapSurplus };
