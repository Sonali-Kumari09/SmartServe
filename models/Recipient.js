// File: backend/models/Recipient.js
const { query } = require('../config/database');
const { mapRecipient } = require('./helpers');

async function listActive() { return (await query('SELECT * FROM recipients WHERE is_active = TRUE ORDER BY name')).rows.map(mapRecipient); }
async function findById(id) { return mapRecipient((await query('SELECT * FROM recipients WHERE id = $1', [id])).rows[0]); }
async function createRecipient(data) {
  const result = await query('INSERT INTO recipients (name, contact_person, phone, email, address, city, capacity_kg) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [data.name, data.contactPerson || null, data.phone || null, data.email || null, data.address || null, data.city || null, data.capacityKg || 0]);
  return mapRecipient(result.rows[0]);
}
module.exports = { listActive, findById, createRecipient };
