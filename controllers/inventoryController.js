// File: backend/controllers/inventoryController.js
const InventoryLog = require('../models/InventoryLog');
function statusForTemperature(temp) { return temp >= 41 && temp <= 135 ? 'Warning' : 'Safe'; }
async function listInventory(req, res, next) { try { res.json({ inventory: await InventoryLog.listInventory(req.query.status) }); } catch (error) { next(error); } }
async function getInventoryItem(req, res, next) { try { const item = await InventoryLog.findById(req.params.id); if (!item) return res.status(404).json({ message: 'Inventory item not found.' }); res.json({ item }); } catch (error) { next(error); } }
async function createInventory(req, res, next) { try { res.status(201).json({ item: await InventoryLog.createInventory({ ...req.body, checkedBy: req.user.id }) }); } catch (error) { next(error); } }
async function updateInventory(req, res, next) { try { const updates = { ...req.body, checkedBy: req.user.id }; if (updates.currentTempF !== undefined && updates.status === undefined) updates.status = statusForTemperature(Number(updates.currentTempF)); const item = await InventoryLog.updateInventory(req.params.id, updates); if (!item) return res.status(404).json({ message: 'Inventory item not found.' }); res.json({ item }); } catch (error) { next(error); } }
async function deleteInventory(req, res, next) { try { if (!(await InventoryLog.deleteInventory(req.params.id))) return res.status(404).json({ message: 'Inventory item not found.' }); res.json({ message: 'Inventory item deleted.' }); } catch (error) { next(error); } }
module.exports = { listInventory, getInventoryItem, createInventory, updateInventory, deleteInventory };
