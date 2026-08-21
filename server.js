// File: backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { checkConnection } = require('./config/database');

const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const forecastRoutes = require('./routes/forecast.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const surplusRoutes = require('./routes/surplus.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '*').split(',').map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins.includes('*') ? true : allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res) => {
  try {
    await checkConnection();
    res.json({ status: 'ok', database: 'postgresql', service: 'smart-meal-api', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'degraded', database: 'unavailable', service: 'smart-meal-api', message: 'PostgreSQL is unavailable.' });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/surplus', surplusRoutes);
app.use('/api/reports', reportsRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === 11000) return res.status(409).json({ message: 'A record with those unique values already exists.' });
  if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
  console.error(error);
  res.status(500).json({ message: 'Internal server error.' });
});

async function start() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be configured.');
  await checkConnection();
  app.listen(port, () => console.log(`Smart Meal API listening on port ${port}`));
}

if (require.main === module) start().catch((error) => { console.error(`Startup failed: ${error.message}`); process.exit(1); });

module.exports = app;
