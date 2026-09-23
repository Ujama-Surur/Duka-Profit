const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['TRIAL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'PENDING'],
      default: 'ACTIVE',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      enum: ['flutterwave', 'manual', 'legacy_license', 'free_tier'],
      default: 'flutterwave',
    },
    currentPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    source: {
      type: String,
      enum: ['PAYMENT', 'ADMIN', 'LEGACY_LICENSE', 'TRIAL', 'DEFAULT_FREE'],
      default: 'PAYMENT',
    },
    gracePeriodDays: {
      type: Number,
      default: 3,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Dynamic status evaluator considering current time, endDate, and grace period
subscriptionSchema.methods.calculateStatus = function () {
  if (this.status === 'CANCELLED' || this.status === 'SUSPENDED') {
    return this.status;
  }

  const now = new Date();
  const end = new Date(this.endDate);
  const graceEnd = new Date(end.getTime() + (this.gracePeriodDays || 0) * 24 * 60 * 60 * 1000);

  if (now > graceEnd) {
    return 'EXPIRED';
  }

  const expiringThreshold = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
  if (now >= expiringThreshold && now <= end) {
    return 'EXPIRING_SOON';
  }

  return 'ACTIVE';
};

// Check if user is currently entitled to active plan features
subscriptionSchema.methods.isEntitled = function () {
  if (this.status === 'CANCELLED' || this.status === 'SUSPENDED') {
    return false;
  }
  const now = new Date();
  const end = new Date(this.endDate);
  const graceEnd = new Date(end.getTime() + (this.gracePeriodDays || 0) * 24 * 60 * 60 * 1000);
  return now <= graceEnd;
};

// Days remaining until expiration
subscriptionSchema.methods.getDaysRemaining = function () {
  const now = new Date();
  const end = new Date(this.endDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
