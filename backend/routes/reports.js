const express = require('express');
const { query } = require('express-validator');
const {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  format, subDays,
} = require('date-fns');
const Sale = require('../models/Sale');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

// GET /api/reports?period=day|week|month|year
router.get('/', [
  query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Invalid period'),
  validate,
], async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const userId = req.user._id;
    const now = new Date();

    // Determine date range
    let startDate, endDate;
    switch (period) {
      case 'day':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
    }

    // Fetch all sales in range
    const sales = await Sale.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate('productId', 'productName category costPrice sellingPrice')
      .sort({ createdAt: -1 })
      .lean();

    // Summary
    const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
    const totalCost = sales.reduce((sum, s) => sum + (s.costPriceSnapshot * s.quantity), 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

    // Chart data based on period
    let chartData = [];

    if (period === 'day') {
      // Hourly breakdown
      for (let h = 0; h < 24; h++) {
        const hourSales = sales.filter(s => new Date(s.createdAt).getHours() === h);
        chartData.push({
          label: `${h.toString().padStart(2, '0')}:00`,
          revenue: hourSales.reduce((sum, s) => sum + s.revenue, 0),
          profit: hourSales.reduce((sum, s) => sum + s.profit, 0),
        });
      }
    } else if (period === 'week') {
      // Daily for the week
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      for (const day of days) {
        const daySales = sales.filter(s =>
          new Date(s.createdAt).toDateString() === day.toDateString()
        );
        chartData.push({
          label: format(day, 'EEE'),
          revenue: daySales.reduce((sum, s) => sum + s.revenue, 0),
          profit: daySales.reduce((sum, s) => sum + s.profit, 0),
        });
      }
    } else if (period === 'month') {
      // Weekly buckets
      for (let week = 1; week <= 5; week++) {
        const weekStart = new Date(startDate);
        weekStart.setDate((week - 1) * 7 + 1);
        const weekEnd = new Date(startDate);
        weekEnd.setDate(week * 7);
        const weekSales = sales.filter(s => {
          const d = new Date(s.createdAt);
          return d >= weekStart && d <= weekEnd;
        });
        if (weekSales.length > 0 || week <= 4) {
          chartData.push({
            label: `Week ${week}`,
            revenue: weekSales.reduce((sum, s) => sum + s.revenue, 0),
            profit: weekSales.reduce((sum, s) => sum + s.profit, 0),
          });
        }
      }
    } else if (period === 'year') {
      // Monthly
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      for (const month of months) {
        const monthSales = sales.filter(s => {
          const d = new Date(s.createdAt);
          return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
        });
        chartData.push({
          label: format(month, 'MMM'),
          revenue: monthSales.reduce((sum, s) => sum + s.revenue, 0),
          profit: monthSales.reduce((sum, s) => sum + s.profit, 0),
        });
      }
    }

    // Top products
    const productMap = {};
    for (const sale of sales) {
      const pid = sale.productId?._id?.toString();
      if (!pid) continue;
      if (!productMap[pid]) {
        productMap[pid] = {
          productName: sale.productId.productName,
          totalProfit: 0,
          totalRevenue: 0,
          totalSold: 0,
        };
      }
      productMap[pid].totalProfit += sale.profit;
      productMap[pid].totalRevenue += sale.revenue;
      productMap[pid].totalSold += sale.quantity;
    }

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 5);

    // Map sales for frontend
    const mappedSales = sales.map(s => ({ ...s, product: s.productId }));

    res.json({
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        salesCount: sales.length,
        profitMargin,
        period,
        startDate,
        endDate,
      },
      chartData,
      topProducts,
      sales: mappedSales,
    });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ message: 'Failed to generate report.' });
  }
});

module.exports = router;
