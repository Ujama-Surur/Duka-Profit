const express = require('express');
const { startOfDay, endOfDay, addDays } = require('date-fns');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/notifications/alerts - Get active alerts
router.get('/alerts', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const alerts = [];

    // Check for low stock products
    const lowStockProducts = await Product.find({
      userId,
      isActive: true,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    }).lean();

    if (lowStockProducts.length > 0) {
      alerts.push({
        type: 'low_stock',
        severity: lowStockProducts.some(p => p.stock === 0) ? 'critical' : 'warning',
        message: `${lowStockProducts.length} product(s) running low on stock`,
        count: lowStockProducts.length,
        products: lowStockProducts.map(p => ({
          id: p._id,
          name: p.productName,
          currentStock: p.stock,
          threshold: p.lowStockThreshold
        }))
      });
    }

    // Check for expiring products (next 7 days)
    const sevenDaysFromNow = addDays(now, 7);
    const expiringProducts = await Product.find({
      userId,
      isActive: true,
      category: 'food',
      expirationDate: {
        $gte: startOfDay(now),
        $lte: endOfDay(sevenDaysFromNow)
      }
    }).lean();

    if (expiringProducts.length > 0) {
      const criticalExpiring = expiringProducts.filter(p => {
        const daysUntil = p.daysUntilExpiration;
        return daysUntil <= 3; // Critical if expiring in 3 days or less
      });

      alerts.push({
        type: 'expiring',
        severity: criticalExpiring.length > 0 ? 'critical' : 'warning',
        message: `${expiringProducts.length} food product(s) expiring soon`,
        count: expiringProducts.length,
        products: expiringProducts.map(p => ({
          id: p._id,
          name: p.productName,
          expirationDate: p.expirationDate,
          daysUntil: p.daysUntilExpiration
        }))
      });
    }

    // Check for expired products
    const expiredProducts = await Product.find({
      userId,
      isActive: true,
      category: 'food',
      expirationDate: { $lt: startOfDay(now) }
    }).lean();

    if (expiredProducts.length > 0) {
      alerts.push({
        type: 'expired',
        severity: 'critical',
        message: `${expiredProducts.length} food product(s) have expired`,
        count: expiredProducts.length,
        products: expiredProducts.map(p => ({
          id: p._id,
          name: p.productName,
          expirationDate: p.expirationDate
        }))
      });
    }

    res.json({
      alerts,
      hasAlerts: alerts.length > 0,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length
    });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ message: 'Failed to load notifications.' });
  }
});

// GET /api/notifications/summary - Get notification counts
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Get counts for each alert type
    const [lowStockCount, expiringCount, expiredCount] = await Promise.all([
      // Low stock count
      Product.countDocuments({
        userId,
        isActive: true,
        $expr: { $lte: ['$stock', '$lowStockThreshold'] }
      }),
      
      // Expiring count (next 7 days)
      Product.countDocuments({
        userId,
        isActive: true,
        category: 'food',
        expirationDate: {
          $gte: startOfDay(now),
          $lte: endOfDay(addDays(now, 7))
        }
      }),
      
      // Expired count
      Product.countDocuments({
        userId,
        isActive: true,
        category: 'food',
        expirationDate: { $lt: startOfDay(now) }
      })
    ]);

    res.json({
      lowStock: lowStockCount,
      expiring: expiringCount,
      expired: expiredCount,
      totalAlerts: lowStockCount + expiringCount + expiredCount
    });
  } catch (err) {
    console.error('Notification summary error:', err);
    res.status(500).json({ message: 'Failed to load notification summary.' });
  }
});

module.exports = router;
