const express = require('express');
const { body, query, param } = require('express-validator');
const Transaction = require('../models/Transaction');
const Sale = require('../models/Sale');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Apply auth middleware to all financial endpoints
router.use(protect);

// One-time backward compatibility seeding helper
async function seedHistoricalTransactions(userId) {
  try {
    const count = await Transaction.countDocuments({ userId });
    if (count > 0) return; // Has transactions, no need to seed

    console.log(`[Finance Seeder] Seeding historical records for user: ${userId}...`);

    // 1. Migrate Sales to Income
    const sales = await Sale.find({ userId })
      .populate('productId', 'productName')
      .lean();
    
    const saleTransactions = [];
    for (const sale of sales) {
      const isCreditUnpaid = sale.paymentMethod === 'credit' && sale.paymentStatus === 'unpaid';
      const type = isCreditUnpaid ? 'debit_waiting' : 'income';

      if (sale.items && sale.items.length > 0) {
        saleTransactions.push({
          userId,
          type,
          amount: sale.totalAmount || sale.revenue || 0,
          category: 'sales',
          source: 'sale',
          referenceId: sale._id,
          description: `Checkout sale #${sale._id} (${sale.items.length} items)`,
          date: sale.createdAt || new Date(),
        });
      } else {
        const prodName = sale.productId?.productName || 'Unknown Product';
        saleTransactions.push({
          userId,
          type,
          amount: sale.revenue || 0,
          category: 'sales',
          source: 'sale',
          referenceId: sale._id,
          description: `Sale of ${prodName} (x${sale.quantity || 1})`,
          date: sale.createdAt || new Date(),
        });
      }
    }

    // 2. Migrate Approved Orders to Expenses
    const orders = await Order.find({ userId, status: 'approved' }).lean();
    const orderTransactions = orders.map(order => ({
      userId,
      type: 'expense',
      amount: order.totalBuyingCost || 0,
      category: 'replenishment',
      source: 'order',
      referenceId: order._id,
      description: `Approved stock replenishment order ${order.orderNumber}`,
      date: order.approvedAt || order.createdAt || new Date(),
    }));

    const allTransactions = [...saleTransactions, ...orderTransactions];
    if (allTransactions.length > 0) {
      await Transaction.insertMany(allTransactions);
      console.log(`[Finance Seeder] Seeding finished. Inserted ${allTransactions.length} items.`);
    }
  } catch (err) {
    console.error('[Finance Seeder] Seeding error:', err.message);
  }
}

// GET /api/transactions
router.get('/', [
  query('from').optional().isISO8601().withMessage('Invalid start date format'),
  query('to').optional().isISO8601().withMessage('Invalid end date format'),
  query('type').optional().isIn(['income', 'expense', 'debit_waiting']).withMessage('Invalid transaction type'),
  query('category').optional().trim(),
  query('minAmount').optional().isFloat({ min: 0 }).toFloat(),
  query('maxAmount').optional().isFloat({ min: 0 }).toFloat(),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['date_desc', 'date_asc', 'amount_desc', 'amount_asc']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  validate,
], async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Run historical migration seeder
    await seedHistoricalTransactions(userId);

    const { from, to, type, category, minAmount, maxAmount, search, sortBy = 'date_desc', page = 1, limit = 50 } = req.query;

    const filter = { userId };

    // Date range filter
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Category filter
    if (category) {
      filter.category = new RegExp(category, 'i');
    }

    // Amount bounds filter
    if (minAmount !== undefined || maxAmount !== undefined) {
      filter.amount = {};
      if (minAmount !== undefined) filter.amount.$gte = minAmount;
      if (maxAmount !== undefined) filter.amount.$lte = maxAmount;
    }

    // Keyword search in memo
    if (search) {
      filter.description = new RegExp(search, 'i');
    }

    // Sorting rule configuration
    let sortRule = { date: -1 };
    if (sortBy === 'date_asc') sortRule = { date: 1 };
    else if (sortBy === 'amount_desc') sortRule = { amount: -1 };
    else if (sortBy === 'amount_asc') sortRule = { amount: 1 };

    const skip = (page - 1) * limit;

    // Fetch matching logs and aggregation statistics
    const [transactions, totalCount, allUserTransactions] = await Promise.all([
      Transaction.find(filter).sort(sortRule).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(filter),
      Transaction.find({ userId }).lean() // to calculate global metrics
    ]);

    // Calculate aggregated metrics (Global / All time)
    let totalIncome = 0;
    let totalExpense = 0;
    let totalReceivables = 0;
    allUserTransactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount || 0;
      else if (t.type === 'expense') totalExpense += t.amount || 0;
      else if (t.type === 'debit_waiting') totalReceivables += t.amount || 0;
    });

    res.json({
      transactions,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalIncome,
        totalExpense,
        totalReceivables,
        netCashFlow: totalIncome - totalExpense,
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/transactions/:id/pay
router.patch('/:id/pay', [
  param('id').isMongoId().withMessage('Invalid transaction ID'),
  validate,
], async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (transaction.type !== 'debit_waiting') {
      return res.status(400).json({ message: 'Only transactions waiting for payment can be marked as paid.' });
    }

    // Update the transaction type to 'income'
    transaction.type = 'income';
    transaction.description = `[PAID] ${transaction.description}`;
    await transaction.save();

    // If it has a referenceId pointing to a Sale, update the Sale's paymentStatus to 'paid'
    if (transaction.referenceId && transaction.source === 'sale') {
      await Sale.findOneAndUpdate(
        { _id: transaction.referenceId, userId: req.user._id },
        { paymentStatus: 'paid' }
      );
    }

    res.json({ message: 'Transaction marked as paid successfully.', transaction });
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions
router.post('/', [
  body('type').isIn(['income', 'expense']).withMessage('Transaction type must be income or expense'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Memo description cannot exceed 500 characters'),
  body('date').optional({ values: 'falsy' }).isISO8601().withMessage('Must be a valid ISO8601 date'),
  validate,
], async (req, res, next) => {
  try {
    const { type, amount, category, description, date } = req.body;

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      amount: parseFloat(amount),
      category: category.toLowerCase(),
      source: 'manual',
      description: description || `Manual ${type} entry`,
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/transactions/:id  (void a manual transaction)
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid transaction ID'),
  validate,
], async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (transaction.source !== 'manual') {
      return res.status(400).json({ message: 'Only manual transactions can be deleted. Sales or Replenishment transactions are managed by their original files.' });
    }

    await transaction.deleteOne();
    res.json({ message: 'Manual transaction record voided successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
