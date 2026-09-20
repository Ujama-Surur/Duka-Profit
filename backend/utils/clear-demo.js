const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/duka-profit';

async function clearDemoData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for cleanup');

    // Load models directly from their files to avoid Schema definition errors
    const User = require('../models/User');
    const Product = require('../models/Product');
    const Sale = require('../models/Sale');

    // Find the demo user
    const demoUser = await User.findOne({ email: 'demo@duka.rw' });
    
    if (demoUser) {
      // Delete products and sales associated with the demo user
      const deletedProducts = await Product.deleteMany({ userId: demoUser._id });
      const deletedSales = await Sale.deleteMany({ userId: demoUser._id });
      
      // Delete the demo user
      await User.deleteOne({ _id: demoUser._id });
      
      console.log(`Deleted demo user.`);
      console.log(`Deleted ${deletedProducts.deletedCount} demo products.`);
      console.log(`Deleted ${deletedSales.deletedCount} demo sales.`);
    } else {
      console.log('Demo user not found in the database. No data to clean up.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

clearDemoData();
