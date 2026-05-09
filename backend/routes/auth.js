const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body } = require('express-validator');
const User = require('../models/User');
const License = require('../models/License');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('licenseKey').optional({ checkFalsy: true }).trim(),
  validate,
], async (req, res) => {
  try {
    const { name, email, password, licenseKey, deviceId } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    let finalLicenseKey = null;
    let finalLicenseStatus = 'unlicensed';
    let license = null;

    if (licenseKey) {
      // Validate license
      license = await License.findOne({ key: licenseKey.toUpperCase() });
      if (!license) {
        return res.status(400).json({ message: 'Invalid license key. Please check and try again.' });
      }
      if (license.status === 'expired') {
        return res.status(400).json({ message: 'This license key has expired.' });
      }
      if (license.status === 'suspended') {
        return res.status(400).json({ message: 'This license key has been suspended.' });
      }
      if (license.status === 'used' && !license.assignedTo) {
        return res.status(400).json({ message: 'This license key is already in use.' });
      }
      finalLicenseKey = licenseKey.toUpperCase();
      finalLicenseStatus = 'active';
    }

    // Create user
    const user = await User.create({ name, email, password, licenseKey: finalLicenseKey, licenseStatus: finalLicenseStatus, deviceId });

    if (license) {
      // Mark license as used
      license.status = 'used';
      license.assignedTo = user._id;
      license.deviceId = deviceId || null;
      license.activatedAt = new Date();
      await license.save();
    }

    // Seed demo license back if it was the demo key
    if (finalLicenseKey && finalLicenseKey === 'DUKA-DEMO-2024-FREE') {
      await License.findOneAndUpdate(
        { key: 'DUKA-DEMO-2024-FREE' },
        { status: 'active', assignedTo: null, deviceId: null }
      );
    }

    const token = generateToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
], async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account deactivated. Please contact support.' });
    }

    const token = generateToken(user._id);
    const userObj = user.toJSON();
    res.json({ token, user: userObj });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  validate,
], async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: 'There is no user with that email' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset url (handle local vs prod domains gracefully)
    const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${origin}/#/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request or visit the following link:\n\n${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Duka Profit - Password Reset Request',
        message,
        html: `
          <h3>Password Reset Request</h3>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#16A34A;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });

      res.status(200).json({ message: 'Email sent successfully' });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/reset-password/:token
router.put('/reset-password/:token', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
], async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = generateToken(user._id);
    const userObj = user.toJSON();
    res.json({ token, user: userObj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

// PUT /api/auth/profile
router.put('/profile', protect, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  validate,
], async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email && email !== req.user.email) {
      const exists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ message: 'Email already in use.' });
      updates.email = email;
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile.' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate,
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to change password.' });
  }
});

module.exports = router;
