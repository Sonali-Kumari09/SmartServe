// File: controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

const ALLOWED_ROLES = new Set(['student', 'admin']);

async function register(req, res, next) {
  try {
    const { email, password, role } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const requestedRole = String(role || 'student').toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (!ALLOWED_ROLES.has(requestedRole)) {
      return res.status(400).json({ message: 'Role must be student or admin.' });
    }
    if (await User.findByEmail(normalizedEmail)) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const user = await User.createUser({
      email: normalizedEmail,
      password: String(password),
      role: requestedRole
    });
    res.status(201).json({ token: createToken(user), user });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password, role } = req.body;
    const requestedRole = role ? String(role).toLowerCase() : null;

    const user = await User.findByEmail(email || '', true);
    if (!user || !(await User.comparePassword(password || '', user.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (requestedRole && ALLOWED_ROLES.has(requestedRole) && user.role !== requestedRole) {
      return res.status(403).json({
        message: requestedRole === 'admin'
          ? 'Student accounts cannot sign in through the admin portal.'
          : 'Admin accounts cannot sign in through the student portal.'
      });
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at
    };
    res.json({ token: createToken(publicUser), user: publicUser });
  } catch (error) {
    next(error);
  }
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
