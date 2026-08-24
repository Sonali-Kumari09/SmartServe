// File: backend/routes/surplus.routes.js
const express = require('express');
const { listSurplus, createSurplus, matchSurplus, updateSurplusStatus, listRecipients, createRecipient } = require('../controllers/surplusController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', listSurplus);
router.post('/', authorize('admin'), createSurplus);
router.patch('/:id/match', authorize('admin', 'ngo'), matchSurplus);
router.patch('/:id/status', authorize('admin', 'ngo'), updateSurplusStatus);
router.get('/recipients', listRecipients);
router.post('/recipients', authorize('admin', 'ngo'), createRecipient);

module.exports = router;
