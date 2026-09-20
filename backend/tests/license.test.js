const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Unit test testing the hardened verification and activation logic
describe('License Security & Device Binding', () => {
  // Verification logic helper mimicking the route handler
  function verifyLicense(license, deviceId) {
    if (!license) {
      return { status: 404, valid: false, message: 'License key not found.' };
    }
    if (license.status === 'expired' || new Date() > license.expiresAt) {
      return { status: 400, valid: false, message: 'License has expired.' };
    }
    if (license.status === 'suspended') {
      return { status: 400, valid: false, message: 'License has been suspended.' };
    }
    if (license.status === 'used' && license.deviceId) {
      if (!deviceId || license.deviceId !== deviceId) {
        return { status: 400, valid: false, message: 'This license is bound to a different device.' };
      }
    }
    return { status: 200, valid: true, message: 'License is valid.' };
  }

  // Activation logic helper mimicking the controller handler
  function activateLicenseCheck(license, machineId) {
    if (!machineId || !String(machineId).trim()) {
      return { status: 400, success: false, message: 'machineId is required.' };
    }
    if (!license) {
      return { status: 404, success: false, message: 'License key not found.' };
    }
    if (license.status === 'expired' || (license.expiresAt && new Date() > license.expiresAt)) {
      return { status: 400, success: false, message: 'License has expired.' };
    }
    if (license.status === 'suspended') {
      return { status: 400, success: false, message: 'License has been suspended.' };
    }
    const normalizedMachineId = String(machineId).trim();
    if (license.status !== 'used') {
      license.status = 'used';
      license.deviceId = normalizedMachineId;
      return { status: 200, success: true, message: 'License activated successfully.' };
    }
    if (license.deviceId === normalizedMachineId) {
      return { status: 200, success: true, message: 'License already activated on this machine.' };
    }
    return { status: 409, success: false, message: 'License is already used on a different machine.' };
  }

  test('rejects used license when deviceId is omitted (closes bypass)', () => {
    const license = {
      key: 'TEST-KEY-1234',
      status: 'used',
      deviceId: 'MACHINE-AAA',
      expiresAt: new Date(Date.now() + 1000000),
    };

    const res = verifyLicense(license, undefined);
    assert.equal(res.valid, false);
    assert.equal(res.status, 400);
    assert.equal(res.message, 'This license is bound to a different device.');
  });

  test('rejects used license when deviceId does not match', () => {
    const license = {
      key: 'TEST-KEY-1234',
      status: 'used',
      deviceId: 'MACHINE-AAA',
      expiresAt: new Date(Date.now() + 1000000),
    };

    const res = verifyLicense(license, 'MACHINE-BBB');
    assert.equal(res.valid, false);
    assert.equal(res.status, 400);
    assert.equal(res.message, 'This license is bound to a different device.');
  });

  test('accepts used license when deviceId matches', () => {
    const license = {
      key: 'TEST-KEY-1234',
      status: 'used',
      deviceId: 'MACHINE-AAA',
      expiresAt: new Date(Date.now() + 1000000),
    };

    const res = verifyLicense(license, 'MACHINE-AAA');
    assert.equal(res.valid, true);
    assert.equal(res.status, 200);
  });

  test('rejects expired and suspended licenses during verification', () => {
    const expired = {
      key: 'EXP-123',
      status: 'expired',
      expiresAt: new Date(Date.now() - 1000),
    };
    assert.equal(verifyLicense(expired, 'DEV-1').valid, false);

    const suspended = {
      key: 'SUS-123',
      status: 'suspended',
      expiresAt: new Date(Date.now() + 1000000),
    };
    assert.equal(verifyLicense(suspended, 'DEV-1').valid, false);
  });

  test('activation rejects expired and suspended licenses', () => {
    const expired = {
      key: 'EXP-123',
      status: 'expired',
      expiresAt: new Date(Date.now() - 1000),
    };
    const resExp = activateLicenseCheck(expired, 'DEV-1');
    assert.equal(resExp.success, false);
    assert.equal(resExp.message, 'License has expired.');

    const suspended = {
      key: 'SUS-123',
      status: 'suspended',
      expiresAt: new Date(Date.now() + 1000000),
    };
    const resSus = activateLicenseCheck(suspended, 'DEV-1');
    assert.equal(resSus.success, false);
    assert.equal(resSus.message, 'License has been suspended.');
  });

  test('activation binds to first machine and blocks second machine', () => {
    const license = {
      key: 'NEW-LIC-123',
      status: 'active',
      deviceId: null,
      expiresAt: new Date(Date.now() + 1000000),
    };

    const first = activateLicenseCheck(license, 'MACHINE-ORIGINAL');
    assert.equal(first.success, true);
    assert.equal(license.status, 'used');
    assert.equal(license.deviceId, 'MACHINE-ORIGINAL');

    const second = activateLicenseCheck(license, 'MACHINE-INTRUDER');
    assert.equal(second.success, false);
    assert.equal(second.status, 409);
    assert.equal(second.message, 'License is already used on a different machine.');
  });
});
