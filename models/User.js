// File: backend/models/User.js
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { mapUser } = require('./helpers');

async function findByEmail(email, includePassword = false) {
  const result = await query('SELECT id, name, email, password, role, created_at FROM users WHERE email = $1', [email.toLowerCase()]);
  if (!result.rows[0]) return null;
  return includePassword ? result.rows[0] : mapUser(result.rows[0]);
}

async function findById(id) {
  const result = await query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [id]);
  return mapUser(result.rows[0]);
}

async function createUser({ name, email, password, role }) {
  const hash = await bcrypt.hash(password, 10);
  const result = await query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at', [name, email.toLowerCase(), hash, role]);
  return mapUser(result.rows[0]);
}

async function comparePassword(candidatePassword, storedHash) { return bcrypt.compare(candidatePassword, storedHash); }

module.exports = { findByEmail, findById, createUser, comparePassword };
