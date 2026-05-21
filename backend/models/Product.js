const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
  },
  barcode: {
    type: String,
    trim: true,
  },
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price cannot be negative'],
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative'],
    validate: {
      validator: function (v) {
        return v > this.costPrice;
      },
      message: 'Selling price must be greater than cost price',
    },
  },
  category: {
    type: String,
    enum: ['food', 'electronics', 'clothing', 'household', 'other'],
    default: 'other',
  },
  unitType: {
    type: String,
    enum: ['pieces', 'box', 'kg', 'whole sack', 'liter', 'meter', 'pack'],
    default: 'pieces',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative'],
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: [0, 'Low stock threshold cannot be negative'],
  },
  quantity: {
    type: Number,
    default: 0,
    min: [0, 'Quantity cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be a whole number',
    },
  },
  expirationDate: {
    type: Date,
    required: function() {
      // Only required for food items
      return this.category === 'food';
    },
    validate: {
      validator: function (v) {
        // Only validate if it's a food item and value is provided
        if (this.category === 'food' && v) {
          return v instanceof Date && !isNaN(v.getTime());
        }
        return true; // Always valid for non-food items
      },
      message: 'Expiration date must be a valid date',
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Virtual: profit per unit
productSchema.virtual('profitPerUnit').get(function () {
  return this.sellingPrice - this.costPrice;
});

// Virtual: profit margin %
productSchema.virtual('profitMargin').get(function () {
  if (this.sellingPrice === 0) return 0;
  return (((this.sellingPrice - this.costPrice) / this.sellingPrice) * 100).toFixed(1);
});

// Aliases for import/export compatibility (name, price, expiryDate)
productSchema.virtual('name')
  .get(function () { return this.productName; })
  .set(function (value) { this.productName = value; });

productSchema.virtual('price')
  .get(function () { return this.sellingPrice; })
  .set(function (value) { this.sellingPrice = value; });

productSchema.virtual('expiryDate')
  .get(function () { return this.expirationDate; })
  .set(function (value) { this.expirationDate = value; });

// Virtual: expiration status
productSchema.virtual('isExpired').get(function () {
  if (this.category !== 'food' || !this.expirationDate) return false;
  return new Date() > this.expirationDate;
});

// Virtual: days until expiration
productSchema.virtual('daysUntilExpiration').get(function () {
  if (this.category !== 'food' || !this.expirationDate) return null;
  const now = new Date();
  const diffTime = this.expirationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Compound index for fast queries per user
productSchema.index({ userId: 1, productName: 1 });
productSchema.index({ userId: 1, barcode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Product', productSchema);
