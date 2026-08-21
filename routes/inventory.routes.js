// File: backend/routes/inventory.routes.js
const express = require('express');
const { listInventory, getInventoryItem, createInventory, updateInventory, deleteInventory } = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', listInventory);
router.get('/:id', getInventoryItem);
router.post('/', authorize('admin'), createInventory);
router.patch('/:id', authorize('admin'), updateInventory);
router.delete('/:id', authorize('admin'), deleteInventory);

module.exports = router;
