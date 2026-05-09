const crypto = require('crypto');

/**
 * Generate a license key in format: DUKA-XXXX-XXXX
 * Uses uppercase letters and numbers
 * @returns {string} Generated license key
 */
function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  
  // Generate two segments of 4 characters each
  for (let i = 0; i < 2; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      segment += chars[randomIndex];
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
 * Validate license key format
 * @param {string} key - License key to validate
 * @returns {boolean} True if valid format
 */
function validateLicenseKey(key) {
  const pattern = /^DUKA-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key);
}

module.exports = {
  generateLicenseKey,
  generateMultipleKeys,
  validateLicenseKey
};
