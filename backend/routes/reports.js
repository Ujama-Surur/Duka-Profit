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

    // Normalize sales data - handle both single-item and checkout sales
    const normalizedSales = [];
    for (const sale of sales) {
      if (sale.items && sale.items.length > 0) {
        // Checkout sale with multiple items - expand into individual sale records
        for (const item of sale.items) {
          normalizedSales.push({
            _id: sale._id,
            createdAt: sale.createdAt,
            productId: item.productId || null,
            productName: item.productName,
            category: item.category || 'other',
            unitType: item.unitType || 'pieces',
            costPrice: item.costPrice,
            sellingPrice: item.unitPrice,
            quantity: item.quantity,
            revenue: item.subtotal,
            profit: (item.unitPrice - item.costPrice) * item.quantity,
            costPriceSnapshot: item.costPrice,
            sellingPriceSnapshot: item.unitPrice,
            paymentMethod: sale.paymentMethod,
            isCheckout: true,
          });
        }
      } else {
        // Single-item sale
        normalizedSales.push({
          ...sale,
          productName: sale.productId?.productName,
          category: sale.productId?.category,
          unitType: sale.productId?.unitType || 'pieces',
          isCheckout: false,
        });
      }
    }

    // Summary
    const totalRevenue = normalizedSales.reduce((sum, s) => sum + s.revenue, 0);
    const totalCost = normalizedSales.reduce((sum, s) => sum + (s.costPriceSnapshot * s.quantity), 0);
    const totalProfit = normalizedSales.reduce((sum, s) => sum + s.profit, 0);
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

    // Chart data based on period
    let chartData = [];

    if (period === 'day') {
      // Hourly breakdown
      for (let h = 0; h < 24; h++) {
        const hourSales = normalizedSales.filter(s => new Date(s.createdAt).getHours() === h);
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
        const daySales = normalizedSales.filter(s =>
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
        const weekSales = normalizedSales.filter(s => {
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
        const monthSales = normalizedSales.filter(s => {
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
    for (const sale of normalizedSales) {
      const pid = sale.productId?._id?.toString() || sale.productName;
      if (!pid) continue;
      if (!productMap[pid]) {
        productMap[pid] = {
          productName: sale.productName,
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

    // Payment method breakdown
    const paymentMethodMap = {};
    for (const sale of normalizedSales) {
      const method = sale.paymentMethod || 'cash';
      if (!paymentMethodMap[method]) {
        paymentMethodMap[method] = {
          revenue: 0,
          profit: 0,
          count: 0,
        };
      }
      paymentMethodMap[method].revenue += sale.revenue;
      paymentMethodMap[method].profit += sale.profit;
      paymentMethodMap[method].count += 1;
    }

    const paymentMethodBreakdown = Object.entries(paymentMethodMap).map(([method, data]) => ({
      method,
      revenue: data.revenue,
      profit: data.profit,
      count: data.count,
    }));

    // Unit type breakdown
    const unitTypeMap = {};
    for (const sale of normalizedSales) {
      const unitType = sale.unitType || 'pieces';
      if (!unitTypeMap[unitType]) {
        unitTypeMap[unitType] = {
          revenue: 0,
          profit: 0,
          count: 0,
        };
      }
      unitTypeMap[unitType].revenue += sale.revenue;
      unitTypeMap[unitType].profit += sale.profit;
      unitTypeMap[unitType].count += 1;
    }

    const unitTypeBreakdown = Object.entries(unitTypeMap).map(([unitType, data]) => ({
      unitType,
      revenue: data.revenue,
      profit: data.profit,
      count: data.count,
    }));

    // Map sales for frontend
    const mappedSales = normalizedSales.map(s => ({
      ...s,
      product: {
        _id: s.productId,
        productName: s.productName,
        category: s.category,
        costPrice: s.costPrice,
        sellingPrice: s.sellingPrice,
      },
    }));

    res.json({
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        salesCount: normalizedSales.length,
        profitMargin,
        period,
        startDate,
        endDate,
      },
      chartData,
      topProducts,
      paymentMethodBreakdown,
      unitTypeBreakdown,
      sales: mappedSales,
    });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ message: 'Failed to generate report.' });
  }
});

module.exports = router;
