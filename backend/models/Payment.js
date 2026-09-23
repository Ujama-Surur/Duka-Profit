const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      default: 'flutterwave',
      enum: ['flutterwave', 'paypack', 'stripe', 'manual'],
      index: true,
    },
    providerTransactionId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    transactionReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Payment amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'RWF',
      uppercase: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      default: 'mobilemoneyrwanda',
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    providerStatus: {
      type: String,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Composite indexes for fast customer history & reporting queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
