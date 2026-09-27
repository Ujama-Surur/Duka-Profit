const express = require('express');
const { body, param } = require('express-validator');
const multer = require('multer');
const Product = require('../models/Product');
const { importProductsCsv } = require('../controllers/productImportController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(new Error('Only CSV files are supported.'));
    }
    cb(null, true);
  },
});
const importUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ message: err.message || 'Invalid upload file.' });
    }
    next();
  });
};

// All routes protected
router.use(protect);

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user._id, isActive: true })
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch products.' });
  }
});

// GET /api/products/low-stock
router.get('/low-stock', async (req, res) => {
  try {
    const products = await Product.find({ 
      userId: req.user._id, 
      isActive: true,
      $expr: { $lt: ['$stock', '$lowStockThreshold'] }
    })
      .sort({ stock: 1 })
      .lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch low stock products.' });
  }
});

// GET /api/products/barcode/:code
router.get('/barcode/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code) {
      return res.status(400).json({ message: 'Barcode is required.' });
    }

    const product = await Product.findOne({
      userId: req.user._id,
      barcode: code,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({ found: false, message: 'Product not found' });
    }

    res.json({ found: true, product });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product by barcode.' });
  }
});

// POST /api/products
router.post('/', [
  body('productName').trim().notEmpty().withMessage('Product name is required').isLength({ max: 200 }),
  body('barcode').optional({ values: 'falsy' }).trim().isLength({ max: 200 }).withMessage('Barcode is too long'),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('sellingPrice').optional().isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('expirationDate').optional({ values: 'falsy' }).isISO8601().withMessage('Expiration date must be a valid date'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('unitType').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('pricingMode').optional().isIn(['fixed', 'currency_linked', 'replacement_protected']),
  body('currency').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 3 }),
  body('baseCost').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('purchaseExchangeRate').optional({ values: 'falsy' }).isFloat({ gt: 0 }),
  body('targetMargin').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  validate,
], async (req, res) => {
  try {
    const { 
      productName, 
      barcode, 
      costPrice = 0, 
      sellingPrice = 0, 
      quantity = 0, 
      expirationDate, 
      stock = 0, 
      lowStockThreshold = 10, 
      category, 
      unitType, 
      productImageUrl,
      pricingMode = 'fixed',
      currency,
      baseCost,
      purchaseExchangeRate,
      targetMargin = 15,
    } = req.body;

    const parsedCost = parseFloat(costPrice || 0);
    const parsedSell = parseFloat(sellingPrice || 0);
    const parsedBaseCost = (baseCost !== undefined && baseCost !== null && baseCost !== '') ? parseFloat(baseCost) : 0;
    const parsedPurchaseRate = (purchaseExchangeRate !== undefined && purchaseExchangeRate !== null && purchaseExchangeRate !== '') ? parseFloat(purchaseExchangeRate) : 1;
    const parsedTargetMargin = (targetMargin !== undefined && targetMargin !== null && targetMargin !== '') ? parseFloat(targetMargin) : 15;

    // If baseCost and purchaseExchangeRate are provided, ensure local cost is aligned
    let finalCost = parsedCost;
    if (finalCost === 0 && parsedBaseCost > 0 && parsedPurchaseRate > 0) {
      finalCost = Math.round(parsedBaseCost * parsedPurchaseRate * 100) / 100;
    }

    if (parsedSell > 0 && parsedSell <= finalCost) {
      return res.status(400).json({ message: 'Selling price must be higher than cost price.' });
    }
    if ((category || 'other').toLowerCase() === 'food' && !expirationDate && parsedSell > 0) {
      return res.status(400).json({ message: 'Expiration date is required for food items.' });
    }

    // Get currency settings to determine current rate and replacement cost
    const exchangeRateService = require('../services/exchangeRateService');
    const settings = await exchangeRateService.getCurrencySettings(req.user._id);
    const productCurrency = currency ? currency.toUpperCase() : (settings.baseCurrency || 'USD');
    const sellingCurrency = settings.sellingCurrency || 'SSP';

    let currentReplacementCost = 0;
    let suggestedSellingPrice = 0;
    let priceReviewRequired = false;

    if (parsedBaseCost > 0) {
      const activeRate = await exchangeRateService.getCurrentRate(req.user._id, productCurrency, sellingCurrency);
      const effectiveRate = activeRate?.rate || parsedPurchaseRate;
      currentReplacementCost = exchangeRateService.roundPrice(parsedBaseCost * effectiveRate, settings.roundingRule);
      suggestedSellingPrice = exchangeRateService.roundPrice(currentReplacementCost * (1 + parsedTargetMargin / 100), settings.roundingRule);

      if (pricingMode !== 'fixed') {
        if (parsedSell > 0 && parsedSell < currentReplacementCost) {
          priceReviewRequired = true;
        } else if (pricingMode === 'currency_linked' && parsedSell > 0 && parsedSell !== suggestedSellingPrice) {
          priceReviewRequired = true;
        }
      }
    }

    // If selling price was 0 but suggested selling price was calculated, optionally initialize it
    const finalSellingPrice = parsedSell > 0 ? parsedSell : suggestedSellingPrice;

    const productData = {
      userId: req.user._id,
      productName,
      ...(barcode ? { barcode: String(barcode).trim() } : {}),
      costPrice: finalCost,
      sellingPrice: finalSellingPrice,
      quantity: parseInt(quantity || 0),
      stock: parseInt(quantity || 0),
      lowStockThreshold: parseInt(lowStockThreshold || 10),
      category: category || 'other',
      unitType: unitType || 'pieces',
      productImageUrl,
      pricingMode,
      currency: parsedBaseCost > 0 ? productCurrency : null,
      baseCost: parsedBaseCost,
      purchaseExchangeRate: parsedPurchaseRate,
      currentReplacementCost,
      suggestedSellingPrice,
      targetMargin: parsedTargetMargin,
      priceReviewRequired,
    };
    
    // Only add expirationDate if provided and it's a food item
    if (expirationDate && category?.toLowerCase() === 'food') {
      productData.expirationDate = new Date(expirationDate);
    }
    
    const product = await Product.create(productData);

    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern?.barcode) {
        return res.status(400).json({ message: 'A product with this barcode already exists.' });
      }
      return res.status(400).json({ message: 'A product with this name already exists.' });
    }
    res.status(500).json({ message: 'Failed to create product.' });
  }
});

// PUT /api/products/:id
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('productName').optional().trim().notEmpty().isLength({ max: 200 }),
  body('barcode').optional({ values: 'falsy' }).trim().isLength({ max: 200 }).withMessage('Barcode is too long'),
  body('costPrice').optional().isFloat({ min: 0 }),
  body('sellingPrice').optional().isFloat({ min: 0 }),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('expirationDate').optional({ values: 'falsy' }).isISO8601().withMessage('Expiration date must be a valid date'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('unitType').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('pricingMode').optional().isIn(['fixed', 'currency_linked', 'replacement_protected']),
  body('currency').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 3 }),
  body('baseCost').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('purchaseExchangeRate').optional({ values: 'falsy' }).isFloat({ gt: 0 }),
  body('targetMargin').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('priceReviewRequired').optional().isBoolean(),
  validate,
], async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const { 
      productName, 
      barcode, 
      costPrice, 
      sellingPrice, 
      quantity, 
      expirationDate, 
      stock, 
      lowStockThreshold, 
      category, 
      unitType, 
      productImageUrl,
      pricingMode,
      currency,
      baseCost,
      purchaseExchangeRate,
      targetMargin,
      priceReviewRequired,
    } = req.body;

    const newCost = costPrice !== undefined ? parseFloat(costPrice) : product.costPrice;
    const newSell = sellingPrice !== undefined ? parseFloat(sellingPrice) : product.sellingPrice;

    // Validate sellingPrice > costPrice only when prices are explicitly being modified or provided
    if ((costPrice !== undefined || sellingPrice !== undefined) && !(newSell === 0 && newCost === 0) && newSell <= newCost) {
      return res.status(400).json({ message: 'Selling price must be higher than cost price.' });
    }

    const oldSellingPrice = product.sellingPrice;

    if (productName !== undefined) product.productName = productName;
    if (barcode !== undefined) product.barcode = barcode ? String(barcode).trim() : undefined;
    if (costPrice !== undefined) product.costPrice = newCost;
    if (sellingPrice !== undefined) product.sellingPrice = newSell;
    if (quantity !== undefined) product.quantity = parseInt(quantity);
    if (unitType !== undefined) product.unitType = unitType;
    if (productImageUrl !== undefined) product.productImageUrl = productImageUrl;
    if (pricingMode !== undefined) product.pricingMode = pricingMode;
    if (currency !== undefined) product.currency = currency ? currency.toUpperCase() : null;
    if (baseCost !== undefined) product.baseCost = (baseCost === null || baseCost === '') ? 0 : parseFloat(baseCost);
    if (purchaseExchangeRate !== undefined) product.purchaseExchangeRate = (purchaseExchangeRate === null || purchaseExchangeRate === '') ? 1 : parseFloat(purchaseExchangeRate);
    if (targetMargin !== undefined) product.targetMargin = (targetMargin === null || targetMargin === '') ? 15 : parseFloat(targetMargin);
    if (priceReviewRequired !== undefined) product.priceReviewRequired = Boolean(priceReviewRequired);

    // Recalculate replacement cost & suggested price if base cost is present
    if (product.baseCost > 0) {
      const exchangeRateService = require('../services/exchangeRateService');
      const settings = await exchangeRateService.getCurrencySettings(req.user._id);
      const productCurr = product.currency || settings.baseCurrency || 'USD';
      const activeRate = await exchangeRateService.getCurrentRate(req.user._id, productCurr, settings.sellingCurrency || 'SSP');
      const effectiveRate = activeRate?.rate || product.purchaseExchangeRate || 1;

      product.currentReplacementCost = exchangeRateService.roundPrice(product.baseCost * effectiveRate, settings.roundingRule);
      product.suggestedSellingPrice = exchangeRateService.roundPrice(
        product.currentReplacementCost * (1 + (product.targetMargin || 15) / 100),
        settings.roundingRule
      );

      if (product.pricingMode !== 'fixed') {
        product.priceReviewRequired = product.sellingPrice < product.currentReplacementCost;
      }
    }
    
    // Only update expirationDate if provided and it's a food item
    const targetCategory = category !== undefined ? category : product.category;
    if (expirationDate !== undefined) {
      if (expirationDate && targetCategory?.toLowerCase() === 'food') {
        product.expirationDate = new Date(expirationDate);
      }
    }
    if (category !== undefined) product.category = category;
    if (product.category?.toLowerCase() !== 'food') {
      product.expirationDate = undefined;
    } else if (!product.expirationDate && expirationDate === undefined && !product.expirationDate) {
      return res.status(400).json({ message: 'Expiration date is required for food items.' });
    }
    
    if (stock !== undefined) product.stock = parseInt(stock);
    if (lowStockThreshold !== undefined) product.lowStockThreshold = parseInt(lowStockThreshold);

    await product.save();

    // If selling price was manually updated, create an audit record
    if (sellingPrice !== undefined && oldSellingPrice !== newSell) {
      const PriceChangeHistory = require('../models/PriceChangeHistory');
      await PriceChangeHistory.create({
        userId: req.user._id,
        productId: product._id,
        productName: product.productName,
        previousSellingPrice: oldSellingPrice,
        newSellingPrice: newSell,
        costPrice: product.costPrice,
        replacementCost: product.currentReplacementCost,
        exchangeRate: product.purchaseExchangeRate,
        currencyPair: `${product.currency || 'USD'}/LOCAL`,
        reason: 'Manual edit in product catalog',
        changedBy: req.user._id,
        changedAt: new Date(),
      }).catch(e => console.error('PriceChangeHistory log error:', e));
    }

    res.json(product);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.barcode) {
      return res.status(400).json({ message: 'A product with this barcode already exists.' });
    }
    res.status(500).json({ message: 'Failed to update product.' });
  }
});

// POST /api/products/import (CSV file upload)
router.post('/import', importUpload, importProductsCsv);

// DELETE /api/products/:id
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid product ID'),
  validate,
], async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    // Soft delete to preserve sales history
    product.isActive = false;
    await product.save();

    res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product.' });
  }
});

module.exports = router;
