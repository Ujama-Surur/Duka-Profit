-- Duka Profit SaaS Database Schema
-- MySQL Database Schema for Subscription System

-- Create users table (updated)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  isEmailVerified BOOLEAN DEFAULT FALSE,
  emailVerificationToken VARCHAR(255),
  emailVerificationExpires DATETIME,
  lastLoginAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  loginAttempts INT DEFAULT 0,
  lockUntil DATETIME,
  language ENUM('en', 'rw', 'sw', 'fr') DEFAULT 'en',
  role ENUM('user', 'admin') DEFAULT 'user',
  isActive BOOLEAN DEFAULT TRUE,
  
  -- Legacy license fields (keep for backward compatibility)
  licenseKey VARCHAR(255),
  licenseStatus ENUM('active', 'expired', 'suspended', 'unlicensed') DEFAULT 'unlicensed',
  deviceId VARCHAR(255),
  licenseVerifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  resetPasswordToken VARCHAR(255),
  resetPasswordExpire DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_isActive (isActive),
  INDEX idx_emailVerificationToken (emailVerificationToken)
);



-- Create audit_logs table for security
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  details JSON,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  success BOOLEAN DEFAULT TRUE,
  errorMessage TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_createdAt (createdAt)
);
