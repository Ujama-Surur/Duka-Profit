const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { body, param, query } = require('express-validator');

const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminAuth');
const { validate } = require('../middleware/validate');

const PaymentRequest = require('../models/PaymentRequest');
const Payment = require('../models/Payment');
const License = require('../models/License');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const { plans, getPaymentInstructions } = require('../config/plans');
const { generateLicenseKey } = require('../utils/licenseGenerator');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `receipt-${Date.now()}-${randomName}${safeExt}`);
  },
});

// Multer File Filter: strict image types only
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Only image files (JPEG, PNG, WEBP) are allowed.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
    files: 1,
  },
});

// Rate Limiter for payment requests (max 10 requests per 15 minutes per IP)
const paymentSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many payment requests submitted from this IP. Please wait 15 minutes before trying again.',
  },
});

// Rwandan phone number validation regex: matches +2507XXXXXXXX, 2507XXXXXXXX, or 07XXXXXXXX
const RWANDA_PHONE_REGEX = /^(\+?250|0)?7[2389]\d{7}$/;

// ==========================================
// 1. PUBLIC: PLANS & INSTRUCTIONS
// ==========================================

// GET /api/plans - Public list of plans and payment instructions
router.get('/plans', (req, res) => {
  try {
    const instructions = getPaymentInstructions();
    res.json({
      success: true,
      plans,
      instructions,
    });
  } catch (err) {
    console.error('Failed to fetch plans:', err);
    res.status(500).json({ message: 'Failed to fetch plans.' });
  }
});

// ==========================================
// 2. CUSTOMER ENDPOINTS
// ==========================================

// POST /api/payments - Customer submits manual payment request
router.post(
  '/payments',
  protect,
  paymentSubmitLimiter,
  (req, res, next) => {
    upload.single('screenshot')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Screenshot file size exceeds 2 MB limit.' });
        }
        if (err.code === 'INVALID_FILE_TYPE' || err.message) {
          return res.status(400).json({ message: err.message || 'Invalid file upload.' });
        }
        return res.status(400).json({ message: 'File upload failed.' });
      }
      next();
    });
  },
  [
    body('plan').trim().notEmpty().withMessage('Plan is required.'),
    body('amountPaid')
      .isFloat({ min: 1 })
      .withMessage('Amount paid must be a positive number.'),
    body('network')
      .trim()
      .toUpperCase()
      .isIn(['MTN', 'AIRTEL'])
      .withMessage('Network must be MTN or AIRTEL.'),
    body('transactionId')
      .trim()
      .notEmpty()
      .withMessage('Transaction ID from SMS is required.')
      .isLength({ min: 4, max: 50 })
      .withMessage('Transaction ID must be between 4 and 50 characters.'),
    body('customerName')
      .trim()
      .notEmpty()
      .withMessage('Full name is required.')
      .isLength({ min: 2, max: 100 })
      .withMessage('Customer name must be between 2 and 100 characters.'),
    body('customerPhone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required.')
      .matches(RWANDA_PHONE_REGEX)
      .withMessage('Please enter a valid Rwandan phone number (e.g. 078XXXXXXX or +25078XXXXXXX).'),
    body('reference').optional().trim(),
    validate,
  ],
  async (req, res) => {
    try {
      const {
        plan: planId,
        amountPaid,
        network,
        transactionId,
        customerName,
        customerPhone,
        reference,
      } = req.body;

      // Validate plan exists
      const targetPlan = plans.find((p) => p.slug === planId || p.id === planId);
      if (!targetPlan) {
        return res.status(400).json({ message: `Invalid plan '${planId}'. Please choose a valid plan.` });
      }

      // Check unique transactionId
      const normalizedTxId = String(transactionId).trim().toUpperCase();
      const existing = await PaymentRequest.findOne({ transactionId: normalizedTxId });
      if (existing) {
        return res.status(409).json({
          message: 'This Transaction ID has already been submitted for verification. Each payment receipt can only be used once.',
        });
      }

      // Format unique reference if not provided
      const finalReference = reference
        ? reference.trim().toUpperCase()
        : `DP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // Screenshot URL if uploaded
      const screenshotUrl = req.file ? `/uploads/receipts/${req.file.filename}` : null;

      const paymentRequest = await PaymentRequest.create({
        user: req.user._id,
        plan: targetPlan.slug,
        amountExpected: targetPlan.price,
        amountPaid: parseFloat(amountPaid),
        network: network.toUpperCase(),
        transactionId: normalizedTxId,
        reference: finalReference,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        screenshotUrl,
        status: 'pending',
      });

      res.status(201).json({
        success: true,
        message: 'Payment request submitted successfully! Your payment is pending review.',
        paymentRequest,
      });
    } catch (err) {
      console.error('Payment request creation error:', err);
      // Clean up uploaded file if DB failed
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      if (err.code === 11000) {
        return res.status(409).json({
          message: 'This Transaction ID has already been submitted.',
        });
      }
      res.status(500).json({ message: 'Failed to submit payment request.' });
    }
  }
);

// GET /api/payments/mine - Customer views their own payment requests
router.get('/payments/mine', protect, async (req, res) => {
  try {
    const requests = await PaymentRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('licenseId', 'key expiresAt status deviceId activatedAt')
      .lean();

    res.json({
      success: true,
      requests,
    });
  } catch (err) {
    console.error('Failed to fetch customer payment requests:', err);
    res.status(500).json({ message: 'Failed to fetch payment requests.' });
  }
});

// ==========================================
// 3. ADMIN ENDPOINTS
// ==========================================

// GET /api/admin/payments - Admin views all payment requests
router.get(
  '/admin/payments',
  protect,
  adminOnly,
  [
    query('status').optional().isIn(['all', 'pending', 'approved', 'rejected']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim(),
    validate,
  ],
  async (req, res) => {
    try {
      const { status = 'all', page = 1, limit = 50, search } = req.query;
      const filter = {};
      if (status && status !== 'all') {
        filter.status = status;
      }
      if (search) {
        filter.$or = [
          { transactionId: { $regex: search, $options: 'i' } },
          { reference: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { customerPhone: { $regex: search, $options: 'i' } },
        ];
      }

      const legacyQuery = search
        ? {
            $or: [
              { transactionReference: { $regex: search, $options: 'i' } },
              { providerTransactionId: { $regex: search, $options: 'i' } },
            ],
          }
        : {};

      const skip = (page - 1) * limit;

      const [requests, total, pendingCount, legacyPayments] = await Promise.all([
        PaymentRequest.find(filter)
          .populate('user', 'name email phone storeName')
          .populate('reviewedBy', 'name email')
          .populate('licenseId', 'key status expiresAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PaymentRequest.countDocuments(filter),
        PaymentRequest.countDocuments({ status: 'pending' }),
        Payment.find(legacyQuery)
          .populate('userId', 'name email phone')
          .populate('planId', 'name slug price currency')
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean()
          .catch(() => []),
      ]);

      res.json({
        success: true,
        requests,
        pendingCount,
        payments: legacyPayments || [],
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      });
    } catch (err) {
      console.error('Admin fetch payments error:', err);
      res.status(500).json({ message: 'Failed to fetch payment requests.' });
    }
  }
);

// PATCH /api/admin/payments/:id/approve - Admin approves request and issues license key
router.patch(
  '/admin/payments/:id/approve',
  protect,
  adminOnly,
  [param('id').isMongoId().withMessage('Valid payment request ID is required.'), validate],
  async (req, res) => {
    try {
      const request = await PaymentRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: 'Payment request not found.' });
      }

      // Idempotency: cannot approve twice
      if (request.status === 'approved') {
        return res.status(400).json({
          message: 'Payment request has already been approved. Cannot approve twice.',
          licenseKey: request.licenseKey,
        });
      }

      // Find plan details
      const planConfig = plans.find((p) => p.slug === request.plan || p.id === request.plan);
      const durationDays = planConfig?.durationDays || 30;
      const planType = request.plan === 'yearly' ? 'premium' : 'standard';

      // Generate unique crypto license key
      let licenseKey;
      let attempts = 0;
      while (attempts < 10) {
        licenseKey = generateLicenseKey();
        const exists = await License.findOne({ key: licenseKey });
        if (!exists) break;
        attempts++;
      }

      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      // Create License
      const license = await License.create({
        key: licenseKey,
        type: planType,
        status: 'active',
        assignedTo: request.user,
        plan: request.plan,
        paymentRequest: request._id,
        expiresAt,
      });

      // Update PaymentRequest
      request.status = 'approved';
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      request.licenseId = license._id;
      request.licenseKey = license.key;
      request.rejectReason = null;
      await request.save();

      // Update User license fields
      await User.findByIdAndUpdate(request.user, {
        licenseKey: license.key,
        licenseStatus: 'active',
        subscriptionStatus: 'ACTIVE',
      });

      // Audit Log
      await AuditLog.create({
        userId: request.user,
        adminId: req.user._id,
        action: 'ADMIN_PAYMENT_APPROVE',
        metadata: {
          paymentRequestId: request._id,
          plan: request.plan,
          transactionId: request.transactionId,
          amountPaid: request.amountPaid,
          licenseKey: license.key,
          adminEmail: req.user.email,
        },
      });

      // Email Notification (if configured)
      try {
        const customer = await User.findById(request.user);
        if (customer?.email) {
          await sendEmail({
            email: customer.email,
            subject: 'Your DukaProfit License Key is Ready! 🎉',
            message: `Hello ${request.customerName},\n\nYour payment of ${request.amountPaid.toLocaleString()} RWF for the ${planConfig?.name || request.plan} plan has been verified and approved!\n\nYour License Key: ${license.key}\nValid Until: ${expiresAt.toDateString()}\n\nTo activate your copy:\n1. Open DukaProfit\n2. Go to Settings or the Activation Screen\n3. Enter your License Key: ${license.key}\n\nThank you for choosing DukaProfit to grow your business!`,
          });
        }
      } catch (emailErr) {
        console.warn('Could not send license key email:', emailErr.message);
      }

      res.json({
        success: true,
        message: `Payment approved! License key ${license.key} generated and linked to customer.`,
        license: {
          key: license.key,
          status: license.status,
          expiresAt: license.expiresAt,
          plan: license.plan,
        },
        paymentRequest: request,
      });
    } catch (err) {
      console.error('Payment approval error:', err);
      res.status(500).json({ message: 'Failed to approve payment request.' });
    }
  }
);

// PATCH /api/admin/payments/:id/reject - Admin rejects request with optional reason
router.patch(
  '/admin/payments/:id/reject',
  protect,
  adminOnly,
  [
    param('id').isMongoId().withMessage('Valid payment request ID is required.'),
    body('reason').optional().trim(),
    validate,
  ],
  async (req, res) => {
    try {
      const request = await PaymentRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: 'Payment request not found.' });
      }

      if (request.status === 'approved') {
        return res.status(400).json({
          message: 'Cannot reject an already approved payment request that has an active license.',
        });
      }

      const rejectReason = req.body.reason?.trim() || 'Payment details could not be verified on statement.';

      request.status = 'rejected';
      request.rejectReason = rejectReason;
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      await request.save();

      // Audit Log
      await AuditLog.create({
        userId: request.user,
        adminId: req.user._id,
        action: 'ADMIN_PAYMENT_REJECT',
        metadata: {
          paymentRequestId: request._id,
          plan: request.plan,
          transactionId: request.transactionId,
          rejectReason,
          adminEmail: req.user.email,
        },
      });

      // Email Notification (if configured)
      try {
        const customer = await User.findById(request.user);
        if (customer?.email) {
          await sendEmail({
            email: customer.email,
            subject: 'Update Regarding Your DukaProfit Payment Request',
            message: `Hello ${request.customerName},\n\nWe could not verify your payment request (Transaction ID: ${request.transactionId}).\n\nReason: ${rejectReason}\n\nPlease check your mobile money SMS statement and submit a new request, or contact support if you believe this is an error.\n\nThank you,\nDukaProfit Team`,
          });
        }
      } catch (emailErr) {
        console.warn('Could not send rejection email:', emailErr.message);
      }

      res.json({
        success: true,
        message: 'Payment request rejected.',
        paymentRequest: request,
      });
    } catch (err) {
      console.error('Payment rejection error:', err);
      res.status(500).json({ message: 'Failed to reject payment request.' });
    }
  }
);

module.exports = router;
