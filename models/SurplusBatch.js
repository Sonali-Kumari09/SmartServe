// File: backend/models/SurplusBatch.js
const { query } = require('../config/database');
const { mapSurplus } = require('./helpers');

const select = 'SELECT id, inventory_ref, food_item, quantity_kg, weight_lbs, status, matched_to, matched_at, safe_until, created_at FROM surplus_batches';
async function list(status) { const result = await query(`${select} ${status ? 'WHERE status = $1' : ''} ORDER BY created_at DESC`, status ? [status] : []); return result.rows.map(mapSurplus); }
async function create({ inventoryRef, foodItem, quantityKg, safeUntil }) { const result = await query(`INSERT INTO surplus_batches (inventory_ref, food_item, quantity_kg, safe_until) VALUES ($1, $2, $3, $4) RETURNING *`, [inventoryRef, foodItem, quantityKg, safeUntil]); return mapSurplus(result.rows[0]); }
async function findById(id) { return mapSurplus((await query(`${select} WHERE id = $1`, [id])).rows[0]); }
async function match(id, recipientId) { return mapSurplus((await query(`UPDATE surplus_batches SET matched_to = $1, matched_at = NOW(), status = 'Matched' WHERE id = $2 AND status = 'Pending' RETURNING *`, [recipientId, id])).rows[0]); }
async function updateStatus(id, status) { return mapSurplus((await query('UPDATE surplus_batches SET status = $1 WHERE id = $2 RETURNING *', [status, id])).rows[0]); }
module.exports = { list, create, findById, match, updateStatus };
