const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply auth protection to all routes
router.use(protect);

// GET all orders for the user
router.get('/', async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET single order
router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id }).populate('items.product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// POST create order
router.post('/', async (req, res, next) => {
  try {
    const { items, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    const orderItems = items.map(item => ({
      product: item.product,
      productName: item.productName,
      quantity: parseInt(item.quantity) || 1,
      buyingPrice: parseFloat(item.buyingPrice) || 0,
      sellingPrice: parseFloat(item.sellingPrice) || 0,
      purchaseCurrency: item.purchaseCurrency ? String(item.purchaseCurrency).toUpperCase() : undefined,
      baseCost: item.baseCost ? parseFloat(item.baseCost) : undefined,
      exchangeRate: item.exchangeRate ? parseFloat(item.exchangeRate) : 1,
      barcode: item.barcode,
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
    }));

    const order = new Order({
      userId: req.user._id,
      items: orderItems,
      notes,
    });

    await order.save();
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// PUT approve order
router.put('/:id/approve', async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: `Cannot approve order with status: ${order.status}` });
    }

    const exchangeRateService = require('../services/exchangeRateService');
    const settings = await exchangeRateService.getCurrencySettings(req.user._id);

    // Process order items to update products stock and prices
    for (const item of order.items) {
      const product = await Product.findOne({ _id: item.product, userId: req.user._id });
      if (product) {
        product.stock = (product.stock || 0) + item.quantity;
        product.quantity = product.stock; // keep in sync
        product.costPrice = item.buyingPrice;
        product.sellingPrice = item.sellingPrice;

        if (item.purchaseCurrency) product.currency = item.purchaseCurrency;
        if (item.baseCost) product.baseCost = item.baseCost;
        if (item.exchangeRate) product.purchaseExchangeRate = item.exchangeRate;

        // Recalculate replacement cost if product has baseCost
        if (product.baseCost > 0) {
          const currentRate = await exchangeRateService.getCurrentRate(
            req.user._id,
            product.currency || 'USD',
            settings.sellingCurrency || 'SSP'
          );
          const effectiveRate = currentRate?.rate || product.purchaseExchangeRate || 1;
          product.currentReplacementCost = exchangeRateService.roundPrice(
            product.baseCost * effectiveRate,
            settings.roundingRule
          );
          product.suggestedSellingPrice = exchangeRateService.roundPrice(
            product.currentReplacementCost * (1 + (product.targetMargin || 15) / 100),
            settings.roundingRule
          );
          if (product.pricingMode !== 'fixed') {
            product.priceReviewRequired = product.sellingPrice < product.currentReplacementCost;
          }
        }
        
        if (item.expiryDate) {
          product.expirationDate = item.expiryDate;
        }
        
        await product.save();
      }
    }

    order.status = 'approved';
    order.approvedAt = new Date();
    order.approvedBy = req.user._id;

    await order.save();

    // Create automatic Financial expense transaction log
    const Transaction = require('../models/Transaction');
    await Transaction.create({
      userId: req.user._id,
      type: 'expense',
      amount: order.totalBuyingCost || 0,
      category: 'replenishment',
      source: 'order',
      referenceId: order._id,
      description: `Approved stock replenishment order ${order.orderNumber}`,
      date: order.approvedAt || new Date(),
    });

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// PUT reject order
router.put('/:id/reject', async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: `Cannot reject order with status: ${order.status}` });
    }

    order.status = 'rejected';
    order.rejectedAt = new Date();
    order.rejectionReason = rejectionReason;

    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// DELETE order
router.delete('/:id', async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be deleted' });
    }

    await Order.deleteOne({ _id: req.params.id });
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
