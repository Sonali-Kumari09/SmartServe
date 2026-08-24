// File: routes/student.routes.js
const express = require('express');
const Menu = require('../models/Menu');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { query } = require('../config/database');

const router = express.Router();
router.use(protect);
router.use(authorize('student'));

router.get('/profile', (req, res) => res.json({ user: req.user }));

router.get('/menus', async (req, res, next) => {
  try {
    // Include a few past days so calendar navigation still shows recent menus,
    // plus upcoming slots. Dummy seed data covers ~2 weeks from today.
    const from = new Date();
    from.setDate(from.getDate() - 3);
    const to = new Date();
    to.setDate(to.getDate() + 21);
    const menus = await Menu.listMenus({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10)
    });
    res.json({ menus });
  } catch (error) {
    next(error);
  }
});

// --- Attendance ---
router.get('/attendance', async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const result = await query(
      `SELECT menu_date, meal_type, will_attend, updated_at
       FROM meal_attendance
       WHERE user_id = $1 AND menu_date = $2`,
      [req.user.id, date]
    );
    res.json({
      date,
      attendance: result.rows.map((r) => ({
        menuDate: r.menu_date,
        mealType: r.meal_type,
        willAttend: r.will_attend,
        updatedAt: r.updated_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.post('/attendance', async (req, res, next) => {
  try {
    const { date, mealType, willAttend } = req.body;
    if (!date || !mealType) {
      return res.status(400).json({ message: 'date and mealType are required.' });
    }
    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return res.status(400).json({ message: 'mealType must be breakfast, lunch, or dinner.' });
    }
    const attend = willAttend !== false && willAttend !== 'false' && willAttend !== 0;
    const result = await query(
      `INSERT INTO meal_attendance (user_id, menu_date, meal_type, will_attend, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, menu_date, meal_type)
       DO UPDATE SET will_attend = EXCLUDED.will_attend, updated_at = NOW()
       RETURNING menu_date, meal_type, will_attend, updated_at`,
      [req.user.id, date, mealType, attend]
    );
    const row = result.rows[0];
    res.json({
      attendance: {
        menuDate: row.menu_date,
        mealType: row.meal_type,
        willAttend: row.will_attend,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// --- Feedback ---
router.get('/feedback', async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const result = await query(
      `SELECT menu_date, meal_type, rating, comment, created_at
       FROM meal_feedback
       WHERE user_id = $1 AND menu_date = $2`,
      [req.user.id, date]
    );
    res.json({
      date,
      feedback: result.rows.map((r) => ({
        menuDate: r.menu_date,
        mealType: r.meal_type,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.post('/feedback', async (req, res, next) => {
  try {
    const { date, mealType, rating, comment } = req.body;
    if (!date || !mealType || rating == null) {
      return res.status(400).json({ message: 'date, mealType, and rating are required.' });
    }
    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return res.status(400).json({ message: 'mealType must be breakfast, lunch, or dinner.' });
    }
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: 'rating must be an integer from 1 to 5.' });
    }
    const result = await query(
      `INSERT INTO meal_feedback (user_id, menu_date, meal_type, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, menu_date, meal_type)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING menu_date, meal_type, rating, comment, created_at`,
      [req.user.id, date, mealType, r, comment ? String(comment).slice(0, 1000) : null]
    );
    const row = result.rows[0];
    res.status(201).json({
      feedback: {
        menuDate: row.menu_date,
        mealType: row.meal_type,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
