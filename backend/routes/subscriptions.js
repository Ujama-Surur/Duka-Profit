const express = require('express');
const { protect } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const { getUserEntitlements } = require('../services/entitlementService');

const router = express.Router();

router.use(protect);

// GET /api/subscriptions/current - Get current user subscription details & entitlements
router.get('/current', async (req, res) => {
  try {
    const entitlementsData = await getUserEntitlements(req.user._id);

    const subscription = await Subscription.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('planId')
      .populate('currentPaymentId');

    res.json({
      success: true,
      subscription: subscription
        ? {
            id: subscription._id,
            status: entitlementsData.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            daysRemaining: entitlementsData.daysRemaining,
            autoRenew: subscription.autoRenew,
            source: subscription.source,
            provider: subscription.provider,
            plan: subscription.planId,
          }
        : null,
      entitlements: entitlementsData.entitlements,
      isEntitled: entitlementsData.isEntitled,
      daysRemaining: entitlementsData.daysRemaining,
      status: entitlementsData.status,
    });
  } catch (err) {
    console.error('Failed to get current subscription:', err);
    res.status(500).json({ message: 'Failed to retrieve subscription details.' });
  }
});

// GET /api/subscriptions/entitlements - Quick check of current user entitlements
router.get('/entitlements', async (req, res) => {
  try {
    const entitlementsData = await getUserEntitlements(req.user._id);
    res.json({
      success: true,
      status: entitlementsData.status,
      entitlements: entitlementsData.entitlements,
      isEntitled: entitlementsData.isEntitled,
    });
  } catch (err) {
    console.error('Failed to get entitlements:', err);
    res.status(500).json({ message: 'Failed to retrieve feature entitlements.' });
  }
});

module.exports = router;
