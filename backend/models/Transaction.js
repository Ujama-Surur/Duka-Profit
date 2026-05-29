const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['income', 'expense', 'debit_waiting'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative'],
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  source: {
    type: String,
    enum: ['sale', 'order', 'manual'],
    default: 'manual',
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  date: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

// Indexing for faster reporting query lookup
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
