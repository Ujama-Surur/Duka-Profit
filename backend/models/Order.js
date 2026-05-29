const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  buyingPrice: {
    type: Number,
    required: true,
    min: [0, 'Buying price cannot be negative'],
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: [0, 'Selling price cannot be negative'],
  },
  barcode: {
    type: String,
    trim: true,
  },
  expiryDate: {
    type: Date,
  },
});

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  totalBuyingCost: {
    type: Number,
    default: 0,
  },
  totalSellingValue: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectedAt: Date,
  rejectionReason: String,
}, {
  timestamps: true,
});

// Auto-generate order number
orderSchema.pre('validate', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const count = await mongoose.model('Order').countDocuments({ userId: this.userId });
      const date = new Date();
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      this.orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Calculate totals before save
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalBuyingCost = this.items.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0);
    this.totalSellingValue = this.items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
