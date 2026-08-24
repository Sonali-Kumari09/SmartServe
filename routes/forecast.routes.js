// File: backend/routes/forecast.routes.js
const express = require('express');
const { listMenus, createMenu, updateMenu, deleteMenu, getForecast } = require('../controllers/forecastController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.get('/menus', listMenus);
router.get('/', getForecast);
router.post('/menus', authorize('admin'), createMenu);
router.patch('/menus/:id', authorize('admin'), updateMenu);
router.delete('/menus/:id', authorize('admin'), deleteMenu);

module.exports = router;
