// File: backend/routes/student.routes.js
const express = require('express');
const Menu = require('../models/Menu');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/profile', (req, res) => res.json({ user: req.user }));
router.get('/menus', async (req, res, next) => {
  try {
    const menus = await Menu.listMenus({ futureOnly: true });
    res.json({ menus });
  } catch (error) { next(error); }
});

module.exports = router;
