const crypto = require('crypto');

/**
 * Generate a cryptographically secure license key in format: DUKA-XXXX-XXXX-XXXX
 * Uses uppercase letters and numbers
 * @returns {string} Generated license key
 */
function generateLicenseKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars like 0, O, 1, I
  const segments = [];
  
  // Generate 3 segments of 4 characters each (12 chars total)
  for (let i = 0; i < 3; i++) {
    const bytes = crypto.randomBytes(4);
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars[bytes[j] % chars.length];
    }
    segments.push(segment);
  }
  
  return `DUKA-${segments.join('-')}`;
}

/**
 * Generate multiple unique license keys
 * @param {number} count - Number of keys to generate
 * @returns {string[]} Array of unique license keys
 */
function generateMultipleKeys(count = 1) {
  const keys = new Set();
  
  while (keys.size < count) {
    const key = generateLicenseKey();
    keys.add(key);
  }
  
  return Array.from(keys);
}

/**
 * Validate license key format (supports both 3-segment and legacy 2-segment)
 * @param {string} key - License key to validate
 * @returns {boolean} True if valid format
 */
function validateLicenseKey(key) {
  if (!key || typeof key !== 'string') return false;
  const pattern = /^DUKA(-[A-Z0-9]{4}){2,3}$/i;
  return pattern.test(key.trim());
}

module.exports = {
  generateLicenseKey,
  generateMultipleKeys,
  validateLicenseKey
};
