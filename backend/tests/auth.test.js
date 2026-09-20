const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

describe('Auth Password Security', () => {
  test('bcrypt hashes and validates passwords with 12 salt rounds', async () => {
    const rawPassword = 'SecurePassword123!';
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(rawPassword, salt);

    assert.notEqual(rawPassword, hash);
    const isValid = await bcrypt.compare(rawPassword, hash);
    assert.equal(isValid, true);

    const isInvalid = await bcrypt.compare('WrongPassword', hash);
    assert.equal(isInvalid, false);
  });

  test('double hashing fails password comparison (guard against auth-new bug)', async () => {
    const rawPassword = 'SecurePassword123!';
    // Simulate double hashing bug where pre-hashed string is hashed again
    const salt1 = await bcrypt.genSalt(12);
    const firstHash = await bcrypt.hash(rawPassword, salt1);

    const salt2 = await bcrypt.genSalt(12);
    const doubleHash = await bcrypt.hash(firstHash, salt2);

    // Comparing rawPassword with doubleHash will fail!
    const matchesRaw = await bcrypt.compare(rawPassword, doubleHash);
    assert.equal(matchesRaw, false, 'Raw password must not match a double-hashed password');
  });
});
