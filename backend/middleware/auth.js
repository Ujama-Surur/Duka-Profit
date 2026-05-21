const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token invalid. User not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account has been deactivated.' });
    }

    if (user.licenseStatus === 'suspended') {
      return res.status(403).json({ message: 'License suspended. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    next(err);
  }
};

const adminOnly = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { protect, adminOnly };