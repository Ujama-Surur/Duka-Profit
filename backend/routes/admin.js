const express = require("express");
const { protect, adminOnly } = require("../middleware/auth");
const License = require("../models/License");
const User = require("../models/User");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const AuditLog = require("../models/AuditLog");

const router = express.Router();

// GET /api/admin/stats - Get dashboard statistics
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const [
      totalUsers,
      totalLicenses,
      activeLicenses,
      usedLicenses,
      expiredLicenses,
      totalProducts,
      totalSales,
      recentSales,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      License.countDocuments(),
      License.countDocuments({ status: "active" }),
      License.countDocuments({ status: "used" }),
      License.countDocuments({ status: "expired" }),
      Product.countDocuments({ isActive: true }),
      Sale.countDocuments(),
      Sale.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("productId", "productName"),
    ]);

    // Calculate revenue
    const salesData = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$revenue" },
          todayRevenue: {
            $sum: {
              $cond: {
                if: {
                  $gte: [
                    "$createdAt",
                    new Date(new Date().setHours(0, 0, 0, 0)),
                  ],
                },
                then: "$revenue",
                else: 0,
              },
            },
          },
          weekRevenue: {
            $sum: {
              $cond: {
                if: {
                  $gte: [
                    "$createdAt",
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  ],
                },
                then: "$revenue",
                else: 0,
              },
            },
          },
          monthRevenue: {
            $sum: {
              $cond: {
                if: {
                  $gte: [
                    "$createdAt",
                    new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      1,
                    ),
                  ],
                },
                then: "$revenue",
                else: 0,
              },
            },
          },
        },
      },
    ]);

    const revenue = salesData[0] || {
      totalRevenue: 0,
      todayRevenue: 0,
      weekRevenue: 0,
      monthRevenue: 0,
    };

    // Recent activity
    const recentActivity = [
      ...recentSales.map((sale) => ({
        type: `Sale: ${sale.productId?.productName || "Unknown"}`,
        date: sale.createdAt,
        amount: sale.revenue,
      })),
      ...(await License.find().sort({ createdAt: -1 }).limit(5)).map(
        (license) => ({
          type: `License created: ${license.key}`,
          date: license.createdAt,
        }),
      ),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

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
        month: revenue.monthRevenue,
      },
      recentActivity,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
});

// GET /api/admin/licenses - Get all licenses with pagination and filtering
router.get("/licenses", protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.key = { $regex: search, $options: "i" };
    }

    const [licenses, total] = await Promise.all([
      License.find(query)
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      License.countDocuments(query),
    ]);

    res.json({
      licenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Licenses error:", err);
    res.status(500).json({ message: "Failed to fetch licenses" });
  }
});

// GET /api/admin/users - Get all users with pagination
router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (status && status !== "all") {
      query.isActive = status === "active";
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// PUT /api/admin/users/:id/status - Activate/deactivate user
router.put("/users/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user,
    });
  } catch (err) {
    console.error("User status update error:", err);
    res.status(500).json({ message: "Failed to update user status" });
  }
});

// PUT /api/admin/licenses/:id/status - Update license status
router.put("/licenses/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const license = await License.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    ).populate("assignedTo", "name email");

    if (!license) {
      return res.status(404).json({ message: "License not found" });
    }

    res.json({
      message: `License status updated to ${status}`,
      license,
    });
  } catch (err) {
    console.error("License status update error:", err);
    res.status(500).json({ message: "Failed to update license status" });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete("/users/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Also delete user's data
    await Promise.all([
      Product.deleteMany({ userId: req.params.id }),
      Sale.deleteMany({ userId: req.params.id }),
      License.updateMany(
        { assignedTo: req.params.id },
        { $unset: { assignedTo: 1 }, status: "active" },
      ),
    ]);

    res.json({ message: "User and associated data deleted successfully" });
  } catch (err) {
    console.error("User deletion error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// ==========================================
// SAAS BILLING & SUBSCRIPTIONS (ADMIN ONLY)
// ==========================================

// GET /api/admin/billing/overview - Overview stats for SaaS billing
router.get("/billing/overview", protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalRevenueData,
      paymentsCount,
      subscriptionsCount,
      activeSubs,
      expiredSubs,
      recentPayments,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "SUCCESS" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            todayRevenue: {
              $sum: {
                $cond: [{ $gte: ["$paidAt", todayStart] }, "$amount", 0],
              },
            },
            monthlyRevenue: {
              $sum: {
                $cond: [{ $gte: ["$paidAt", thirtyDaysAgo] }, "$amount", 0],
              },
            },
          },
        },
      ]),
      Payment.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: "ACTIVE", endDate: { $gt: new Date() } }),
      Subscription.countDocuments({ $or: [{ status: "EXPIRED" }, { endDate: { $lte: new Date() } }] }),
      Payment.find()
        .populate("userId", "name email phone")
        .populate("planId", "name slug")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const revenue = totalRevenueData[0] || { totalRevenue: 0, todayRevenue: 0, monthlyRevenue: 0 };
    const statusCounts = {};
    paymentsCount.forEach((item) => {
      statusCounts[item._id] = item.count;
    });

    res.json({
      success: true,
      revenue: {
        total: revenue.totalRevenue,
        today: revenue.todayRevenue,
        monthly: revenue.monthlyRevenue,
        currency: "RWF",
      },
      subscriptions: {
        total: subscriptionsCount,
        active: activeSubs,
        expired: expiredSubs,
      },
      payments: {
        success: statusCounts.SUCCESS || 0,
        pending: statusCounts.PENDING || 0,
        failed: statusCounts.FAILED || 0,
      },
      recentPayments,
    });
  } catch (err) {
    console.error("Admin billing overview error:", err);
    res.status(500).json({ message: "Failed to load billing overview." });
  }
});

// GET /api/admin/subscriptions - List all subscriptions with pagination and status filter
router.get("/subscriptions", protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      query.userId = { $in: matchingUsers.map((u) => u._id) };
    }

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate("userId", "name email phone")
        .populate("planId", "name slug price currency durationDays")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Subscription.countDocuments(query),
    ]);

    res.json({
      success: true,
      subscriptions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (err) {
    console.error("Admin subscriptions error:", err);
    res.status(500).json({ message: "Failed to fetch subscriptions." });
  }
});

// GET /api/admin/payments - List all payments with pagination and filters
router.get("/payments", protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { transactionReference: { $regex: search, $options: "i" } },
        { providerTransactionId: { $regex: search, $options: "i" } },
      ];
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate("userId", "name email phone")
        .populate("planId", "name slug price currency")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Payment.countDocuments(query),
    ]);

    res.json({
      success: true,
      payments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (err) {
    console.error("Admin payments error:", err);
    res.status(500).json({ message: "Failed to fetch payments." });
  }
});

// POST /api/admin/subscriptions/:id/extend - Manually extend a subscription by N days
router.post("/subscriptions/:id/extend", protect, adminOnly, async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    const now = new Date();
    const baseDate = subscription.endDate > now ? subscription.endDate : now;
    const newEndDate = new Date(baseDate.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

    subscription.endDate = newEndDate;
    subscription.status = "ACTIVE";
    subscription.source = "ADMIN";
    await subscription.save();

    await User.findByIdAndUpdate(subscription.userId, {
      subscriptionStatus: "ACTIVE",
    });

    await AuditLog.create({
      userId: subscription.userId,
      adminId: req.user._id,
      action: "ADMIN_SUBSCRIPTION_CHANGE",
      subscriptionId: subscription._id,
      metadata: { action: "extend", addedDays: days, newEndDate },
    });

    res.json({
      success: true,
      message: `Subscription extended by ${days} days.`,
      subscription,
    });
  } catch (err) {
    console.error("Subscription extend error:", err);
    res.status(500).json({ message: "Failed to extend subscription." });
  }
});

// POST /api/admin/subscriptions/:id/suspend - Manually suspend a subscription
router.post("/subscriptions/:id/suspend", protect, adminOnly, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    subscription.status = "SUSPENDED";
    await subscription.save();

    await User.findByIdAndUpdate(subscription.userId, {
      subscriptionStatus: "SUSPENDED",
    });

    await AuditLog.create({
      userId: subscription.userId,
      adminId: req.user._id,
      action: "ADMIN_SUBSCRIPTION_CHANGE",
      subscriptionId: subscription._id,
      metadata: { action: "suspend" },
    });

    res.json({
      success: true,
      message: "Subscription suspended successfully.",
      subscription,
    });
  } catch (err) {
    console.error("Subscription suspend error:", err);
    res.status(500).json({ message: "Failed to suspend subscription." });
  }
});

// POST /api/admin/subscriptions/:id/cancel - Manually cancel a subscription
router.post("/subscriptions/:id/cancel", protect, adminOnly, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    subscription.status = "CANCELLED";
    subscription.cancelledAt = new Date();
    subscription.cancelReason = req.body.reason || "Cancelled by administrator";
    await subscription.save();

    await User.findByIdAndUpdate(subscription.userId, {
      subscriptionStatus: "CANCELLED",
    });

    await AuditLog.create({
      userId: subscription.userId,
      adminId: req.user._id,
      action: "ADMIN_SUBSCRIPTION_CHANGE",
      subscriptionId: subscription._id,
      metadata: { action: "cancel", reason: subscription.cancelReason },
    });

    res.json({
      success: true,
      message: "Subscription cancelled successfully.",
      subscription,
    });
  } catch (err) {
    console.error("Subscription cancel error:", err);
    res.status(500).json({ message: "Failed to cancel subscription." });
  }
});

// POST /api/admin/subscriptions/:id/change-plan - Manually switch plan
router.post("/subscriptions/:id/change-plan", protect, adminOnly, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found." });
    }

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    subscription.planId = plan._id;
    subscription.status = "ACTIVE";
    subscription.source = "ADMIN";
    await subscription.save();

    await AuditLog.create({
      userId: subscription.userId,
      adminId: req.user._id,
      action: "ADMIN_SUBSCRIPTION_CHANGE",
      subscriptionId: subscription._id,
      metadata: { action: "change_plan", newPlanName: plan.name, newPlanSlug: plan.slug },
    });

    res.json({
      success: true,
      message: `Plan changed to ${plan.name}.`,
      subscription,
    });
  } catch (err) {
    console.error("Subscription plan change error:", err);
    res.status(500).json({ message: "Failed to change plan." });
  }
});

// GET /api/admin/audit-logs - View audit trail
router.get("/audit-logs", protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate("userId", "name email")
        .populate("adminId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (err) {
    console.error("Admin audit logs error:", err);
    res.status(500).json({ message: "Failed to fetch audit logs." });
  }
});

module.exports = router;
