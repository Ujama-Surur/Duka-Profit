require('dotenv').config();
console.log('URI:', process.env.MONGODB_URI);

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log('✅ MongoDB connected!'); process.exit(0); })
  .catch(err => { console.error('❌ Failed:', err.message); process.exit(1); });