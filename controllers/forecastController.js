// File: controllers/forecastController.js
const Menu = require('../models/Menu');
const { query } = require('../config/database');

async function listMenus(req, res, next) {
  try {
    res.json({ menus: await Menu.listMenus({ from: req.query.from, to: req.query.to, mealType: req.query.mealType }) });
  } catch (error) {
    next(error);
  }
}

async function createMenu(req, res, next) {
  try {
    const body = req.body || {};
    const menu = await Menu.createMenu({
      date: body.date,
      mealType: body.mealType || body.meal_type,
      items: body.items || [],
      baselineAttendance: body.baselineAttendance ?? body.baseline_attendance ?? 500,
      createdBy: req.user.id
    });
    res.status(201).json({ menu });
  } catch (error) {
    next(error);
  }
}

async function updateMenu(req, res, next) {
  try {
    const menu = await Menu.updateMenu(req.params.id, req.body);
    if (!menu) return res.status(404).json({ message: 'Menu not found.' });
    res.json({ menu });
  } catch (error) {
    next(error);
  }
}

async function deleteMenu(req, res, next) {
  try {
    if (!(await Menu.deleteMenu(req.params.id))) return res.status(404).json({ message: 'Menu not found.' });
    res.json({ message: 'Menu deleted.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Forecasts meal demand using historical baseline attendance, live RSVP counts,
 * and simple confidence scoring. Frontend weather/holiday modules further adjust
 * recommended prep quantities.
 */
async function getForecast(req, res, next) {
  try {
    const mealType = req.query.mealType || null;
    const dateKey = (req.query.date || new Date().toISOString().slice(0, 10)).slice(0, 10);

    const history = await Menu.listMenus({ mealType: mealType || undefined });
    const recent = history.slice(-30);
    const historicalAvg = recent.length
      ? recent.reduce((sum, menu) => sum + Number(menu.baselineAttendance || 0), 0) / recent.length
      : 500;

    // Live attendance signals for the target date
    let rsvpYes = 0;
    let rsvpTotal = 0;
    try {
      const params = mealType ? [dateKey, mealType] : [dateKey];
      const sql = mealType
        ? `SELECT COUNT(*) FILTER (WHERE will_attend) AS yes_count, COUNT(*) AS total
           FROM meal_attendance WHERE menu_date = $1 AND meal_type = $2`
        : `SELECT COUNT(*) FILTER (WHERE will_attend) AS yes_count, COUNT(*) AS total
           FROM meal_attendance WHERE menu_date = $1`;
      const att = await query(sql, params);
      rsvpYes = Number(att.rows[0]?.yes_count || 0);
      rsvpTotal = Number(att.rows[0]?.total || 0);
    } catch (_) {
      // tables may not exist yet on first boot
    }

    // Blend historical baseline with live student portal attendance (RSVP).
    // Even a few RSVPs pull the forecast; with more responses, RSVP dominates.
    let forecast = historicalAvg;
    let factors = ['historical_baseline'];
    if (rsvpTotal >= 1) {
      const rsvpRate = rsvpYes / rsvpTotal;
      // Weight RSVP more as sample grows (cap at 0.75)
      const rsvpWeight = Math.min(0.75, 0.25 + rsvpTotal * 0.05);
      // Project campus-wide from RSVP rate against historical scale
      const rsvpProjected = historicalAvg * (0.4 + 1.2 * rsvpRate);
      forecast = historicalAvg * (1 - rsvpWeight) + rsvpProjected * rsvpWeight;
      factors.push('student_rsvp');
    }

    forecast = Math.max(0, Math.round(forecast));
    const confidence = Math.min(
      0.95,
      (recent.length >= 14 ? 0.7 : 0.45) +
        (rsvpTotal >= 10 ? 0.2 : rsvpTotal >= 5 ? 0.12 : rsvpTotal >= 1 ? 0.05 : 0)
    );

    // Rough prep quantity (kg) — ~0.35 kg/person lunch default
    const perHead = mealType === 'breakfast' ? 0.25 : mealType === 'dinner' ? 0.4 : 0.35;
    const recommendedQtyKg = Math.round(forecast * perHead * 1.08 * 10) / 10;

    res.json({
      date: dateKey,
      mealType: mealType || 'all',
      forecast,
      recommendedQtyKg,
      confidence: Math.round(confidence * 100) / 100,
      basedOnMenus: recent.length,
      rsvpYes,
      rsvpTotal,
      factorsApplied: factors
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { listMenus, createMenu, updateMenu, deleteMenu, getForecast };
