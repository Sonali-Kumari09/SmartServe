// File: backend/controllers/forecastController.js
const Menu = require('../models/Menu');
async function listMenus(req, res, next) { try { res.json({ menus: await Menu.listMenus({ from: req.query.from, to: req.query.to, mealType: req.query.mealType }) }); } catch (error) { next(error); } }
async function createMenu(req, res, next) { try { res.status(201).json({ menu: await Menu.createMenu({ ...req.body, createdBy: req.user.id }) }); } catch (error) { next(error); } }
async function updateMenu(req, res, next) { try { const menu = await Menu.updateMenu(req.params.id, req.body); if (!menu) return res.status(404).json({ message: 'Menu not found.' }); res.json({ menu }); } catch (error) { next(error); } }
async function deleteMenu(req, res, next) { try { if (!(await Menu.deleteMenu(req.params.id))) return res.status(404).json({ message: 'Menu not found.' }); res.json({ message: 'Menu deleted.' }); } catch (error) { next(error); } }
async function getForecast(req, res, next) { try { const history = await Menu.listMenus({ mealType: req.query.mealType }); const recent = history.slice(-30); const average = recent.length ? recent.reduce((sum, menu) => sum + Number(menu.baselineAttendance), 0) / recent.length : 500; res.json({ date: new Date(req.query.date || Date.now()), mealType: req.query.mealType || 'all', forecast: Math.round(average), confidence: recent.length >= 7 ? 0.85 : 0.55, basedOnMenus: recent.length }); } catch (error) { next(error); } }
module.exports = { listMenus, createMenu, updateMenu, deleteMenu, getForecast };
