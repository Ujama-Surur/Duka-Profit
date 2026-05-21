const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { query } = require('express-validator');
const { validate } = require('../middleware/validate');
const User = require('../models/User');

const router = express.Router();

// GET /api/admin/users - Get all users with pagination
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken -emailVerificationExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Failed to get users.' });
  }
});

// PUT /api/admin/users/:id/activate - Activate user
router.put('/users/:id/activate', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'User activated successfully.' });
  } catch (err) {
    console.error('Activate user error:', err);
    res.status(500).json({ message: 'Failed to activate user.' });
  }
});

// PUT /api/admin/users/:id/deactivate - Deactivate user
router.put('/users/:id/deactivate', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'User deactivated successfully.' });
  } catch (err) {
    console.error('Deactivate user error:', err);
    res.status(500).json({ message: 'Failed to deactivate user.' });
  }
});



// GET /api/admin/stats - Get admin dashboard statistics
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsers,
        newThisWeek: newUsersThisWeek
      }
    });
  } catch (err) {
    console.error('Get admin stats error:', err);
    res.status(500).json({ message: 'Failed to get admin statistics.' });
  }
});

module.exports = router;