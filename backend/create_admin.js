require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Admin User';
  
  if (!email || !password) {
    console.error('Usage: node create_admin.js <email> <password> ["Name"]');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      console.log('User already exists. Promoting to admin and resetting password...');
      existing.role = 'admin';
      existing.password = password;
      await existing.save();
      console.log('Success! Account updated.');
    } else {
      await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: 'admin',
        licenseStatus: 'active',
        isActive: true
      });
      console.log(`Success! Admin account created for ${email}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createAdmin();
