const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  type: {
    type: String,
    enum: ['trial', 'standard', 'premium'],
    default: 'standard',
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'suspended'],
    default: 'active',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  deviceId: {
    type: String,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  },
  maxDevices: {
    type: Number,
    default: 1,
  },
  activatedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Seed default demo license
licenseSchema.statics.seedDemo = async function () {
  const exists = await this.findOne({ key: 'DUKA-DEMO-2024-FREE' });
  if (!exists) {
    await this.create({
      key: 'DUKA-DEMO-2024-FREE',
      type: 'trial',
      status: 'active',
      expiresAt: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
    });
    console.log('Demo license seeded: DUKA-DEMO-2024-FREE');
  }
};

module.exports = mongoose.model('License', licenseSchema);
