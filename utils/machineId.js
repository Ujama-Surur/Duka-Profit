const os = require('os');
const crypto = require('crypto');

/**
 * Returns a deterministic machine identifier derived from stable OS details.
 * This is intended for license binding and remains consistent across app runs.
 */
function getMachineId() {
  const source = [
    os.hostname() || '',
    os.platform() || '',
    os.arch() || '',
  ]
    .map((part) => String(part).trim().toLowerCase())
    .join('|');

  return crypto.createHash('sha256').update(source).digest('hex');
}

module.exports = { getMachineId };
