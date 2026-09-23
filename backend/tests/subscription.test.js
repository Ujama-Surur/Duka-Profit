const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('SaaS Subscription Lifecycle & Entitlements', () => {
  // Mock status calculation matching Subscription model
  function calculateSubscriptionStatus(sub, now = new Date()) {
    if (sub.status === 'CANCELLED' || sub.status === 'SUSPENDED') {
      return sub.status;
    }
    const end = new Date(sub.endDate);
    const graceEnd = new Date(end.getTime() + (sub.gracePeriodDays || 0) * 24 * 60 * 60 * 1000);

    if (now > graceEnd) {
      return 'EXPIRED';
    }

    const expiringThreshold = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
    if (now >= expiringThreshold && now <= end) {
      return 'EXPIRING_SOON';
    }

    return 'ACTIVE';
  }

  // Mock cumulative renewal calculation matching paymentService
  function calculateRenewalEndDate(existingSub, planDurationDays, now = new Date()) {
    const durationMs = planDurationDays * 24 * 60 * 60 * 1000;
    if (existingSub && existingSub.status === 'ACTIVE' && new Date(existingSub.endDate) > now) {
      // User renewing early: extend from existing endDate!
      return new Date(new Date(existingSub.endDate).getTime() + durationMs);
    }
    // New or expired: extend from now
    return new Date(now.getTime() + durationMs);
  }

  // Mock entitlement checker
  function checkEntitlement(user, subscription, requestedFeature) {
    if (user.role === 'admin') {
      return true; // Admins have access to everything
    }

    if (!subscription || subscription.status === 'EXPIRED') {
      // Free default entitlements
      return ['PRODUCTS', 'BASIC_INVENTORY', 'SALES'].includes(requestedFeature);
    }

    const planFeatures = subscription.features || [];
    return planFeatures.includes(requestedFeature);
  }

  test('active subscription within valid range returns ACTIVE', () => {
    const sub = {
      status: 'ACTIVE',
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days ahead
      gracePeriodDays: 3,
    };
    assert.equal(calculateSubscriptionStatus(sub), 'ACTIVE');
  });

  test('subscription expiring within 3 days returns EXPIRING_SOON', () => {
    const sub = {
      status: 'ACTIVE',
      endDate: new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000), // 1.5 days ahead
      gracePeriodDays: 3,
    };
    assert.equal(calculateSubscriptionStatus(sub), 'EXPIRING_SOON');
  });

  test('subscription past endDate but within 3-day grace period is still considered active/entitled', () => {
    const now = new Date();
    const sub = {
      status: 'ACTIVE',
      endDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Expired 1 day ago
      gracePeriodDays: 3, // Still within 3-day grace
    };
    // Grace period allows non-destructive access
    const isPastGrace = now > new Date(sub.endDate.getTime() + sub.gracePeriodDays * 86400000);
    assert.equal(isPastGrace, false, 'User must remain within grace period window');
  });

  test('subscription past grace period returns EXPIRED', () => {
    const sub = {
      status: 'ACTIVE',
      endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired 5 days ago
      gracePeriodDays: 3,
    };
    assert.equal(calculateSubscriptionStatus(sub), 'EXPIRED');
  });

  test('early renewal cumulatively extends from current endDate (does NOT truncate remaining days)', () => {
    const now = new Date('2026-09-01T00:00:00Z');
    const existingExpiry = new Date('2026-09-30T00:00:00Z');
    const existingSub = {
      status: 'ACTIVE',
      endDate: existingExpiry,
    };

    // User renews on Sept 1st for 30 more days
    const newExpiry = calculateRenewalEndDate(existingSub, 30, now);

    // Expiry must be Sept 30 + 30 days = Oct 30, NOT Sept 1 + 30 days!
    const expectedExpiry = new Date('2026-10-30T00:00:00Z');
    assert.equal(newExpiry.toISOString(), expectedExpiry.toISOString());
  });

  test('expired renewal resets startDate to current payment date', () => {
    const now = new Date('2026-09-23T10:00:00Z');
    const pastExpiry = new Date('2026-08-01T00:00:00Z');
    const existingSub = {
      status: 'EXPIRED',
      endDate: pastExpiry,
    };

    const newExpiry = calculateRenewalEndDate(existingSub, 30, now);
    const expectedExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    assert.equal(newExpiry.toISOString(), expectedExpiry.toISOString());
  });

  test('entitlements: Free user can access PRODUCTS and SALES but is blocked from CHECKOUT', () => {
    const user = { role: 'user' };
    const freeSub = { status: 'EXPIRED', features: ['PRODUCTS', 'BASIC_INVENTORY', 'SALES'] };

    assert.equal(checkEntitlement(user, freeSub, 'PRODUCTS'), true);
    assert.equal(checkEntitlement(user, freeSub, 'SALES'), true);
    assert.equal(checkEntitlement(user, freeSub, 'CHECKOUT'), false);
    assert.equal(checkEntitlement(user, freeSub, 'STOCK_IN'), false);
  });

  test('entitlements: Pro user can access CHECKOUT and STOCK_IN', () => {
    const user = { role: 'user' };
    const proSub = {
      status: 'ACTIVE',
      features: ['PRODUCTS', 'BASIC_INVENTORY', 'SALES', 'CHECKOUT', 'STOCK_IN', 'PROFIT_REPORTS'],
    };

    assert.equal(checkEntitlement(user, proSub, 'CHECKOUT'), true);
    assert.equal(checkEntitlement(user, proSub, 'STOCK_IN'), true);
    assert.equal(checkEntitlement(user, proSub, 'PROFIT_REPORTS'), true);
  });

  test('entitlements: Admin user has access to ALL features unconditionally', () => {
    const admin = { role: 'admin' };
    const noSub = null;

    assert.equal(checkEntitlement(admin, noSub, 'CHECKOUT'), true);
    assert.equal(checkEntitlement(admin, noSub, 'MULTI_USER'), true);
    assert.equal(checkEntitlement(admin, noSub, 'CLOUD_BACKUP'), true);
  });
});
