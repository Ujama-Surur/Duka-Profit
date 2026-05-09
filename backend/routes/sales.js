const express = require('express');
const { body, query, param } = require('express-validator');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

// GET /api/sales
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  validate,
], async (req, res) => {
  try {
    const { limit = 50, page = 1, from, to } = req.query;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate('productId', 'productName category costPrice sellingPrice')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sale.countDocuments(filter),
    ]);

    // Remap productId -> product for frontend convenience
    const mapped = sales.map(s => ({ ...s, product: s.productId, productId: s.productId?._id }));

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sales.' });
  }
});

// POST /api/sales
router.post('/', [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  validate,
], async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Verify product belongs to user and check stock
    const product = await Product.findOne({ _id: productId, userId: req.user._id, isActive: true });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    // Validate stock availability
    if (product.stock < quantity) {
      return res.status(400).json({ 
        message: 'Insufficient stock.',
        availableStock: product.stock,
        requestedQuantity: quantity
      });
    }

    // Create sale
    const sale = await Sale.create({
      userId: req.user._id,
      productId: product._id,
      quantity: parseInt(quantity),
      costPriceSnapshot: product.costPrice,
      sellingPriceSnapshot: product.sellingPrice,
      profit: 0,   // calculated in pre-save
      revenue: 0,  // calculated in pre-save
    });

    // Reduce product stock
    await Product.findByIdAndUpdate(product._id, { 
      $inc: { stock: -quantity } 
    });

    // Re-fetch with product populated
    const populated = await Sale.findById(sale._id)
      .populate('productId', 'productName category costPrice sellingPrice')
      .lean();

    res.status(201).json({ 
      ...populated, 
      product: populated.productId,
      remainingStock: product.stock - quantity
    });
  } catch (err) {
    console.error('Sale error:', err);
    res.status(500).json({ message: 'Failed to record sale.' });
  }
});

// DELETE /api/sales/:id  (void a sale)
router.delete('/:id', [
  param('id').isMongoId(),
  validate,
], async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sale) return res.status(404).json({ message: 'Sale not found.' });

    // Only allow deleting sales from today
    const today = new Date();
    const saleDate = new Date(sale.createdAt);
    if (saleDate.toDateString() !== today.toDateString()) {
      return res.status(400).json({ message: 'Can only void sales from today.' });
    }

    await sale.deleteOne();
    res.json({ message: 'Sale voided successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to void sale.' });
  }
});

module.exports = router;
