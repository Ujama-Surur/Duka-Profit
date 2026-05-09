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
  body('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('expirationDate').optional({ values: 'falsy' }).isISO8601().withMessage('Expiration date must be a valid date'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
  body('category').optional().isIn(['food', 'electronics', 'clothing', 'household', 'other']),
  validate,
], async (req, res) => {
  try {
    const { productName, barcode, costPrice, sellingPrice, quantity, expirationDate, stock, lowStockThreshold, category } = req.body;

    if (parseFloat(sellingPrice) <= parseFloat(costPrice)) {
      return res.status(400).json({ message: 'Selling price must be higher than cost price.' });
    }
    if ((category || 'other') === 'food' && !expirationDate) {
      return res.status(400).json({ message: 'Expiration date is required for food items.' });
    }

    const productData = {
      userId: req.user._id,
      productName,
      ...(barcode ? { barcode: String(barcode).trim() } : {}),
      costPrice: parseFloat(costPrice),
      sellingPrice: parseFloat(sellingPrice),
      quantity: parseInt(quantity),
      stock: parseInt(quantity) || 0,  // Use quantity as initial stock
      lowStockThreshold: parseInt(lowStockThreshold) || 10,
      category: category || 'other',
    };
    
    // Only add expirationDate if provided and it's a food item
    if (expirationDate && category === 'food') {
      productData.expirationDate = new Date(expirationDate);
    }
    
    console.log('Creating product with data:', productData);
    
    const product = await Product.create(productData);
    
    console.log('Product created successfully:', product);

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
  body('category').optional().isIn(['food', 'electronics', 'clothing', 'household', 'other']),
  validate,
], async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const { productName, barcode, costPrice, sellingPrice, quantity, expirationDate, stock, lowStockThreshold, category } = req.body;

    const newCost = parseFloat(costPrice ?? product.costPrice);
    const newSell = parseFloat(sellingPrice ?? product.sellingPrice);

    if (newSell <= newCost) {
      return res.status(400).json({ message: 'Selling price must be higher than cost price.' });
    }

    if (productName !== undefined) product.productName = productName;
    if (barcode !== undefined) product.barcode = barcode ? String(barcode).trim() : undefined;
    if (costPrice !== undefined) product.costPrice = newCost;
    if (sellingPrice !== undefined) product.sellingPrice = newSell;
    if (quantity !== undefined) product.quantity = parseInt(quantity);
    
    // Only update expirationDate if provided and it's a food item
    if (expirationDate !== undefined) {
      if (expirationDate && (category || product.category) === 'food') {
        product.expirationDate = new Date(expirationDate);
      }
    }
    if (category !== undefined) product.category = category;
    if (product.category !== 'food') {
      product.expirationDate = undefined;
    } else if (!product.expirationDate) {
      return res.status(400).json({ message: 'Expiration date is required for food items.' });
    }
    
    if (stock !== undefined) product.stock = parseInt(stock);
    if (lowStockThreshold !== undefined) product.lowStockThreshold = parseInt(lowStockThreshold);

    await product.save();
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
