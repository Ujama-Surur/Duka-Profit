const express = require('express');
const { body } = require('express-validator');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Apply auth protection to all routes
router.use(protect);

// GET all categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find({ userId: req.user._id }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// POST create category
router.post('/', [
  body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 100 }).withMessage('Category name cannot exceed 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  validate
], async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    // Check if category already exists for user
    const existing = await Category.findOne({ userId: req.user._id, name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = new Category({
      userId: req.user._id,
      name,
      description
    });

    await category.save();
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

// PUT update category
router.put('/:id', [
  body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 100 }).withMessage('Category name cannot exceed 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  validate
], async (req, res, next) => {
  try {
    const { name, description } = req.body;

    // Check if another category has the same name
    const existing = await Category.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: req.params.id }
    });
    if (existing) {
      return res.status(400).json({ message: 'Another category with this name already exists' });
    }

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, description },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (err) {
    next(err);
  }
});

// DELETE category
router.delete('/:id', async (req, res, next) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
