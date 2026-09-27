const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema(
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
    baseCurrency: {
      type: String,
      required: [true, 'Base currency is required'],
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    targetCurrency: {
      type: String,
      required: [true, 'Target currency is required'],
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    rate: {
      type: Number,
      required: [true, 'Exchange rate is required'],
      min: [0.000001, 'Exchange rate must be a positive number'],
    },
    previousRate: {
      type: Number,
      default: null,
    },
    changePercent: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ['manual', 'api', 'supplier', 'offline_sync'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['active', 'superseded'],
      default: 'active',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    offlineSyncId: {
      type: String,
      default: null,
      index: true,
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast history query and active rate retrieval
exchangeRateSchema.index({ userId: 1, baseCurrency: 1, targetCurrency: 1, status: 1 });
exchangeRateSchema.index({ userId: 1, baseCurrency: 1, targetCurrency: 1, effectiveDate: -1 });

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);
