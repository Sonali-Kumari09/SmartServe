// File: backend/models/InventoryLog.js
const { query } = require('../config/database');
const { mapInventory } = require('./helpers');

async function listInventory(status) {
  const result = await query(`SELECT * FROM inventory_logs ${status ? 'WHERE status = $1' : ''} ORDER BY last_updated DESC`, status ? [status] : []);
  return result.rows.map(mapInventory);
}
async function findById(id) { return mapInventory((await query('SELECT * FROM inventory_logs WHERE id = $1', [id])).rows[0]); }
async function createInventory(data) {
  const result = await query('INSERT INTO inventory_logs (batch_id, food_item, quantity_kg, time_prepared, current_temp_f, status, location, checked_by) VALUES (COALESCE($1, $2), $3, $4, COALESCE($5, NOW()), $6, COALESCE($7, \'Safe\'), $8, $9) RETURNING *', [data.batchId || null, `BATCH-${Date.now()}`, data.foodItem, data.quantityKg, data.timePrepared || null, data.currentTempF, data.status || null, data.location || null, data.checkedBy || null]);
  return mapInventory(result.rows[0]);
}
async function updateInventory(id, data) {
  const result = await query('UPDATE inventory_logs SET food_item = COALESCE($1, food_item), quantity_kg = COALESCE($2, quantity_kg), current_temp_f = COALESCE($3, current_temp_f), status = COALESCE($4, status), location = COALESCE($5, location), checked_by = $6, last_updated = NOW() WHERE id = $7 RETURNING *', [data.foodItem || null, data.quantityKg ?? null, data.currentTempF ?? null, data.status || null, data.location || null, data.checkedBy || null, id]);
  return mapInventory(result.rows[0]);
}
async function deleteInventory(id) { return (await query('DELETE FROM inventory_logs WHERE id = $1 RETURNING id', [id])).rows[0]; }
module.exports = { listInventory, findById, createInventory, updateInventory, deleteInventory };
