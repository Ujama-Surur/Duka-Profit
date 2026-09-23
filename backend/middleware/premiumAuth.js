const { hasAccess } = require('../services/entitlementService');

/**
 * Backward compatibility wrapper for premiumOrAdmin middleware.
 * Now powered by the centralized Entitlement Service.
 */
const premiumOrAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    // Allow if user is admin
    if (user.role === 'admin') {
      return next();
    }

    // Check entitlement for POS checkout
    const allowed = await hasAccess(user._id, 'CHECKOUT');
    if (allowed) {
      return next();
    }

    // Deny access
    return res.status(403).json({
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'Active subscription required for checkout features. Please upgrade your plan to access this feature.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { premiumOrAdmin };
