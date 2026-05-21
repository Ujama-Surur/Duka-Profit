const express = require("express");
const QRCode = require("qrcode");
const { protect } = require("../middleware/auth");

const router = express.Router();

const os = require("os");

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

// Generate pairing QR code (protected - user must be authenticated)
router.get("/pairing-qr", protect, async (req, res) => {
  try {
    const { id: userId } = req.user;
    
    // In production, the frontend and backend share the same port
    // In development, the Vite frontend runs on port 5173
    const isDev = process.env.NODE_ENV !== "production";
    const port = isDev ? 5173 : (process.env.PORT || 5000);
    
    const serverUrl =
      process.env.SERVER_URL || `http://${getLocalIpAddress()}:${port}`;

    // Create pairing data with proper authentication
    const pairingData = JSON.stringify({
      userId,
      timestamp: Date.now(),
      type: "scanner_pairing",
    });

    // Point to a proper route that serves the RemoteScanner component
    const pairingUrl = `${serverUrl}/#/remote-scanner?data=${encodeURIComponent(pairingData)}`;

    // Generate QR code
    const qrCode = await QRCode.toDataURL(pairingUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    res.json({
      qrCode,
      pairingUrl,
      userId,
      instructions:
        "Scan this QR code with a mobile device to set up remote barcode scanner",
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate QR code" });
  }
});

// Validate pairing (protected - ensures user is authenticated)
router.post("/validate-pairing", protect, async (req, res) => {
  try {
    const { pairingCode } = req.body;
    const { id: userId } = req.user;

    // In production, you would validate the pairing code against a database
    // For now, we'll accept any code and associate it with the user

    res.json({
      valid: true,
      message: "Pairing validated successfully",
      deviceId: `device_${userId}_${Date.now()}`,
      userId,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to validate pairing" });
  }
});

module.exports = router;
