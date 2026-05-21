const express = require('express');
const { body, query, param } = require('express-validator');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { premiumOrAdmin } = require('../middleware/premiumAuth');

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

    // Normalize sales data - handle both single-item and checkout sales
    const normalizedSales = [];
    for (const sale of sales) {
      if (sale.items && sale.items.length > 0) {
        // Checkout sale with multiple items - expand into individual sale records
        for (const item of sale.items) {
          normalizedSales.push({
            _id: sale._id,
            createdAt: sale.createdAt,
            productId: item.productId || null,
            productName: item.productName,
            category: item.category || 'other',
            costPrice: item.costPrice,
            sellingPrice: item.unitPrice,
            quantity: item.quantity,
            revenue: item.subtotal,
            profit: (item.unitPrice - item.costPrice) * item.quantity,
            costPriceSnapshot: item.costPrice,
            sellingPriceSnapshot: item.unitPrice,
            paymentMethod: sale.paymentMethod,
            isCheckout: true,
          });
        }
      } else {
        // Single-item sale
        normalizedSales.push({
          ...sale,
          productName: sale.productId?.productName,
          category: sale.productId?.category,
          isCheckout: false,
        });
      }
    }

    // Remap for frontend convenience
    const mapped = normalizedSales.map(s => ({
      ...s,
      product: {
        _id: s.productId,
        productName: s.productName,
        category: s.category,
        costPrice: s.costPrice,
        sellingPrice: s.sellingPrice,
      },
      productId: s.productId,
    }));

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

// POST /api/sales/checkout (multi-item checkout)
router.post('/checkout', premiumOrAdmin, [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('paymentMethod').optional().isIn(['cash', 'card', 'mobile_money']).withMessage('Invalid payment method'),
  validate,
], async (req, res) => {
  try {
    const { items, paymentMethod = 'cash' } = req.body;

    // Verify all products and check stock
    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds }, userId: req.user._id, isActive: true });
    
    if (products.length !== productIds.length) {
      return res.status(404).json({ message: 'One or more products not found.' });
    }

    // Create product map for easy lookup
    const productMap = {};
    products.forEach(p => productMap[p._id.toString()] = p);

    // Validate stock for all items
    for (const item of items) {
      const product = productMap[item.productId];
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.productName}.`,
          availableStock: product.stock,
          requestedQuantity: item.quantity
        });
      }
    }

    // Calculate totals
    let totalAmount = 0;
    let totalProfit = 0;
    const saleItems = items.map(item => {
      const product = productMap[item.productId];
      const subtotal = product.sellingPrice * item.quantity;
      const profit = (product.sellingPrice - product.costPrice) * item.quantity;
      totalAmount += subtotal;
      totalProfit += profit;
      return {
        productId: product._id,
        productName: product.productName,
        quantity: item.quantity,
        unitPrice: product.sellingPrice,
        costPrice: product.costPrice,
        subtotal,
      };
    });

    // Create sale record with all items
    const sale = await Sale.create({
      userId: req.user._id,
      items: saleItems,
      totalAmount,
      totalProfit,
      paymentMethod,
      profit: totalProfit,
      revenue: totalAmount,
    });

    // Reduce stock for all products
    const stockUpdates = items.map(item => ({
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { stock: -item.quantity } }
      }
    }));
    await Product.bulkWrite(stockUpdates);

    res.status(201).json(sale);
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ message: 'Failed to complete checkout.' });
  }
});

// POST /api/sales/batch-sync (sync multiple offline sales)
router.post('/batch-sync', [
  body('sales').isArray().withMessage('Sales must be an array'),
  body('sales.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('sales.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  validate,
], async (req, res) => {
  try {
    const { sales } = req.body;
    const results = [];
    const errors = [];

    // Process each sale
    for (const saleData of sales) {
      try {
        const { productId, quantity } = saleData;

        // Verify product belongs to user and check stock
        const product = await Product.findOne({ _id: productId, userId: req.user._id, isActive: true });
        if (!product) {
          errors.push({ 
            sale: saleData, 
            error: 'Product not found' 
          });
          continue;
        }

        // Validate stock availability
        if (product.stock < quantity) {
          errors.push({ 
            sale: saleData, 
            error: 'Insufficient stock',
            availableStock: product.stock,
            requestedQuantity: quantity
          });
          continue;
        }

        // Create sale
        const sale = await Sale.create({
          userId: req.user._id,
          productId: product._id,
          quantity: parseInt(quantity),
          costPriceSnapshot: product.costPrice,
          sellingPriceSnapshot: product.sellingPrice,
          profit: 0,
          revenue: 0,
        });

        // Reduce product stock
        await Product.findByIdAndUpdate(product._id, { 
          $inc: { stock: -quantity } 
        });

        // Re-fetch with product populated
        const populated = await Sale.findById(sale._id)
          .populate('productId', 'productName category costPrice sellingPrice')
          .lean();

        results.push({ 
          ...populated, 
          product: populated.productId,
          remainingStock: product.stock - quantity
        });
      } catch (err) {
        errors.push({ 
          sale: saleData, 
          error: err.message 
        });
      }
    }

    res.json({ 
      success: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (err) {
    console.error('Batch sync error:', err);
    res.status(500).json({ message: 'Failed to sync sales.' });
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
