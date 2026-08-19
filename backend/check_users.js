require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/duka-profit');
    console.log('Connected to MongoDB\n');

    const users = await User.find().select('+password').sort({ createdAt: -1 });

    if (users.length === 0) {
      console.log('No users found.');
    } else {
      console.log(`Found ${users.length} user(s):\n`);
      for (const u of users) {
        console.log(`- ${u.email}`);
        console.log(`  name: ${u.name}`);
        console.log(`  role: ${u.role}`);
        console.log(`  license: ${u.licenseStatus}`);
        console.log(`  active: ${u.isActive}`);
        console.log(`  id: ${u._id}`);
        console.log('');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
