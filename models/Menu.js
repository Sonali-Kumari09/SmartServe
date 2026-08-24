// File: backend/models/Menu.js
const { query } = require('../config/database');
const { mapMenu } = require('./helpers');

async function listMenus({ from, to, mealType, futureOnly = false } = {}) {
  const values = [];
  const filters = [];
  if (from) { values.push(from); filters.push(`date >= $${values.length}`); }
  if (to) { values.push(to); filters.push(`date <= $${values.length}`); }
  if (futureOnly) filters.push('date >= CURRENT_DATE');
  if (mealType) { values.push(mealType); filters.push(`meal_type = $${values.length}`); }
  const result = await query(`SELECT * FROM menus ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''} ORDER BY date ASC, meal_type ASC`, values);
  return result.rows.map(mapMenu);
}

async function createMenu({ date, mealType, items = [], baselineAttendance = 500, createdBy }) {
  const result = await query('INSERT INTO menus (date, meal_type, items, baseline_attendance, created_by) VALUES ($1, $2, $3::jsonb, $4, $5) RETURNING *', [date, mealType, JSON.stringify(items), baselineAttendance, createdBy]);
  return mapMenu(result.rows[0]);
}

async function updateMenu(id, values) {
  const result = await query('UPDATE menus SET date = COALESCE($1, date), meal_type = COALESCE($2, meal_type), items = COALESCE($3::jsonb, items), baseline_attendance = COALESCE($4, baseline_attendance), updated_at = NOW() WHERE id = $5 RETURNING *', [values.date || null, values.mealType || null, values.items ? JSON.stringify(values.items) : null, values.baselineAttendance ?? null, id]);
  return mapMenu(result.rows[0]);
}

async function deleteMenu(id) { return (await query('DELETE FROM menus WHERE id = $1 RETURNING id', [id])).rows[0]; }

module.exports = { listMenus, createMenu, updateMenu, deleteMenu };
