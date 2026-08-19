const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: [300, 'Expense reason cannot exceed 300 characters'],
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Expense amount cannot be negative'],
  },
}, { _id: false });

const dailyReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
  },
  openingAmount: {
    type: Number,
    required: true,
    min: [0, 'Opening amount cannot be negative'],
    default: 0,
  },
  cash: {
    notes5000: { type: Number, default: 0, min: 0 },
    notes2000: { type: Number, default: 0, min: 0 },
    notes1000: { type: Number, default: 0, min: 0 },
    notes500: { type: Number, default: 0, min: 0 },
    coins: { type: Number, default: 0, min: 0 },
  },
  momoAmounts: {
    type: [Number],
    default: [],
  },
  expenses: {
    type: [expenseSchema],
    default: [],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

dailyReportSchema.index({ userId: 1, date: -1 });
dailyReportSchema.index({ userId: 1, date: 1 }, { unique: true });

dailyReportSchema.virtual('currentCash').get(function () {
  const c = this.cash || {};
  return (
    (c.notes5000 || 0) * 5000 +
    (c.notes2000 || 0) * 2000 +
    (c.notes1000 || 0) * 1000 +
    (c.notes500 || 0) * 500 +
    (c.coins || 0)
  );
});

dailyReportSchema.virtual('momoTotal').get(function () {
  return (this.momoAmounts || []).reduce((sum, n) => sum + (Number(n) || 0), 0);
});

dailyReportSchema.virtual('expensesTotal').get(function () {
  return (this.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
});

// Formula: current cash + momo + expenses - opening
dailyReportSchema.virtual('dayTotal').get(function () {
  return this.currentCash + this.momoTotal + this.expensesTotal - (this.openingAmount || 0);
});

function computeTotals(doc) {
  const cash = doc.cash || {};
  const currentCash =
    (cash.notes5000 || 0) * 5000 +
    (cash.notes2000 || 0) * 2000 +
    (cash.notes1000 || 0) * 1000 +
    (cash.notes500 || 0) * 500 +
    (cash.coins || 0);
  const momoTotal = (doc.momoAmounts || []).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const expensesTotal = (doc.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const dayTotal = currentCash + momoTotal + expensesTotal - (doc.openingAmount || 0);
  return { currentCash, momoTotal, expensesTotal, dayTotal };
}

dailyReportSchema.methods.toReportJSON = function () {
  const obj = this.toObject({ virtuals: true });
  const totals = computeTotals(obj);
  return { ...obj, ...totals };
};

module.exports = mongoose.model('DailyReport', dailyReportSchema);
