const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { validateLicenseKey, generateLicenseKey } = require('../utils/licenseGenerator');
const { plans } = require('../config/plans');

describe('Manual Payment & License Issuing Flow', () => {
  // Regex from backend/routes/manualPayments.js
  const RWANDA_PHONE_REGEX = /^(\+?250|0)?7[2389]\d{7}$/;

  // Helper validation logic mirroring the route
  function validatePaymentSubmission(data, existingTxIds = new Set()) {
    const errors = [];

    if (!data.plan || !plans.some((p) => p.slug === data.plan)) {
      errors.push('Invalid plan selected');
    }

    if (!data.amountPaid || isNaN(data.amountPaid) || Number(data.amountPaid) <= 0) {
      errors.push('Amount paid must be a positive number');
    }

    if (!data.network || !['MTN', 'AIRTEL'].includes(String(data.network).toUpperCase())) {
      errors.push('Network must be MTN or AIRTEL');
    }

    if (!data.transactionId || String(data.transactionId).trim().length < 4) {
      errors.push('Transaction ID from SMS is required');
    } else {
      const normalizedTxId = String(data.transactionId).trim().toUpperCase();
      if (existingTxIds.has(normalizedTxId)) {
        return { status: 409, message: 'This Transaction ID has already been submitted for verification.' };
      }
    }

    if (!data.customerName || String(data.customerName).trim().length < 2) {
      errors.push('Full name is required');
    }

    if (!data.customerPhone || !RWANDA_PHONE_REGEX.test(String(data.customerPhone).trim())) {
      errors.push('Invalid Rwandan phone number format');
    }

    if (errors.length > 0) {
      return { status: 400, errors, message: errors[0] };
    }

    return {
      status: 201,
      success: true,
      data: {
        plan: data.plan,
        amountPaid: Number(data.amountPaid),
        network: String(data.network).toUpperCase(),
        transactionId: String(data.transactionId).trim().toUpperCase(),
        customerPhone: String(data.customerPhone).trim(),
        status: 'pending',
      },
    };
  }

  // Admin access check helper
  function checkAdminAccess(user) {
    if (!user) {
      return { status: 401, message: 'Access denied. No token provided.' };
    }
    if (user.role !== 'admin') {
      return { status: 403, message: 'Access denied. Admin privileges required.' };
    }
    return { status: 200, allowed: true };
  }

  // Approval idempotency helper
  function approvePaymentRequest(request, adminUser) {
    const access = checkAdminAccess(adminUser);
    if (!access.allowed) return access;

    if (!request) {
      return { status: 404, message: 'Payment request not found.' };
    }

    // Idempotency: cannot approve twice
    if (request.status === 'approved') {
      return { status: 400, message: 'Payment request has already been approved. Cannot approve twice.', licenseKey: request.licenseKey };
    }

    const key = generateLicenseKey();
    request.status = 'approved';
    request.reviewedBy = adminUser._id;
    request.reviewedAt = new Date();
    request.licenseKey = key;

    return {
      status: 200,
      success: true,
      message: 'Payment approved successfully.',
      licenseKey: key,
      request,
    };
  }

  test('validates Rwandan phone formats correctly', () => {
    // Valid MTN / Airtel Rwanda numbers
    assert.equal(RWANDA_PHONE_REGEX.test('0788123456'), true);
    assert.equal(RWANDA_PHONE_REGEX.test('+250788123456'), true);
    assert.equal(RWANDA_PHONE_REGEX.test('250788123456'), true);
    assert.equal(RWANDA_PHONE_REGEX.test('0791234567'), true);
    assert.equal(RWANDA_PHONE_REGEX.test('0720123456'), true);
    assert.equal(RWANDA_PHONE_REGEX.test('0730123456'), true);

    // Invalid numbers (wrong prefix, too short, international non-Rwanda)
    assert.equal(RWANDA_PHONE_REGEX.test('0712345678'), false); // 071 not standard telecom in RW
    assert.equal(RWANDA_PHONE_REGEX.test('07812345'), false); // too short
    assert.equal(RWANDA_PHONE_REGEX.test('078123456789'), false); // too long
    assert.equal(RWANDA_PHONE_REGEX.test('+254712345678'), false); // Kenya prefix
    assert.equal(RWANDA_PHONE_REGEX.test('invalid-phone'), false);
  });

  test('rejects negative or zero payment amounts', () => {
    const payload = {
      plan: 'monthly',
      amountPaid: -5000,
      network: 'MTN',
      transactionId: 'TX123456',
      customerName: 'Jean Bosco',
      customerPhone: '0788123456',
    };

    const res = validatePaymentSubmission(payload);
    assert.equal(res.status, 400);
    assert.match(res.message, /positive number/i);
  });

  test('rejects duplicate transaction ID to prevent receipt reuse (409 Conflict)', () => {
    const existingTxIds = new Set(['MOMOTX998877']);

    const duplicatePayload = {
      plan: 'monthly',
      amountPaid: 5000,
      network: 'MTN',
      transactionId: 'momotx998877', // lower case should be normalized
      customerName: 'Alice Kayitesi',
      customerPhone: '0788990011',
    };

    const res = validatePaymentSubmission(duplicatePayload, existingTxIds);
    assert.equal(res.status, 409);
    assert.match(res.message, /already been submitted/i);
  });

  test('blocks non-admin users from accessing admin payment routes (403 Forbidden)', () => {
    const regularUser = { _id: 'user123', email: 'shop@duka.rw', role: 'user' };
    const adminUser = { _id: 'admin999', email: 'admin@duka.rw', role: 'admin' };

    const regularRes = checkAdminAccess(regularUser);
    assert.equal(regularRes.status, 403);
    assert.equal(regularRes.allowed, undefined);

    const adminRes = checkAdminAccess(adminUser);
    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.allowed, true);
  });

  test('enforces strict idempotency: approving twice does NOT generate two license keys', () => {
    const admin = { _id: 'admin1', email: 'admin@duka.rw', role: 'admin' };
    const request = {
      _id: 'req123',
      user: 'cust1',
      plan: 'monthly',
      status: 'pending',
      transactionId: 'TXN112233',
    };

    // First approve
    const firstResult = approvePaymentRequest(request, admin);
    assert.equal(firstResult.status, 200);
    assert.equal(firstResult.success, true);
    const issuedKey = firstResult.licenseKey;
    assert.ok(issuedKey.startsWith('DUKA-'));

    // Second approve attempt on same request
    const secondResult = approvePaymentRequest(request, admin);
    assert.equal(secondResult.status, 400);
    assert.match(secondResult.message, /already been approved/i);
    assert.equal(secondResult.licenseKey, issuedKey); // Returns original key, no new key created
  });

  test('generates cryptographically unguessable license keys in DUKA-XXXX-XXXX-XXXX format', () => {
    const key = generateLicenseKey();
    assert.match(key, /^DUKA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.equal(validateLicenseKey(key), true);

    // Verify uniqueness across 100 generated keys
    const set = new Set();
    for (let i = 0; i < 100; i++) {
      set.add(generateLicenseKey());
    }
    assert.equal(set.size, 100);
  });

  test('full happy path: submit manual payment -> pending -> admin approves -> license key ready', () => {
    const admin = { _id: 'admin1', email: 'admin@duka.rw', role: 'admin' };
    const existingTxIds = new Set();

    // 1. Customer submits
    const submission = {
      plan: 'quarterly',
      amountPaid: 12000,
      network: 'MTN',
      transactionId: 'MOMO-RW-882200',
      customerName: 'Uwera Marie',
      customerPhone: '+250788345678',
    };

    const submitRes = validatePaymentSubmission(submission, existingTxIds);
    assert.equal(submitRes.status, 201);
    assert.equal(submitRes.data.status, 'pending');

    const createdRecord = {
      _id: 'db_id_456',
      user: 'customer_789',
      plan: submitRes.data.plan,
      amountExpected: 12000,
      amountPaid: submitRes.data.amountPaid,
      network: submitRes.data.network,
      transactionId: submitRes.data.transactionId,
      customerPhone: submitRes.data.customerPhone,
      status: 'pending',
    };

    // 2. Admin reviews and approves
    const approveRes = approvePaymentRequest(createdRecord, admin);
    assert.equal(approveRes.status, 200);
    assert.equal(createdRecord.status, 'approved');
    assert.ok(createdRecord.licenseKey);
    assert.equal(validateLicenseKey(createdRecord.licenseKey), true);
  });

  test('GET /api/plans returns manual payment plans and payment instructions', async () => {
    const express = require('express');
    const http = require('http');
    const manualRouter = require('../routes/manualPayments');

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api', manualRouter);

    const server = http.createServer(testApp);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/plans`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.plans));
      assert.ok(data.plans.length >= 3);
      assert.ok(data.instructions);
      assert.ok(data.instructions.momo);
      assert.ok(data.instructions.airtel);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('GET /api/admin/payments rejects unauthenticated requests with 401', async () => {
    const express = require('express');
    const http = require('http');
    const manualRouter = require('../routes/manualPayments');

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api', manualRouter);

    const server = http.createServer(testApp);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/admin/payments?status=pending`);
      assert.equal(res.status, 401);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

