const express = require("express");
const { protect, adminOnly } = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// GET /api/users - Get all users (admin only)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

module.exports = router;
