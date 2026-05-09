const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
require('dotenv').config();

async function testNotifications() {
  try {
    console.log('🔔 Testing Notification System...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/duka-profit');
    console.log('✅ Connected to MongoDB');

    // Find a test user
    const user = await User.findOne({ email: 'demo@duka.rw' });
    if (!user) {
      console.log('❌ No demo user found');
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.name}`);

    // Create test products for notifications
    const testProducts = [
      {
        userId: user._id,
        productName: 'Low Stock Test Product',
        costPrice: 100,
        sellingPrice: 150,
        category: 'other',
        stock: 5, // Below threshold of 10
        lowStockThreshold: 10
      },
      {
        userId: user._id,
        productName: 'Expiring Soon Product',
        costPrice: 50,
        sellingPrice: 80,
        category: 'food',
        stock: 20,
        expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
      },
      {
        userId: user._id,
        productName: 'Expired Product',
        costPrice: 30,
        sellingPrice: 50,
        category: 'food',
        stock: 15,
        expirationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }
    ];

    // Clear existing test products
    await Product.deleteMany({ 
      userId: user._id, 
      productName: { $in: testProducts.map(p => p.productName) } 
    });

    // Insert test products
    await Product.insertMany(testProducts);
    console.log('✅ Created test products');

    // Test notification API
    console.log('\n📡 Testing notification API...');
    
    const response = await fetch('http://localhost:5000/api/notifications/alerts', {
      headers: {
        'Authorization': `Bearer ${process.env.JWT_SECRET || 'test-token'}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Notification API Response:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.alerts.length > 0) {
        console.log(`\n🎯 Found ${data.alerts.length} alert(s):`);
        data.alerts.forEach((alert, index) => {
          console.log(`  ${index + 1}. ${alert.type}: ${alert.message} (${alert.severity})`);
        });
      } else {
        console.log('⚠️ No alerts found');
      }
    } else {
      console.log('❌ API request failed:', response.status);
    }

    console.log('\n🧹 Cleaning up test data...');
    await Product.deleteMany({ 
      userId: user._id, 
      productName: { $in: testProducts.map(p => p.productName) } 
    });
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  testNotifications();
}

module.exports = testNotifications;
