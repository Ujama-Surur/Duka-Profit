const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const LICENSE_FILE_NAME = 'license.json';

function getLicenseFilePath() {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, LICENSE_FILE_NAME);
}

function saveLicense(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('License data must be an object.');
  }

  const payload = {
    key: String(data.key || '').trim(),
    machineId: String(data.machineId || '').trim(),
  };

  if (!payload.key) {
    throw new Error('License key is required.');
  }
  if (!payload.machineId) {
    throw new Error('machineId is required.');
  }

  const licensePath = getLicenseFilePath();
  fs.writeFileSync(licensePath, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

function loadLicense() {
  const licensePath = getLicenseFilePath();
  if (!fs.existsSync(licensePath)) return null;

  const raw = fs.readFileSync(licensePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed?.key || !parsed?.machineId) return null;
  return {
    key: String(parsed.key).trim(),
    machineId: String(parsed.machineId).trim(),
  };
}

module.exports = {
  saveLicense,
  loadLicense,
  getLicenseFilePath,
};
