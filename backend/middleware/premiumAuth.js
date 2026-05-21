const premiumOrAdmin = (req, res, next) => {
  try {
    const user = req.user;
    
    // Allow if user is admin
    if (user.role === 'admin') {
      return next();
    }
    
    // Allow if user has active license
    if (user.licenseStatus === 'active') {
      return next();
    }
    
    // Deny access
    return res.status(403).json({ 
      message: 'Premium license required for checkout features. Please upgrade your license to access this feature.' 
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { premiumOrAdmin };
