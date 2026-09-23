const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Plan slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'RWF',
      uppercase: true,
      trim: true,
    },
    durationDays: {
      type: Number,
      required: [true, 'Duration in days is required'],
      min: [0, 'Duration cannot be negative'],
    },
    billingCycle: {
      type: String,
      enum: ['free', 'monthly', 'quarterly', 'yearly', 'lifetime'],
      default: 'monthly',
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    featureLabels: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    popular: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Helper static method to seed default plans if empty
subscriptionPlanSchema.statics.seedDefaultPlans = async function () {
  const defaultPlans = [
    {
      name: 'Free Starter',
      slug: 'free',
      description: 'Essential product and sales tracking for small shops starting out.',
      price: 0,
      currency: 'RWF',
      durationDays: 3650, // effectively indefinite free tier
      billingCycle: 'free',
      features: ['PRODUCTS', 'BASIC_INVENTORY', 'SALES'],
      featureLabels: [
        'Up to 30 products',
        'Basic stock & inventory view',
        'Manual sales recording',
        'Standard single-user access',
      ],
      isActive: true,
      popular: false,
      sortOrder: 1,
    },
    {
      name: 'Monthly Pro',
      slug: 'monthly',
      description: 'Complete point-of-sale checkout, barcode scanning, and instant profit calculations.',
      price: 5000,
      currency: 'RWF',
      durationDays: 30,
      billingCycle: 'monthly',
      features: [
        'PRODUCTS',
        'BASIC_INVENTORY',
        'SALES',
        'CHECKOUT',
        'STOCK_IN',
        'BARCODE',
        'PROFIT_REPORTS',
        'FINANCE',
        'EXPORT',
      ],
      featureLabels: [
        'Unlimited products & categories',
        'High-speed POS Checkout with receipt printing',
        'Barcode scanner & wireless mobile phone pairing',
        'Real-time gross profit & margin reports',
        'Expense tracking & cash flow ledger',
        'Excel & PDF report exports',
      ],
      isActive: true,
      popular: true,
      sortOrder: 2,
    },
    {
      name: 'Quarterly Pro',
      slug: 'quarterly',
      description: '3 months of complete Pro access with 20% discount for growing businesses.',
      price: 12000,
      currency: 'RWF',
      durationDays: 90,
      billingCycle: 'quarterly',
      features: [
        'PRODUCTS',
        'BASIC_INVENTORY',
        'SALES',
        'CHECKOUT',
        'STOCK_IN',
        'BARCODE',
        'PROFIT_REPORTS',
        'FINANCE',
        'EXPORT',
        'ADVANCED_REPORTS',
      ],
      featureLabels: [
        'All Monthly Pro features included',
        'Save 3,000 RWF (20% discount)',
        '3 months uninterrupted access',
        'Advanced monthly financial analytics',
        'Priority customer support',
      ],
      isActive: true,
      popular: false,
      sortOrder: 3,
    },
    {
      name: 'Annual VIP',
      slug: 'yearly',
      description: 'Full year of unlimited Duka Profit features with maximum savings and cloud sync.',
      price: 35000,
      currency: 'RWF',
      durationDays: 365,
      billingCycle: 'yearly',
      features: [
        'PRODUCTS',
        'BASIC_INVENTORY',
        'SALES',
        'CHECKOUT',
        'STOCK_IN',
        'BARCODE',
        'PROFIT_REPORTS',
        'FINANCE',
        'EXPORT',
        'ADVANCED_REPORTS',
        'CLOUD_BACKUP',
        'MULTI_USER',
      ],
      featureLabels: [
        'All Pro & Advanced features for 1 full year',
        'Best Value: Save over 40% annually',
        'Automatic cloud backup protection',
        'Multi-user cashier permissions',
        'Dedicated WhatsApp VIP support',
      ],
      isActive: true,
      popular: false,
      sortOrder: 4,
    },
  ];

  for (const planData of defaultPlans) {
    await this.findOneAndUpdate(
      { slug: planData.slug },
      { $setOnInsert: planData },
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
