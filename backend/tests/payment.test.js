const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Payment Security, Idempotency & Gateway Verification', () => {
  // Simulates server-side price resolution
  function resolvePaymentPrice(databasePlans, clientRequest) {
    const plan = databasePlans.find((p) => p._id === clientRequest.planId);
    if (!plan) throw new Error('Invalid plan');

    // Security invariant: Ignore clientRequest.amount completely!
    return {
      planId: plan._id,
      amount: plan.price,
      currency: plan.currency,
      durationDays: plan.durationDays,
    };
  }

  // Simulates verification & idempotency processor
  function processPaymentVerification(paymentRecord, providerResult, currentSubscription) {
    // 1. Idempotency Guard
    if (paymentRecord.status === 'SUCCESS') {
      return {
        alreadyProcessed: true,
        extended: false,
        payment: paymentRecord,
        subscription: currentSubscription,
      };
    }

    // 2. Gateway Status Check
    if (providerResult.status !== 'successful') {
      paymentRecord.status = 'FAILED';
      paymentRecord.failureReason = 'Provider reported failure';
      return { success: false, payment: paymentRecord };
    }

    // 3. Amount & Currency Security Verification
    if (providerResult.amount < paymentRecord.amount) {
      paymentRecord.status = 'FAILED';
      paymentRecord.failureReason = 'Amount mismatch';
      return { success: false, payment: paymentRecord };
    }

    if (providerResult.currency.toUpperCase() !== paymentRecord.currency.toUpperCase()) {
      paymentRecord.status = 'FAILED';
      paymentRecord.failureReason = 'Currency mismatch';
      return { success: false, payment: paymentRecord };
    }

    // 4. Mark success and extend
    paymentRecord.status = 'SUCCESS';
    paymentRecord.paidAt = new Date();

    const now = new Date();
    const durationMs = 30 * 24 * 60 * 60 * 1000;
    let newEndDate;

    if (currentSubscription && currentSubscription.status === 'ACTIVE' && currentSubscription.endDate > now) {
      newEndDate = new Date(currentSubscription.endDate.getTime() + durationMs);
    } else {
      newEndDate = new Date(now.getTime() + durationMs);
    }

    currentSubscription.endDate = newEndDate;
    currentSubscription.status = 'ACTIVE';

    return {
      alreadyProcessed: false,
      extended: true,
      payment: paymentRecord,
      subscription: currentSubscription,
    };
  }

  test('server-side pricing ignores client-tampered amount and uses DB price', () => {
    const dbPlans = [
      { _id: 'plan_monthly', price: 5000, currency: 'RWF', durationDays: 30 },
    ];

    const maliciousClientReq = {
      planId: 'plan_monthly',
      amount: 1, // Attacker tries to pay 1 RWF instead of 5,000 RWF!
      currency: 'USD',
    };

    const resolved = resolvePaymentPrice(dbPlans, maliciousClientReq);
    assert.equal(resolved.amount, 5000, 'Resolved amount must strictly match database price');
    assert.equal(resolved.currency, 'RWF', 'Currency must match database currency');
  });

  test('duplicate webhook / replay attack does NOT extend subscription a second time (Strict Idempotency)', () => {
    const payment = {
      _id: 'pay_123',
      transactionReference: 'DP-TEST-1',
      amount: 5000,
      currency: 'RWF',
      status: 'PENDING',
    };

    const subscription = {
      _id: 'sub_123',
      status: 'ACTIVE',
      endDate: new Date('2026-10-01T00:00:00Z'),
    };

    const providerResult = {
      status: 'successful',
      amount: 5000,
      currency: 'RWF',
    };

    // First webhook delivery
    const firstRun = processPaymentVerification(payment, providerResult, subscription);
    assert.equal(firstRun.extended, true);
    assert.equal(firstRun.alreadyProcessed, false);
    assert.equal(payment.status, 'SUCCESS');
    const firstExpiry = new Date(subscription.endDate).getTime();

    // Second duplicate webhook delivery (e.g. Flutterwave retry or user reload)
    const secondRun = processPaymentVerification(payment, providerResult, subscription);
    assert.equal(secondRun.alreadyProcessed, true, 'Second call must detect already processed');
    assert.equal(secondRun.extended, false, 'Second call must NOT extend subscription again');
    assert.equal(new Date(subscription.endDate).getTime(), firstExpiry, 'Expiry date must remain identical');
  });

  test('rejects payment with amount mismatch when provider charged less than required', () => {
    const payment = {
      amount: 5000,
      currency: 'RWF',
      status: 'PENDING',
    };

    const underpaidProviderResult = {
      status: 'successful',
      amount: 2500, // Underpaid!
      currency: 'RWF',
    };

    const res = processPaymentVerification(payment, underpaidProviderResult, {});
    assert.equal(res.success, false);
    assert.equal(payment.status, 'FAILED');
    assert.equal(payment.failureReason, 'Amount mismatch');
  });

  test('rejects payment with currency mismatch', () => {
    const payment = {
      amount: 5000,
      currency: 'RWF',
      status: 'PENDING',
    };

    const wrongCurrencyResult = {
      status: 'successful',
      amount: 5000,
      currency: 'KES', // Kenya Shilling instead of RWF
    };

    const res = processPaymentVerification(payment, wrongCurrencyResult, {});
    assert.equal(res.success, false);
    assert.equal(payment.status, 'FAILED');
    assert.equal(payment.failureReason, 'Currency mismatch');
  });

  test('user isolation: User A cannot verify User B payment', () => {
    const paymentOfUserB = {
      userId: 'user_b_id',
      transactionReference: 'DP-REF-B',
    };

    const authenticatedUserA = {
      _id: 'user_a_id',
      role: 'user',
    };

    const isAuthorized =
      paymentOfUserB.userId === authenticatedUserA._id || authenticatedUserA.role === 'admin';
    assert.equal(isAuthorized, false, 'User A must be forbidden from accessing User B payment');
  });
});
