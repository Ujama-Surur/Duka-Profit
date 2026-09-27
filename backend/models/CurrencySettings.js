const mongoose = require('mongoose');

const currencySettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    branchId: {
      type: String,
      default: 'main',
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    baseCurrency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    sellingCurrency: {
      type: String,
      default: 'SSP',
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    exchangeRateMode: {
      type: String,
      enum: ['manual', 'automatic'],
      default: 'manual',
    },
    rateSource: {
      type: String,
      enum: ['manual', 'api', 'supplier'],
      default: 'manual',
    },
    minProtectionMargin: {
      type: Number,
      default: 0,
      min: [0, 'Minimum protection margin cannot be negative'],
      max: [100, 'Minimum protection margin cannot exceed 100%'],
    },
    roundingRule: {
      type: String,
      enum: ['none', '1', '5', '10', '50', '100', '500', '1000'],
      default: '100',
    },
    lastRateUpdateAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index per user and branch
currencySettingsSchema.index({ userId: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.model('CurrencySettings', currencySettingsSchema);
