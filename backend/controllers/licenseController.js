const License = require('../models/License');

const activateLicense = async (req, res) => {
  try {
    const { key, machineId } = req.body;

    if (!key || !String(key).trim()) {
      return res.status(400).json({ success: false, message: 'License key is required.' });
    }
    if (!machineId || !String(machineId).trim()) {
      return res.status(400).json({ success: false, message: 'machineId is required.' });
    }

    const normalizedKey = String(key).trim().toUpperCase();
    const normalizedMachineId = String(machineId).trim();

    const license = await License.findOne({ key: normalizedKey });

    if (!license) {
      return res.status(404).json({ success: false, message: 'License key not found.' });
    }

    if (license.status !== 'used') {
      license.status = 'used';
      license.deviceId = normalizedMachineId;
      license.activatedAt = new Date();
      await license.save();

      return res.status(200).json({
        success: true,
        message: 'License activated successfully.',
        data: {
          key: license.key,
          status: license.status,
          deviceId: license.deviceId,
          activatedAt: license.activatedAt,
        },
      });
    }

    if (license.deviceId === normalizedMachineId) {
      return res.status(200).json({
        success: true,
        message: 'License already activated on this machine.',
        data: {
          key: license.key,
          status: license.status,
          deviceId: license.deviceId,
          activatedAt: license.activatedAt,
        },
      });
    }

    return res.status(409).json({
      success: false,
      message: 'License is already used on a different machine.',
    });
  } catch (error) {
    console.error('License activation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to activate license.',
    });
  }
};

module.exports = { activateLicense };
