const mongoose = require('mongoose');

const unitTypeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Unit type name is required'],
    trim: true,
    maxlength: [50, 'Unit type name cannot exceed 50 characters'],
  },
  abbreviation: {
    type: String,
    trim: true,
    maxlength: [10, 'Abbreviation cannot exceed 10 characters'],
  },
}, {
  timestamps: true,
});

unitTypeSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('UnitType', unitTypeSchema);
