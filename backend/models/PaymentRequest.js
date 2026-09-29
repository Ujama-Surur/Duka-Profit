const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    plan: {
      type: String,
      required: [true, 'Plan identifier is required'],
      trim: true,
    },
    amountExpected: {
      type: Number,
      required: [true, 'Amount expected is required'],
      min: [0, 'Amount expected cannot be negative'],
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0, 'Amount paid cannot be negative'],
    },
    network: {
      type: String,
      required: [true, 'Mobile network is required'],
      enum: ['MTN', 'AIRTEL'],
      uppercase: true,
      trim: true,
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    reference: {
      type: String,
      required: [true, 'Payment reference is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
    },
    screenshotUrl: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectReason: {
      type: String,
      default: null,
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    licenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'License',
      default: null,
    },
    licenseKey: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentRequestSchema.index({ user: 1, createdAt: -1 });
paymentRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
