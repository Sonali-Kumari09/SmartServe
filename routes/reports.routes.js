// File: backend/routes/reports.routes.js
const express = require('express');
const { summary } = require('../controllers/reportsController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();
router.get('/summary', protect, authorize('admin', 'ngo'), summary);

module.exports = router;
