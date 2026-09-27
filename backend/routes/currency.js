const express = require('express');
const { body, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const exchangeRateService = require('../services/exchangeRateService');

const router = express.Router();

// All currency routes require authentication
router.use(protect);

// GET /api/currency/supported
router.get('/supported', (req, res) => {
  res.json(exchangeRateService.SUPPORTED_CURRENCIES);
});

// GET /api/currency/settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await exchangeRateService.getCurrencySettings(req.user._id);
    res.json(settings);
  } catch (err) {
    console.error('Error fetching currency settings:', err);
    res.status(500).json({ message: 'Failed to fetch currency settings.' });
  }
});

// PUT /api/currency/settings
router.put('/settings', [
  body('isEnabled').optional().isBoolean(),
  body('baseCurrency').optional({ values: 'falsy' }).isString().isLength({ min: 3, max: 3 }),
  body('sellingCurrency').optional({ values: 'falsy' }).isString().isLength({ min: 3, max: 3 }),
  body('exchangeRateMode').optional({ values: 'falsy' }).isIn(['manual', 'automatic']),
  body('rateSource').optional({ values: 'falsy' }).isIn(['manual', 'api', 'supplier']),
  body('minProtectionMargin').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100 }),
  body('roundingRule').optional({ values: 'falsy' }).isIn(['none', '1', '5', '10', '50', '100', '500', '1000']),
  validate,
], async (req, res) => {
  try {
    const updated = await exchangeRateService.updateCurrencySettings(req.user._id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Error updating currency settings:', err);
    res.status(400).json({ message: err.message || 'Failed to update currency settings.' });
  }
});

// GET /api/currency/rate/current
router.get('/rate/current', [
  query('base').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 3 }),
  query('target').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 3 }),
  validate,
], async (req, res) => {
  try {
    const settings = await exchangeRateService.getCurrencySettings(req.user._id);
    const base = req.query.base || settings.baseCurrency || 'USD';
    const target = req.query.target || settings.sellingCurrency || 'SSP';

    const currentRate = await exchangeRateService.getCurrentRate(req.user._id, base, target);
    res.json({
      rate: currentRate?.rate || null,
      previousRate: currentRate?.previousRate || null,
      changePercent: currentRate?.changePercent || 0,
      baseCurrency: base,
      targetCurrency: target,
      source: currentRate?.source || 'manual',
      status: currentRate?.status || 'none',
      effectiveDate: currentRate?.effectiveDate || null,
      lastRateUpdateAt: settings.lastRateUpdateAt,
    });
  } catch (err) {
    console.error('Error fetching current rate:', err);
    res.status(500).json({ message: 'Failed to fetch current exchange rate.' });
  }
});

// POST /api/currency/rate - Manual or API rate update
router.post('/rate', [
  body('rate').isFloat({ gt: 0 }).withMessage('Exchange rate must be greater than zero'),
  body('baseCurrency').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 3 }),
  body('targetCurrency').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 3 }),
  body('source').optional({ values: 'falsy' }).isIn(['manual', 'api', 'supplier', 'offline_sync']),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  validate,
], async (req, res) => {
  try {
    const settings = await exchangeRateService.getCurrencySettings(req.user._id);
    const baseCurrency = req.body.baseCurrency || settings.baseCurrency || 'USD';
    const targetCurrency = req.body.targetCurrency || settings.sellingCurrency || 'SSP';

    const result = await exchangeRateService.saveRate(req.user._id, {
      baseCurrency,
      targetCurrency,
      rate: req.body.rate,
      source: req.body.source || 'manual',
      user: req.user,
      notes: req.body.notes,
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Error saving exchange rate:', err);
    res.status(400).json({ message: err.message || 'Failed to record exchange rate.' });
  }
});

// GET /api/currency/rate/history
router.get('/rate/history', [
  query('base').optional().trim().isLength({ min: 3, max: 3 }),
  query('target').optional().trim().isLength({ min: 3, max: 3 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
], async (req, res) => {
  try {
    const settings = await exchangeRateService.getCurrencySettings(req.user._id);
    const base = req.query.base || settings.baseCurrency || 'USD';
    const target = req.query.target || settings.sellingCurrency || 'SSP';
    const limit = parseInt(req.query.limit) || 50;

    const history = await exchangeRateService.getRateHistory(req.user._id, base, target, limit);
    res.json(history);
  } catch (err) {
    console.error('Error fetching rate history:', err);
    res.status(500).json({ message: 'Failed to fetch rate history.' });
  }
});

// GET /api/currency/review-products - Products requiring price review or below replacement cost
router.get('/review-products', async (req, res) => {
  try {
    const products = await exchangeRateService.getProductsForReview(req.user._id);
    res.json(products);
  } catch (err) {
    console.error('Error fetching review products:', err);
    res.status(500).json({ message: 'Failed to fetch products for price review.' });
  }
});

// POST /api/currency/apply-prices - Batch approve, edit, or reject price changes
router.post('/apply-prices', [
  body('approvals').isArray({ min: 1 }).withMessage('Approvals must be a non-empty array'),
  body('approvals.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('approvals.*.newPrice').isFloat({ gt: 0 }).withMessage('New price must be greater than zero'),
  body('reason').optional().trim().isLength({ max: 500 }),
  validate,
], async (req, res) => {
  try {
    const { approvals, reason } = req.body;
    const result = await exchangeRateService.applyPriceApprovals(
      req.user._id,
      approvals,
      reason || 'Manual price review approval',
      req.user
    );

    res.json(result);
  } catch (err) {
    console.error('Error applying price approvals:', err);
    res.status(400).json({ message: err.message || 'Failed to apply price approvals.' });
  }
});

// GET /api/currency/impact-report - Valuation metrics and affected inventory
router.get('/impact-report', async (req, res) => {
  try {
    const report = await exchangeRateService.getCurrencyImpactReport(req.user._id);
    res.json(report);
  } catch (err) {
    console.error('Error generating impact report:', err);
    res.status(500).json({ message: 'Failed to generate currency impact report.' });
  }
});

// GET /api/currency/price-history - Audit log of price changes
router.get('/price-history', [
  query('productId').optional().isMongoId(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('page').optional().isInt({ min: 1 }),
  validate,
], async (req, res) => {
  try {
    const { productId, limit = 50, page = 1 } = req.query;
    const history = await exchangeRateService.getPriceChangeHistory(req.user._id, {
      productId,
      limit: parseInt(limit),
      page: parseInt(page),
    });
    res.json(history);
  } catch (err) {
    console.error('Error fetching price change history:', err);
    res.status(500).json({ message: 'Failed to fetch price change history.' });
  }
});

// POST /api/currency/batch-sync-rates - Sync offline exchange rate writes
router.post('/batch-sync-rates', [
  body('rates').isArray().withMessage('Rates must be an array'),
  validate,
], async (req, res) => {
  try {
    const result = await exchangeRateService.reconcileOfflineRates(req.user._id, req.body.rates, req.user);
    res.json(result);
  } catch (err) {
    console.error('Offline rate sync error:', err);
    res.status(500).json({ message: 'Failed to synchronize offline rates.' });
  }
});

module.exports = router;
