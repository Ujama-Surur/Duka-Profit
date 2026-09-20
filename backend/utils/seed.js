/**
 * Seed script: node backend/utils/seed.js
 * Creates demo user, licenses, and sample data
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const License = require('../models/License');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/duka-profit';

const licenses = [
  { key: 'DUKA-DEMO-2024-FREE', type: 'trial', status: 'active' },
  { key: 'DUKA-STANDARD-001', type: 'standard', status: 'active' },
  { key: 'DUKA-STANDARD-002', type: 'standard', status: 'active' },
  { key: 'DUKA-PREMIUM-001', type: 'premium', status: 'active' },
];

const sampleProducts = [
  { productName: 'Coca Cola 500ml', costPrice: 300, sellingPrice: 500, category: 'food' },
  { productName: 'Fanta Orange 500ml', costPrice: 300, sellingPrice: 500, category: 'food' },
  { productName: 'Bread Loaf', costPrice: 700, sellingPrice: 1000, category: 'food' },
  { productName: 'Milk 500ml', costPrice: 350, sellingPrice: 600, category: 'food' },
  { productName: 'Sugar 1kg', costPrice: 900, sellingPrice: 1200, category: 'food' },
  { productName: 'Rice 1kg', costPrice: 1000, sellingPrice: 1500, category: 'food' },
  { productName: 'Soap Bar', costPrice: 200, sellingPrice: 400, category: 'household' },
  { productName: 'Cooking Oil 500ml', costPrice: 1500, sellingPrice: 2000, category: 'food' },
  { productName: 'Phone Credit 1000', costPrice: 950, sellingPrice: 1000, category: 'electronics' },
  { productName: 'Notebook A4', costPrice: 400, sellingPrice: 700, category: 'other' },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Seed licenses
    for (const lic of licenses) {
      await License.findOneAndUpdate(
        { key: lic.key },
        { ...lic, expiresAt: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000) },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${licenses.length} licenses`);

    console.log('\nSeed complete! Ready for user registration.\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
