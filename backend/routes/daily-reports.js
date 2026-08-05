const express = require('express');
const { body, query, param } = require('express-validator');
const { startOfDay, endOfDay } = require('date-fns');
const DailyReport = require('../models/DailyReport');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

function normalizeDate(dateInput) {
  if (!dateInput) return startOfDay(new Date());
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    const [y, m, d] = dateInput.slice(0, 10).split('-').map(Number);
    return startOfDay(new Date(y, m - 1, d));
  }
  return startOfDay(new Date(dateInput));
}

function parseCash(cash = {}) {
  return {
    notes5000: Math.max(0, parseInt(cash.notes5000, 10) || 0),
    notes2000: Math.max(0, parseInt(cash.notes2000, 10) || 0),
    notes1000: Math.max(0, parseInt(cash.notes1000, 10) || 0),
    notes500: Math.max(0, parseInt(cash.notes500, 10) || 0),
    coins: Math.max(0, parseFloat(cash.coins) || 0),
  };
}

function parseMomoAmounts(momoAmounts) {
  if (!Array.isArray(momoAmounts)) return [];
  return momoAmounts
    .map((n) => parseFloat(n))
    .filter((n) => !Number.isNaN(n) && n >= 0);
}

function parseExpenses(expenses) {
  if (!Array.isArray(expenses)) return [];
  return expenses
    .filter((e) => e && String(e.reason || '').trim() && !Number.isNaN(parseFloat(e.amount)))
    .map((e) => ({
      reason: String(e.reason).trim(),
      amount: Math.max(0, parseFloat(e.amount) || 0),
    }));
}

// GET /api/daily-reports?from=&to=&page=&limit=
router.get('/', [
  query('from').optional().isISO8601().withMessage('Invalid start date'),
  query('to').optional().isISO8601().withMessage('Invalid end date'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
], async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { from, to, page = 1, limit = 30 } = req.query;
    const filter = { userId };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(new Date(from));
      if (to) filter.date.$lte = endOfDay(new Date(to));
    }

    const [reports, total] = await Promise.all([
      DailyReport.find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      DailyReport.countDocuments(filter),
    ]);

    res.json({
      reports: reports.map((r) => r.toReportJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/daily-reports/by-date?date=YYYY-MM-DD
router.get('/by-date', [
  query('date').optional().isISO8601().withMessage('Invalid date'),
  validate,
], async (req, res, next) => {
  try {
    const date = normalizeDate(req.query.date);
    const report = await DailyReport.findOne({
      userId: req.user._id,
      date: { $gte: date, $lte: endOfDay(date) },
    });

    if (!report) {
      return res.json({ report: null });
    }
    res.json({ report: report.toReportJSON() });
  } catch (err) {
    next(err);
  }
});

// GET /api/daily-reports/:id
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid report id'),
  validate,
], async (req, res, next) => {
  try {
    const report = await DailyReport.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!report) {
      return res.status(404).json({ message: 'Daily report not found' });
    }
    res.json({ report: report.toReportJSON() });
  } catch (err) {
    next(err);
  }
});

const reportBodyValidators = [
  body('date').optional().isISO8601().withMessage('Invalid date'),
  body('openingAmount').isFloat({ min: 0 }).withMessage('Opening amount must be a non-negative number'),
  body('cash').optional().isObject().withMessage('Cash must be an object'),
  body('cash.notes5000').optional().isInt({ min: 0 }),
  body('cash.notes2000').optional().isInt({ min: 0 }),
  body('cash.notes1000').optional().isInt({ min: 0 }),
  body('cash.notes500').optional().isInt({ min: 0 }),
  body('cash.coins').optional().isFloat({ min: 0 }),
  body('momoAmounts').optional().isArray().withMessage('MoMo amounts must be an array'),
  body('expenses').optional().isArray().withMessage('Expenses must be an array'),
  body('notes').optional().isString().isLength({ max: 1000 }),
];

// POST /api/daily-reports — create or upsert for the day
router.post('/', [
  ...reportBodyValidators,
  validate,
], async (req, res, next) => {
  try {
    const userId = req.user._id;
    const date = normalizeDate(req.body.date);
    const payload = {
      userId,
      date,
      openingAmount: parseFloat(req.body.openingAmount) || 0,
      cash: parseCash(req.body.cash),
      momoAmounts: parseMomoAmounts(req.body.momoAmounts),
      expenses: parseExpenses(req.body.expenses),
      notes: (req.body.notes || '').trim(),
    };

    const report = await DailyReport.findOneAndUpdate(
      { userId, date },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.status(201).json({
      message: 'Daily report saved',
      report: report.toReportJSON(),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A report for this date already exists' });
    }
    next(err);
  }
});

// PUT /api/daily-reports/:id
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid report id'),
  ...reportBodyValidators,
  validate,
], async (req, res, next) => {
  try {
    const report = await DailyReport.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!report) {
      return res.status(404).json({ message: 'Daily report not found' });
    }

    if (req.body.date) report.date = normalizeDate(req.body.date);
    report.openingAmount = parseFloat(req.body.openingAmount) || 0;
    report.cash = parseCash(req.body.cash);
    report.momoAmounts = parseMomoAmounts(req.body.momoAmounts);
    report.expenses = parseExpenses(req.body.expenses);
    if (req.body.notes !== undefined) report.notes = String(req.body.notes || '').trim();

    await report.save();
    res.json({
      message: 'Daily report updated',
      report: report.toReportJSON(),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A report for this date already exists' });
    }
    next(err);
  }
});

// DELETE /api/daily-reports/:id
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid report id'),
  validate,
], async (req, res, next) => {
  try {
    const report = await DailyReport.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!report) {
      return res.status(404).json({ message: 'Daily report not found' });
    }
    res.json({ message: 'Daily report deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
