require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const License = require('../models/License');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const AuditLog = require('../models/AuditLog');

async function migrateLicenses() {
  console.log('=== DUKA PROFIT: Legacy License to SaaS Subscription Migration ===\n');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/duka-profit';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.\n');

    // 1. Ensure default plans exist
    await SubscriptionPlan.seedDefaultPlans();
    const proPlan = await SubscriptionPlan.findOne({ slug: 'monthly' });
    const freePlan = await SubscriptionPlan.findOne({ slug: 'free' });

    if (!proPlan) {
      throw new Error('Pro subscription plan not found.');
    }

    // 2. Query all assigned licenses
    const licenses = await License.find({ assignedTo: { $ne: null } }).populate('assignedTo');
    console.log(`Found ${licenses.length} assigned license(s) to evaluate.`);

    let migratedActiveCount = 0;
    let migratedExpiredCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const now = new Date();

    for (const license of licenses) {
      try {
        const user = license.assignedTo;
        if (!user) {
          console.warn(`[WARN] License ${license.key} has assignedTo reference but user does not exist. Skipping.`);
          skippedCount++;
          continue;
        }

        // Idempotency check: Does user already have a subscription with source 'LEGACY_LICENSE'?
        const existingSub = await Subscription.findOne({
          userId: user._id,
          source: 'LEGACY_LICENSE',
        });

        if (existingSub) {
          console.log(`[SKIP] User ${user.email} already has migrated legacy subscription (${existingSub._id}).`);
          skippedCount++;
          continue;
        }

        const isExpired = license.status === 'expired' || (license.expiresAt && license.expiresAt <= now);
        const isSuspended = license.status === 'suspended';

        if (isSuspended) {
          console.log(`[SKIP] License ${license.key} for ${user.email} is suspended.`);
          skippedCount++;
          continue;
        }

        if (!isExpired) {
          // Valid active license -> map to ACTIVE Pro subscription
          const newSub = await Subscription.create({
            userId: user._id,
            planId: proPlan._id,
            status: 'ACTIVE',
            startDate: license.activatedAt || license.createdAt || now,
            endDate: license.expiresAt || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
            source: 'LEGACY_LICENSE',
            provider: 'legacy_license',
            metadata: {
              licenseKey: license.key,
              originalType: license.type,
              migratedAt: now,
            },
          });

          await User.findByIdAndUpdate(user._id, {
            currentSubscription: newSub._id,
            subscriptionStatus: 'ACTIVE',
          });

          await AuditLog.create({
            userId: user._id,
            action: 'LEGACY_LICENSE_MIGRATED',
            subscriptionId: newSub._id,
            metadata: {
              licenseKey: license.key,
              endDate: newSub.endDate,
              status: 'ACTIVE',
            },
          });

          console.log(`[SUCCESS] Migrated active license ${license.key} -> Active Subscription (${newSub.endDate.toISOString().split('T')[0]}) for ${user.email}`);
          migratedActiveCount++;
        } else {
          // Expired license -> assign Free starter plan
          const freeSub = await Subscription.create({
            userId: user._id,
            planId: freePlan._id,
            status: 'ACTIVE',
            startDate: now,
            endDate: new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000),
            source: 'DEFAULT_FREE',
            provider: 'free_tier',
            metadata: {
              previousLicenseKey: license.key,
              migratedAt: now,
            },
          });

          await User.findByIdAndUpdate(user._id, {
            currentSubscription: freeSub._id,
            subscriptionStatus: 'ACTIVE',
          });

          console.log(`[EXPIRED] License ${license.key} was expired. Assigned Free Starter tier for ${user.email}`);
          migratedExpiredCount++;
        }
      } catch (subErr) {
        console.error(`[ERROR] Failed to migrate license ${license.key}:`, subErr.message);
        errorCount++;
      }
    }

    console.log('\n=== MIGRATION SUMMARY ===');
    console.log(`Active Licenses Migrated to Pro: ${migratedActiveCount}`);
    console.log(`Expired Licenses Assigned Free:   ${migratedExpiredCount}`);
    console.log(`Skipped / Already Migrated:      ${skippedCount}`);
    console.log(`Errors:                          ${errorCount}`);
    console.log('========================\n');

    process.exit(0);
  } catch (err) {
    console.error('Fatal migration error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateLicenses();
}

module.exports = { migrateLicenses };
