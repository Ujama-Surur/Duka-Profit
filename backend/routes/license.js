const express = require("express");
const { body } = require("express-validator");
const License = require("../models/License");
const { protect, adminOnly } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { generateLicenseKey } = require("../utils/licenseGenerator");
const { activateLicense } = require("../controllers/licenseController");

const router = express.Router();

// POST /api/license/verify  — public endpoint for pre-registration check
router.post(
  "/verify",
  [
    body("key").trim().notEmpty().withMessage("License key is required"),
    validate,
  ],
  async (req, res) => {
    try {
      const { key, deviceId } = req.body;
      const license = await License.findOne({ key: key.toUpperCase() });

      if (!license) {
        return res
          .status(404)
          .json({ valid: false, message: "License key not found." });
      }

      if (license.status === "expired" || new Date() > license.expiresAt) {
        return res
          .status(400)
          .json({ valid: false, message: "License has expired." });
      }

      if (license.status === "suspended") {
        return res
          .status(400)
          .json({ valid: false, message: "License has been suspended." });
      }

      // If already used and bound to a different device, reject
      if (
        license.status === "used" &&
        license.deviceId &&
        deviceId &&
        license.deviceId !== deviceId
      ) {
        return res.status(400).json({
          valid: false,
          message: "This license is bound to a different device.",
        });
      }

      res.json({
        valid: true,
        type: license.type,
        expiresAt: license.expiresAt,
        message: "License is valid.",
      });
    } catch (err) {
      res
        .status(500)
        .json({ valid: false, message: "License verification failed." });
    }
  },
);

// POST /api/license/activate — activate a license on a device
router.post(
  "/activate",
  [
    body("key").trim().notEmpty().withMessage("License key is required"),
    body("machineId").trim().notEmpty().withMessage("machineId is required"),
    validate,
  ],
  activateLicense,
);

// GET /api/license/status  — for authenticated user to check their own license
router.get("/status", protect, async (req, res) => {
  try {
    const license = await License.findOne({ key: req.user.licenseKey });

    if (!license) {
      return res.json({ status: "not_found", valid: false });
    }

    const isExpired = new Date() > license.expiresAt;

    res.json({
      status: isExpired ? "expired" : license.status,
      valid: !isExpired && license.status === "used",
      type: license.type,
      expiresAt: license.expiresAt,
      activatedAt: license.activatedAt,
      deviceId: license.deviceId,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to check license status." });
  }
});

// POST /api/license/periodic-check — called periodically by the app
router.post("/periodic-check", protect, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const license = await License.findOne({ key: req.user.licenseKey });

    if (!license) {
      return res
        .status(403)
        .json({ allowed: false, message: "License not found." });
    }

    if (new Date() > license.expiresAt) {
      return res
        .status(403)
        .json({ allowed: false, message: "License expired." });
    }

    if (license.status === "suspended") {
      return res
        .status(403)
        .json({ allowed: false, message: "License suspended." });
    }

    // Device binding check
    if (deviceId && license.deviceId && license.deviceId !== deviceId) {
      return res
        .status(403)
        .json({
          allowed: false,
          message: "Device mismatch. License bound to another device.",
        });
    }

    // Update device if not bound yet
    if (deviceId && !license.deviceId) {
      license.deviceId = deviceId;
      await license.save();
    }

    res.json({ allowed: true, expiresAt: license.expiresAt });
  } catch (err) {
    res.status(500).json({ message: "Check failed." });
  }
});

// GET /api/license/all - Get all licenses (admin only)
router.get("/all", protect, adminOnly, async (req, res) => {
  try {
    const licenses = await License.find()
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.json(licenses);
  } catch (err) {
    console.error("Failed to fetch all licenses:", err);
    res.status(500).json({ message: "Failed to fetch licenses" });
  }
});

// POST /api/license/create - Generate new license key (admin only)
router.post(
  "/create",
  protect,
  adminOnly,
  [
    body("type")
      .optional()
      .isIn(["trial", "standard", "premium"])
      .withMessage("Invalid license type"),
    body("expiresInDays")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Expires in days must be positive"),
    validate,
  ],
  async (req, res) => {
    try {
      const { type = "standard", expiresInDays } = req.body;

      // Generate unique license key
      let licenseKey;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        licenseKey = generateLicenseKey();
        const existing = await License.findOne({ key: licenseKey });
        if (!existing) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return res
          .status(500)
          .json({ message: "Failed to generate unique license key" });
      }

      // Calculate expiry date
      let expiresAt;
      if (expiresInDays) {
        expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
      } else {
        // Default: 1 year from now
        expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      // Create license
      const license = await License.create({
        key: licenseKey,
        type,
        expiresAt,
        status: "active",
      });

      console.log(`License key generated: ${licenseKey} (${type})`);

      res.status(201).json({
        key: license.key,
        type: license.type,
        status: license.status,
        expiresAt: license.expiresAt,
        createdAt: license.createdAt,
      });
    } catch (err) {
      console.error("License creation error:", err);
      res.status(500).json({ message: "Failed to create license key" });
    }
  },
);

// Admin: seed a new license (for development/testing only)
if (process.env.NODE_ENV === "development") {
  router.post("/seed", async (req, res) => {
    try {
      const { key, type = "standard" } = req.body;
      const license = await License.create({ key: key.toUpperCase(), type });
      res.status(201).json(license);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
}

module.exports = router;
