const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
require('dotenv').config();

async function createTestProduct() {
  try {
    console.log('🧪 Creating Test Product for Notifications...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/duka-profit');
    console.log('✅ Connected to MongoDB');

    // Find demo user
    const user = await User.findOne({ email: 'demo@duka.rw' });
    if (!user) {
      console.log('❌ No demo user found');
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.name}`);

    // Create a test product with low stock
    const testProduct = {
      userId: user._id,
      productName: 'Test Low Stock Item',
      costPrice: 50,
      sellingPrice: 75,
      category: 'other',
      stock: 5, // Below threshold of 10
      lowStockThreshold: 10
    };

    // Remove existing test product
    await Product.deleteOne({ 
      userId: user._id, 
      productName: testProduct.productName 
    });

    // Insert test product
    const product = await Product.create(testProduct);
    console.log('✅ Created test product:');
    console.log(`   Name: ${product.productName}`);
    console.log(`   Stock: ${product.stock}`);
    console.log(`   Threshold: ${product.lowStockThreshold}`);
    console.log(`   Status: ${product.stock <= product.lowStockThreshold ? 'LOW STOCK' : 'Normal'}`);

    console.log('\n📱 Test Instructions:');
    console.log('1. Refresh your browser');
    console.log('2. You should see a 🔔 notification bell in the sidebar');
    console.log('3. Click the bell to see low stock alert');
    console.log('4. Make a sale of this product to test stock reduction');
    console.log('5. Stock should decrease and notification should update');

    console.log('\n✅ Test product created successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  createTestProduct();
}

module.exports = createTestProduct;
