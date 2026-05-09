const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
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
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be a whole number',
    },
  },
  // Snapshot prices at time of sale (in case product prices change later)
  costPriceSnapshot: {
    type: Number,
    required: true,
  },
  sellingPriceSnapshot: {
    type: Number,
    required: true,
  },
  profit: {
    type: Number,
    required: true,
  },
  revenue: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes for fast time-range queries
saleSchema.index({ userId: 1, createdAt: -1 });
saleSchema.index({ userId: 1, productId: 1, createdAt: -1 });

// Pre-save: auto-calculate profit and revenue
saleSchema.pre('save', function (next) {
  this.profit = (this.sellingPriceSnapshot - this.costPriceSnapshot) * this.quantity;
  this.revenue = this.sellingPriceSnapshot * this.quantity;
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
