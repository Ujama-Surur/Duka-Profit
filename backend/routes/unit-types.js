const express = require('express');
const { body } = require('express-validator');
const UnitType = require('../models/UnitType');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Apply auth protection to all routes
router.use(protect);

// GET all unit types
router.get('/', async (req, res, next) => {
  try {
    const unitTypes = await UnitType.find({ userId: req.user._id }).sort({ name: 1 });
    res.json(unitTypes);
  } catch (err) {
    next(err);
  }
});

// POST create unit type
router.post('/', [
  body('name').trim().notEmpty().withMessage('Unit type name is required').isLength({ max: 50 }).withMessage('Unit type name cannot exceed 50 characters'),
  body('abbreviation').optional().trim().isLength({ max: 10 }).withMessage('Abbreviation cannot exceed 10 characters'),
  validate
], async (req, res, next) => {
  try {
    const { name, abbreviation } = req.body;
    
    // Check if unit type already exists for user
    const existing = await UnitType.findOne({ userId: req.user._id, name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'Unit type with this name already exists' });
    }

    const unitType = new UnitType({
      userId: req.user._id,
      name,
      abbreviation
    });

    await unitType.save();
    res.status(201).json(unitType);
  } catch (err) {
    next(err);
  }
});

// PUT update unit type
router.put('/:id', [
  body('name').trim().notEmpty().withMessage('Unit type name is required').isLength({ max: 50 }).withMessage('Unit type name cannot exceed 50 characters'),
  body('abbreviation').optional().trim().isLength({ max: 10 }).withMessage('Abbreviation cannot exceed 10 characters'),
  validate
], async (req, res, next) => {
  try {
    const { name, abbreviation } = req.body;

    // Check if another unit type has the same name
    const existing = await UnitType.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: req.params.id }
    });
    if (existing) {
      return res.status(400).json({ message: 'Another unit type with this name already exists' });
    }

    const unitType = await UnitType.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, abbreviation },
      { new: true, runValidators: true }
    );

    if (!unitType) {
      return res.status(404).json({ message: 'Unit type not found' });
    }

    res.json(unitType);
  } catch (err) {
    next(err);
  }
});

// DELETE unit type
router.delete('/:id', async (req, res, next) => {
  try {
    const unitType = await UnitType.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!unitType) {
      return res.status(404).json({ message: 'Unit type not found' });
    }
    res.json({ message: 'Unit type deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
