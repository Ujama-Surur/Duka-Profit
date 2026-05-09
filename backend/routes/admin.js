const express = require('express');
const { protect, admin } = require('../middleware/auth');
const License = require('../models/License');
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

const router = express.Router();

// GET /api/admin/stats - Get dashboard statistics
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalLicenses,
      activeLicenses,
      usedLicenses,
      expiredLicenses,
      totalProducts,
      totalSales,
      recentSales
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      License.countDocuments(),
      License.countDocuments({ status: 'active' }),
      License.countDocuments({ status: 'used' }),
      License.countDocuments({ status: 'expired' }),
      Product.countDocuments({ isActive: true }),
      Sale.countDocuments(),
      Sale.find().sort({ createdAt: -1 }).limit(10).populate('productId', 'productName')
    ]);

    // Calculate revenue
    const salesData = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$revenue' },
          todayRevenue: {
            $sum: {
              $cond: {
                if: { $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                then: '$revenue',
                else: 0
              }
            }
          },
          weekRevenue: {
            $sum: {
              $cond: {
                if: { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                then: '$revenue',
                else: 0
              }
            }
          },
          monthRevenue: {
            $sum: {
              $cond: {
                if: { $gte: ['$createdAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1)] },
                then: '$revenue',
                else: 0
              }
            }
          }
        }
      }
    ]);

    const revenue = salesData[0] || {
      totalRevenue: 0,
      todayRevenue: 0,
      weekRevenue: 0,
      monthRevenue: 0
    };

    // Recent activity
    const recentActivity = [
      ...recentSales.map(sale => ({
        type: `Sale: ${sale.productId?.productName || 'Unknown'}`,
        date: sale.createdAt,
        amount: sale.revenue
      })),
      ...(await License.find().sort({ createdAt: -1 }).limit(5)).map(license => ({
        type: `License created: ${license.key}`,
        date: license.createdAt
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    res.json({
      totalUsers,
      totalLicenses,
      activeLicenses,
      usedLicenses,
      expiredLicenses,
      totalProducts,
      totalSales,
      revenue: {
        total: revenue.totalRevenue,
        today: revenue.todayRevenue,
        week: revenue.weekRevenue,
        month: revenue.monthRevenue
      },
      recentActivity
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/licenses - Get all licenses with pagination and filtering
router.get('/licenses', protect, admin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.key = { $regex: search, $options: 'i' };
    }

    const [licenses, total] = await Promise.all([
      License.find(query)
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      License.countDocuments(query)
    ]);

    res.json({
      licenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Licenses error:', err);
    res.status(500).json({ message: 'Failed to fetch licenses' });
  }
});

// GET /api/admin/users - Get all users with pagination
router.get('/users', protect, admin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id/status - Activate/deactivate user
router.put('/users/:id/status', protect, admin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (err) {
    console.error('User status update error:', err);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

// PUT /api/admin/licenses/:id/status - Update license status
router.put('/licenses/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const license = await License.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('assignedTo', 'name email');

    if (!license) {
      return res.status(404).json({ message: 'License not found' });
    }

    res.json({
      message: `License status updated to ${status}`,
      license
    });
  } catch (err) {
    console.error('License status update error:', err);
    res.status(500).json({ message: 'Failed to update license status' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Also delete user's data
    await Promise.all([
      Product.deleteMany({ userId: req.params.id }),
      Sale.deleteMany({ userId: req.params.id }),
      License.updateMany(
        { assignedTo: req.params.id },
        { $unset: { assignedTo: 1 }, status: 'active' }
      )
    ]);

    res.json({ message: 'User and associated data deleted successfully' });
  } catch (err) {
    console.error('User deletion error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;
