const express = require('express');
const { body, param, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const paymentService = require('../services/payment/paymentService');
const Payment = require('../models/Payment');

const router = express.Router();

// ==========================================
// 1. PUBLIC WEBHOOK ENDPOINT
// ==========================================
// POST /api/payments/flutterwave/webhook
router.post('/flutterwave/webhook', async (req, res) => {
  try {
    const result = await paymentService.handleWebhook(req);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error('Flutterwave webhook processing error:', err.message);
    // Respond with 200 or 400 depending on signature validity to avoid spamming provider
    if (err.message === 'Invalid webhook signature.') {
      return res.status(401).json({ message: 'Unauthorized webhook call.' });
    }
    res.status(400).json({ message: err.message });
  }
});

// ==========================================
// 2. AUTHENTICATED CUSTOMER PAYMENT ROUTES
// ==========================================
// POST /api/payments/create - Initiate a plan subscription payment
router.post(
  '/create',
  protect,
  [
    body('planId').isMongoId().withMessage('Valid planId is required.'),
    body('customerPhone').optional().trim(),
    body('redirectUrl').optional().trim(),
    validate,
  ],
  async (req, res) => {
    try {
      const { planId, customerPhone, redirectUrl } = req.body;
      const clientIp = req.ip || req.connection?.remoteAddress;

      const result = await paymentService.initiatePayment({
        userId: req.user._id,
        planId,
        customerPhone,
        redirectUrl,
        ipAddress: clientIp,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('Payment initiation error:', err);
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to initiate payment.',
      });
    }
  }
);

// GET /api/payments/verify/:txRef - Direct verification endpoint for customer redirect
router.get(
  '/verify/:txRef',
  protect,
  [param('txRef').trim().notEmpty().withMessage('Transaction reference is required.'), validate],
  async (req, res) => {
    try {
      const { txRef } = req.params;
      const { transaction_id } = req.query;

      // User authorization check: verify user owns this payment
      const payment = await Payment.findOne({ transactionReference: txRef });
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment record not found.' });
      }

      if (payment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You cannot verify another user’s payment.',
        });
      }

      const clientIp = req.ip || req.connection?.remoteAddress;
      const result = await paymentService.verifyAndProcessPayment(txRef, transaction_id, clientIp);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('Payment verification error:', err);
      res.status(400).json({
        success: false,
        message: err.message || 'Payment verification failed.',
      });
    }
  }
);

// GET /api/payments/history - Customer views their own payments only
router.get(
  '/history',
  protect,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validate,
  ],
  async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const skip = (page - 1) * limit;

      const filter = { userId: req.user._id };

      const [payments, total] = await Promise.all([
        Payment.find(filter)
          .populate('planId', 'name slug durationDays')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Payment.countDocuments(filter),
      ]);

      res.json({
        success: true,
        payments: payments.map((p) => ({
          id: p._id,
          date: p.paidAt || p.createdAt,
          planName: p.planId?.name || p.metadata?.planName || 'Pro Plan',
          amount: p.amount,
          currency: p.currency,
          paymentMethod: p.paymentMethod,
          transactionReference: p.transactionReference,
          status: p.status,
          paidAt: p.paidAt,
        })),
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      });
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
      res.status(500).json({ message: 'Failed to retrieve payment history.' });
    }
  }
);

module.exports = router;
