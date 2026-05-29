const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // For single-item sales (legacy)
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false,
  },
  quantity: {
    type: Number,
    required: false,
    min: [1, 'Quantity must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be a whole number',
    },
  },
  // For multi-item checkout (new)
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: String,
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: Number,
    costPrice: Number,
    subtotal: Number,
  }],
  totalAmount: {
    type: Number,
    required: false,
  },
  totalProfit: {
    type: Number,
    required: false,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'momo', 'card', 'bank', 'credit'],
    default: 'cash',
  },
  customerName: {
    type: String,
    required: false,
  },
  customerPhone: {
    type: String,
    required: false,
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid',
  },
  // Snapshot prices at time of sale (in case product prices change later)
  costPriceSnapshot: {
    type: Number,
    required: false,
  },
  sellingPriceSnapshot: {
    type: Number,
    required: false,
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

// Pre-save: auto-calculate profit and revenue for single-item sales
saleSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    // Multi-item checkout - totals already calculated
    if (!this.profit) this.profit = this.totalProfit || 0;
    if (!this.revenue) this.revenue = this.totalAmount || 0;
  } else {
    // Single-item legacy sale
    this.profit = (this.sellingPriceSnapshot - this.costPriceSnapshot) * this.quantity;
    this.revenue = this.sellingPriceSnapshot * this.quantity;
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
