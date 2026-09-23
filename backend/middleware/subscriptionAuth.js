const { hasAccess, getUserEntitlements } = require('../services/entitlementService');

/**
 * Middleware: Requires that the authenticated user has an active subscription or admin privileges.
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const entitlements = await getUserEntitlements(req.user._id);
    if (!entitlements.isEntitled) {
      return res.status(403).json({
        code: 'SUBSCRIPTION_EXPIRED',
        status: entitlements.status,
        message: 'Your Duka Profit subscription has expired. Please renew your plan to continue using this feature.',
      });
    }

    req.subscription = entitlements;
    next();
  } catch (err) {
    console.error('requireActiveSubscription error:', err);
    next(err);
  }
};

/**
 * Middleware factory: Requires that the user possesses access to a specific feature entitlement.
 * @param {string} featureName e.g. 'CHECKOUT', 'STOCK_IN', 'PROFIT_REPORTS'
 */
const requireEntitlement = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      if (req.user.role === 'admin') {
        return next();
      }

      const allowed = await hasAccess(req.user._id, featureName);
      if (!allowed) {
        return res.status(403).json({
          code: 'UPGRADE_REQUIRED',
          feature: featureName,
          message: `This feature (${featureName}) requires an active Duka Profit subscription. Please upgrade your plan.`,
        });
      }

      next();
    } catch (err) {
      console.error(`requireEntitlement(${featureName}) error:`, err);
      next(err);
    }
  };
};

module.exports = {
  requireActiveSubscription,
  requireEntitlement,
};
