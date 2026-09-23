const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');

const ALL_FEATURES = [
  'PRODUCTS',
  'BASIC_INVENTORY',
  'SALES',
  'CHECKOUT',
  'STOCK_IN',
  'BARCODE',
  'PROFIT_REPORTS',
  'FINANCE',
  'EXPORT',
  'MULTI_USER',
  'ADVANCED_REPORTS',
  'CLOUD_BACKUP',
];

const DEFAULT_FREE_FEATURES = ['PRODUCTS', 'BASIC_INVENTORY', 'SALES'];

/**
 * Get active subscription and resolved entitlements for a user.
 * Admins receive ALL_FEATURES unconditionally.
 * Legacy users with licenseStatus === 'active' receive full access for backward compatibility.
 */
async function getUserEntitlements(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    return {
      status: 'UNAUTHORIZED',
      plan: null,
      entitlements: [],
      daysRemaining: 0,
      isEntitled: false,
    };
  }

  // Administrators always have full system access
  if (user.role === 'admin') {
    return {
      status: 'ACTIVE',
      plan: {
        name: 'Administrator VIP',
        slug: 'admin',
        features: ALL_FEATURES,
      },
      entitlements: ALL_FEATURES,
      daysRemaining: 9999,
      isEntitled: true,
      isAdmin: true,
    };
  }

  // Find latest subscription for the user
  const subscription = await Subscription.findOne({ userId })
    .sort({ createdAt: -1 })
    .populate('planId');

  if (subscription && subscription.planId) {
    const isEntitled = subscription.isEntitled();
    const dynamicStatus = subscription.calculateStatus();
    const daysRemaining = subscription.getDaysRemaining();

    if (isEntitled) {
      const planFeatures = subscription.planId.features || [];
      return {
        status: dynamicStatus,
        subscriptionId: subscription._id,
        plan: {
          name: subscription.planId.name,
          slug: subscription.planId.slug,
          price: subscription.planId.price,
          currency: subscription.planId.currency,
          durationDays: subscription.planId.durationDays,
        },
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        source: subscription.source,
        daysRemaining,
        entitlements: planFeatures,
        isEntitled: true,
      };
    }

    // Expired subscription -> fall back to Free features
    return {
      status: dynamicStatus, // 'EXPIRED'
      subscriptionId: subscription._id,
      plan: {
        name: subscription.planId.name,
        slug: subscription.planId.slug,
      },
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      source: subscription.source,
      daysRemaining: 0,
      entitlements: DEFAULT_FREE_FEATURES,
      isEntitled: false,
    };
  }

  // Check backward compatibility: does the user have a legacy active license?
  if (user.licenseStatus === 'active') {
    return {
      status: 'ACTIVE',
      plan: {
        name: 'Legacy License Access',
        slug: 'legacy_license',
      },
      source: 'LEGACY_LICENSE',
      daysRemaining: 365,
      entitlements: [
        'PRODUCTS',
        'BASIC_INVENTORY',
        'SALES',
        'CHECKOUT',
        'STOCK_IN',
        'BARCODE',
        'PROFIT_REPORTS',
        'FINANCE',
        'EXPORT',
      ],
      isEntitled: true,
    };
  }

  // Default to free tier
  return {
    status: 'FREE_TIER',
    plan: {
      name: 'Free Starter',
      slug: 'free',
    },
    daysRemaining: 0,
    entitlements: DEFAULT_FREE_FEATURES,
    isEntitled: true,
  };
}

/**
 * Check if a specific user has entitlement for a given feature.
 */
async function hasAccess(userId, featureName) {
  const result = await getUserEntitlements(userId);
  if (!result || !result.entitlements) return false;
  return result.entitlements.includes(featureName);
}

module.exports = {
  hasAccess,
  getUserEntitlements,
  ALL_FEATURES,
  DEFAULT_FREE_FEATURES,
};
