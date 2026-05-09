const express = require('express');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } = require('date-fns');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Date ranges
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));

    // Run aggregations in parallel
    const [todaySales, yesterdaySales, weeklySales, monthlySales, recentSales, bestProduct] = await Promise.all([
      // Today
      Sale.aggregate([
        { $match: { userId, createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, totalProfit: { $sum: '$profit' }, count: { $sum: 1 } } },
      ]),
      // Yesterday
      Sale.aggregate([
        { $match: { userId, createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } } },
        { $group: { _id: null, totalProfit: { $sum: '$profit' } } },
      ]),
      // This week
      Sale.aggregate([
        { $match: { userId, createdAt: { $gte: weekStart, $lte: weekEnd } } },
        { $group: { _id: null, totalProfit: { $sum: '$profit' } } },
      ]),
      // This month
      Sale.aggregate([
        { $match: { userId, createdAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, totalProfit: { $sum: '$profit' } } },
      ]),
      // Recent sales (today only, up to 10)
      Sale.find({ userId, createdAt: { $gte: todayStart, $lte: todayEnd } })
        .populate('productId', 'productName category')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      // Best selling product this month
      Sale.aggregate([
        { $match: { userId, createdAt: { $gte: monthStart } } },
        { $group: { _id: '$productId', totalProfit: { $sum: '$profit' }, totalSold: { $sum: '$quantity' } } },
        { $sort: { totalProfit: -1 } },
        { $limit: 1 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
      ]),
    ]);

    const todayProfit = todaySales[0]?.totalProfit || 0;
    const yesterdayProfit = yesterdaySales[0]?.totalProfit || 0;
    const todayChange = yesterdayProfit > 0
      ? Math.round(((todayProfit - yesterdayProfit) / yesterdayProfit) * 100)
      : 0;

    // Build 7-day chart data
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const [daySales] = await Sale.aggregate([
        { $match: { userId, createdAt: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, profit: { $sum: '$profit' } } },
      ]);

      chartData.push({
        day: format(date, 'EEE'),
        date: format(date, 'MMM d'),
        profit: daySales?.profit || 0,
      });
    }

    // Map recent sales for frontend
    const mappedRecent = recentSales.map(s => ({
      ...s,
      product: s.productId,
    }));

    res.json({
      stats: {
        todayProfit,
        todayChange,
        todaySalesCount: todaySales[0]?.count || 0,
        weeklyProfit: weeklySales[0]?.totalProfit || 0,
        monthlyProfit: monthlySales[0]?.totalProfit || 0,
        bestProduct: bestProduct[0] ? {
          name: bestProduct[0].product.productName,
          profit: bestProduct[0].totalProfit,
          sold: bestProduct[0].totalSold,
        } : null,
      },
      chartData,
      recentSales: mappedRecent,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Failed to load dashboard.' });
  }
});

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user._id;

    // Run aggregations in parallel
    const [salesAgg, productsCount, lowStockCount] = await Promise.all([
      // Total sales and profit
      Sale.aggregate([
        { $match: { userId } },
        { 
          $group: { 
            _id: null, 
            totalSales: { $sum: '$revenue' }, 
            totalProfit: { $sum: '$profit' },
            totalTransactions: { $sum: 1 }
          } 
        }
      ]),
      // Total products count
      Product.countDocuments({ userId, isActive: true }),
      // Low stock products count
      Product.countDocuments({ 
        userId, 
        isActive: true,
        $expr: { $lt: ['$stock', '$lowStockThreshold'] }
      }),
    ]);

    const summary = {
      totalSales: salesAgg[0]?.totalSales || 0,
      totalProfit: salesAgg[0]?.totalProfit || 0,
      totalProducts: productsCount,
      lowStockProducts: lowStockCount,
      totalTransactions: salesAgg[0]?.totalTransactions || 0,
    };

    res.json(summary);
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ message: 'Failed to load dashboard summary.' });
  }
});

module.exports = router;
