const mongoose = require('mongoose');

const priceChangeHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    previousSellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    newSellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    costPrice: {
      type: Number,
      default: 0,
    },
    replacementCost: {
      type: Number,
      default: 0,
    },
    exchangeRate: {
      type: Number,
      default: 1,
    },
    currencyPair: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    offlineSyncId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

priceChangeHistorySchema.index({ userId: 1, productId: 1, changedAt: -1 });
priceChangeHistorySchema.index({ userId: 1, changedAt: -1 });

module.exports = mongoose.model('PriceChangeHistory', priceChangeHistorySchema);
