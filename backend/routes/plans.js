const express = require('express');
const SubscriptionPlan = require('../models/SubscriptionPlan');

const router = express.Router();

// GET /api/plans - Public list of available SaaS plans
router.get('/', async (req, res) => {
  try {
    let plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });

    // Auto-seed default plans if empty
    if (!plans || plans.length === 0) {
      await SubscriptionPlan.seedDefaultPlans();
      plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });
    }

    res.json({
      success: true,
      plans,
    });
  } catch (err) {
    console.error('Failed to fetch subscription plans:', err);
    res.status(500).json({ message: 'Failed to fetch subscription plans.' });
  }
});

module.exports = router;
