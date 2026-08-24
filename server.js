// File: backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { checkConnection } = require('./config/database');
const Menu = require('./models/Menu');

const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const forecastRoutes = require('./routes/forecast.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const surplusRoutes = require('./routes/surplus.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '*').split(',').map((origin) => origin.trim());

// Local dev: allow common preview ports even if FRONTEND_ORIGIN is set narrowly
const localDevOrigins = [
  'http://localhost:5000', 'http://127.0.0.1:5000',
  'http://localhost:5500', 'http://127.0.0.1:5500',
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:5173', 'http://127.0.0.1:5173'
];
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || localDevOrigins.includes(origin)) {
      return cb(null, true);
    }
    return cb(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Hide backend source, secrets, and package metadata from the website
const BLOCKED_PREFIXES = [
  '/server.js',
  '/package.json',
  '/package-lock.json',
  '/.env',
  '/.env.example',
  '/.gitignore',
  '/config',
  '/controllers',
  '/middleware',
  '/models',
  '/routes',
  '/database',
  '/node_modules',
  '/test',
  '/readme.md'
];
app.use((req, res, next) => {
  const p = (req.path || '').toLowerCase();
  if (BLOCKED_PREFIXES.some((b) => p === b || p.startsWith(b + '/'))) {
    return res.status(404).json({ message: 'Not found.' });
  }
  // Block SQL / env / log files anywhere
  if (/\.(sql|env|log)$/i.test(p)) {
    return res.status(404).json({ message: 'Not found.' });
  }
  next();
});

// Serve public frontend only (HTML pages, css/, js/, assets/, admin/, student/)
app.use(express.static(__dirname, {
  index: ['index.html'],
  dotfiles: 'deny',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.get('/api/health', async (req, res) => {
  try {
    await checkConnection();
    res.json({ status: 'ok', database: 'postgresql', service: 'smartserve-api', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'degraded', database: 'unavailable', service: 'smartserve-api', message: 'PostgreSQL is unavailable.' });
  }
});
app.get('/api/public/menus', async (req, res, next) => {
  try {
    const from = new Date();
    from.setDate(from.getDate() - 1);
    const to = new Date();
    to.setDate(to.getDate() + 14);
    res.json({
      menus: await Menu.listMenus({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        mealType: req.query.mealType
      })
    });
  } catch (error) {
    next(error);
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
  const databaseMessages = {
    '28P01': 'Database authentication failed. Check PGPASSWORD in the server .env file.',
    '3D000': 'The configured PostgreSQL database does not exist. Check PGDATABASE in the server .env file.',
    '22P02': 'One or more identifiers or values have an invalid format.',
    '22007': 'A date or time value is invalid.',
    '23502': 'A required field is missing.',
    '23503': 'This record is linked to data that does not exist.',
    '23505': 'A record with those unique values already exists.',
    '23514': 'One or more values are outside the allowed range.'
  };
  if (databaseMessages[error.code]) {
    const status = ['28P01', '3D000'].includes(error.code)
      ? 503
      : error.code === '23505' ? 409 : 400;
    return res.status(status).json({ message: databaseMessages[error.code] });
  }
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body must contain valid JSON.' });
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') return res.status(503).json({ message: 'Database is temporarily unavailable. Please try again.' });
  console.error('Unhandled request error:', error);
  res.status(500).json({ message: 'The server could not complete that request. Please try again.' });
});

async function start() {
  if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not set. Set it in .env before using auth.');
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
  }
  try {
    await checkConnection();
    console.log('PostgreSQL connection OK');
  } catch (error) {
    console.warn(`PostgreSQL unavailable (${error.message}). API routes that need the DB will fail until it is running.`);
  }
  app.listen(port, () => {
    console.log(`SmartServe listening on http://localhost:${port}`);
    console.log('Open that URL in your browser (do not use Live Server / file:// for login).');
  });
}

if (require.main === module) start().catch((error) => { console.error(`Startup failed: ${error.message}`); process.exit(1); });

module.exports = app;
