import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { Smartphone, CameraOff, CheckCircle2, XCircle, Clock } from "lucide-react";

const SCANNER_ID = "remote-scanner";

export default function RemoteScanner() {
  const [scannerRef, setScannerRef] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [socket, setSocket] = useState(null);
  const [lastBarcode, setLastBarcode] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    // Get device info from URL
    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");

    if (data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(data));
        setDeviceId(parsed.userId || `device_${Date.now()}`);
        setDeviceName(navigator.userAgent.split(" ")[0] || "Mobile Device");
      } catch (e) {
        setDeviceId(`device_${Date.now()}`);
        setDeviceName("Mobile Device");
      }
    } else {
      setDeviceId(`device_${Date.now()}`);
      setDeviceName("Mobile Device");
    }
  }, []);

  useEffect(() => {
    if (!deviceId) return;

    // Determine socket server URL
    // In Electron/Browser, use the same server as the REST API
    const getSocketUrl = () => {
      if (import.meta.env.PROD) {
        return import.meta.env.VITE_API_URL || window.location.origin;
      }
      // In dev, the frontend dev server proxies /api to the backend
      // but socket.io needs the actual backend URL
      return import.meta.env.VITE_SOCKET_URL || window.location.origin;
    };

    const serverUrl = getSocketUrl();
    setConnecting(true);
    setConnectionError("");

    // Create socket with reconnection options
    const newSocket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ["websocket", "polling"],
      auth: {
        deviceId,
        deviceName,
        type: "scanner",
      },
    });

    newSocket.on("connect", () => {
      setConnected(true);
      setConnecting(false);
      setConnectionError("");

      // Register as scanner device
      newSocket.emit("scanner:connect", {
        deviceId,
        deviceName,
        timestamp: new Date().toISOString(),
      });

      toast.success("Connected to server");
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
      if (!newSocket.connecting) {
        setConnectionError("Disconnected from server");
      }
    });

    newSocket.on("connect_error", (error) => {
      setConnecting(false);
      const errorMsg = error.message || "Failed to connect to server";
      setConnectionError(errorMsg);
      toast.error(`Connection error: ${errorMsg}`);
    });

    newSocket.on("error", (error) => {
      const errorMsg =
        typeof error === "string"
          ? error
          : error?.message || "Connection error";
      setConnectionError(errorMsg);
      toast.error(errorMsg);
    });

    newSocket.on("scanner:ready", () => {
      toast.success("Scanner ready to receive commands");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [deviceId]);

  const startScanner = async () => {
    if (!connected) {
      toast.error("Not connected to server. Please refresh page.");
      return;
    }

    if (!scannerRef) {
      const html5QrCode = new Html5Qrcode(SCANNER_ID);
      setScannerRef(html5QrCode);
    }

    try {
      const scanner = scannerRef || new Html5Qrcode(SCANNER_ID);
      if (!scannerRef) setScannerRef(scanner);

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Barcode detected
          setLastBarcode(decodedText);
          setScanCount((prev) => prev + 1);

          // Send to main app via WebSocket
          if (socket && connected) {
            socket.emit("scanner:barcode", {
              barcode: decodedText,
              deviceId,
              timestamp: new Date().toISOString(),
            });
            toast.success(`Scanned: ${decodedText}`);
          } else {
            toast.error("Not connected - barcode not sent");
          }

          // Beep sound
          try {
            const context = new (
              window.AudioContext || window.webkitAudioContext
            )();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            oscillator.type = "sine";
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.1;
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.start();
            setTimeout(() => {
              oscillator.stop();
              context.close();
            }, 150);
          } catch (e) {
            // Audio errors are non-critical
          }
        },
        () => {},
      );
      setIsScanning(true);
      toast.success("Camera scanner started");
    } catch (err) {
      console.error("Camera start error:", err);
      if (window.isSecureContext === false) {
        toast.error("Camera blocked: Site is not secure (HTTPS required).");
      } else if (err?.name === "NotAllowedError") {
        toast.error("Camera access denied. Please allow permissions in browser settings.");
      } else if (err?.name === "NotFoundError") {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Failed to start camera - check browser settings and permissions.");
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef && isScanning) {
      try {
        await scannerRef.stop();
        setIsScanning(false);
        toast.success("Camera scanner stopped");
      } catch (err) {
        toast.error("Error stopping scanner");
      }
    }
  };

  const retryConnection = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
      setConnecting(true);
      setConnectionError("");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          background: "white",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "#333",
              margin: "0 0 8px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <Smartphone size={32} /> Remote Scanner
          </h1>
          <p style={{ fontSize: "16px", color: "#666", margin: 0 }}>
            Scan barcodes to send to the main app
          </p>
        </div>

        {/* Connection Status */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: connected
              ? "#d4edda"
              : connectionError
                ? "#f8d7da"
                : "#fff3cd",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flex: 1,
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: connected
                  ? "#28a745"
                  : connectionError
                    ? "#dc3545"
                    : "#ffc107",
                animation:
                  (connecting || !connected) && !connectionError
                    ? "pulse 1s infinite"
                    : "none",
              }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                {connected
                  ? <><CheckCircle2 size={16} /> Connected to Server</>
                  : connecting
                    ? <><Clock size={16} /> Connecting...</>
                    : connectionError
                      ? <><XCircle size={16} /> Connection Failed</>
                      : "Preparing..."}
              </p>
              {connectionError && (
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "12px",
                    color: "#666",
                  }}
                >
                  {connectionError}
                </p>
              )}
              <p
                style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}
              >
                {deviceName}
              </p>
            </div>
          </div>
          {connectionError && !connecting && (
            <button
              onClick={retryConnection}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                background: "#667eea",
                color: "white",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Retry
            </button>
          )}
        </div>

        {/* Scanner View */}
        <div
          style={{
            background: "#000",
            borderRadius: "12px",
            overflow: "hidden",
            marginBottom: "24px",
            position: "relative",
            minHeight: "300px",
          }}
        >
          <div id={SCANNER_ID} style={{ width: "100%", minHeight: "300px" }} />

          {!isScanning && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.8)",
                color: "white",
              }}
            >
              <div style={{ marginBottom: "16px" }}><CameraOff size={64} /></div>
              <p style={{ fontSize: "18px", margin: 0 }}>Camera is off</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "12px" }}>
          {!isScanning ? (
            <button
              onClick={startScanner}
              disabled={!connected}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: "12px",
                border: "none",
                background: connected ? "#667eea" : "#ccc",
                color: "white",
                fontSize: "18px",
                fontWeight: 700,
                cursor: connected ? "pointer" : "not-allowed",
              }}
            >
              Start Scanner
            </button>
          ) : (
            <button
              onClick={stopScanner}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: "12px",
                border: "none",
                background: "#dc3545",
                color: "white",
                fontSize: "18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Stop Scanner
            </button>
          )}
        </div>

        {/* Last Scan */}
        {lastBarcode && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              background: "#f8f9fa",
              borderRadius: "12px",
              border: "2px solid #667eea",
            }}
          >
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "12px",
                color: "#666",
                fontWeight: 600,
              }}
            >
              LAST SCAN
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 800,
                color: "#333",
              }}
            >
              {lastBarcode}
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#666" }}>
              Total scans: {scanCount}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            background: "#e7f3ff",
            borderRadius: "12px",
            fontSize: "14px",
            color: "#0066cc",
          }}
        >
          <p style={{ margin: "0 0 8px 0", fontWeight: 700 }}>How to use:</p>
          <ol style={{ margin: 0, paddingLeft: "20px" }}>
            <li>Ensure you're connected to the server</li>
            <li>Tap "Start Scanner" to activate camera</li>
            <li>Point camera at any barcode or QR code</li>
            <li>The code will be sent to the main app automatically</li>
          </ol>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </div>
  );
}
