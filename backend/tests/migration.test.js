const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Legacy License to SaaS Migration Logic', () => {
  function simulateLicenseMigration(licenses, existingSubscriptions, proPlanId, freePlanId, now = new Date()) {
    const results = {
      migratedActive: [],
      migratedFree: [],
      skipped: [],
    };

    for (const license of licenses) {
      if (!license.assignedTo) {
        results.skipped.push({ key: license.key, reason: 'unassigned' });
        continue;
      }

      // Check idempotency: already migrated?
      const alreadyMigrated = existingSubscriptions.some(
        (s) => s.userId === license.assignedTo && s.source === 'LEGACY_LICENSE'
      );

      if (alreadyMigrated) {
        results.skipped.push({ key: license.key, reason: 'already_migrated' });
        continue;
      }

      if (license.status === 'suspended') {
        results.skipped.push({ key: license.key, reason: 'suspended' });
        continue;
      }

      const isExpired = license.status === 'expired' || (license.expiresAt && license.expiresAt <= now);

      if (!isExpired) {
        // Active license -> Pro subscription
        const sub = {
          userId: license.assignedTo,
          planId: proPlanId,
          status: 'ACTIVE',
          startDate: license.activatedAt || now,
          endDate: license.expiresAt,
          source: 'LEGACY_LICENSE',
        };
        existingSubscriptions.push(sub);
        results.migratedActive.push(sub);
      } else {
        // Expired license -> Free plan
        const sub = {
          userId: license.assignedTo,
          planId: freePlanId,
          status: 'ACTIVE',
          startDate: now,
          endDate: new Date(now.getTime() + 3650 * 86400000),
          source: 'DEFAULT_FREE',
        };
        existingSubscriptions.push(sub);
        results.migratedFree.push(sub);
      }
    }

    return results;
  }

  test('migrates valid unexpired license to Pro subscription with LEGACY_LICENSE source', () => {
    const now = new Date('2026-09-23T10:00:00Z');
    const licenses = [
      {
        key: 'DUKA-PRO-1234',
        assignedTo: 'user_1',
        status: 'used',
        expiresAt: new Date('2026-12-31T00:00:00Z'),
        activatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ];

    const subs = [];
    const res = simulateLicenseMigration(licenses, subs, 'plan_pro', 'plan_free', now);

    assert.equal(res.migratedActive.length, 1);
    assert.equal(res.migratedActive[0].userId, 'user_1');
    assert.equal(res.migratedActive[0].planId, 'plan_pro');
    assert.equal(res.migratedActive[0].source, 'LEGACY_LICENSE');
    assert.equal(res.migratedActive[0].status, 'ACTIVE');
  });

  test('expired license does not receive active Pro plan, assigned Free tier', () => {
    const now = new Date('2026-09-23T10:00:00Z');
    const licenses = [
      {
        key: 'DUKA-OLD-9999',
        assignedTo: 'user_2',
        status: 'expired',
        expiresAt: new Date('2025-01-01T00:00:00Z'), // Past
      },
    ];

    const subs = [];
    const res = simulateLicenseMigration(licenses, subs, 'plan_pro', 'plan_free', now);

    assert.equal(res.migratedActive.length, 0);
    assert.equal(res.migratedFree.length, 1);
    assert.equal(res.migratedFree[0].planId, 'plan_free');
    assert.equal(res.migratedFree[0].source, 'DEFAULT_FREE');
  });

  test('migration is idempotent: running twice skips already migrated subscriptions', () => {
    const now = new Date('2026-09-23T10:00:00Z');
    const licenses = [
      {
        key: 'DUKA-PRO-1234',
        assignedTo: 'user_1',
        status: 'used',
        expiresAt: new Date('2026-12-31T00:00:00Z'),
      },
    ];

    const subs = [];
    const firstRun = simulateLicenseMigration(licenses, subs, 'plan_pro', 'plan_free', now);
    assert.equal(firstRun.migratedActive.length, 1);

    // Second run
    const secondRun = simulateLicenseMigration(licenses, subs, 'plan_pro', 'plan_free', now);
    assert.equal(secondRun.migratedActive.length, 0, 'Must not migrate again');
    assert.equal(secondRun.skipped.length, 1);
    assert.equal(secondRun.skipped[0].reason, 'already_migrated');
  });
});
