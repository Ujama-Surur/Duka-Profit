import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_ID = 'duka-barcode-scanner';

export default function BarcodeScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const hasDetectedRef = useRef(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const beep = () => {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.05;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        context.close();
      }, 120);
    } catch {
      // Beep is optional.
    }
  };

  const stopScanner = async () => {
    if (!scannerRef.current) return;
    try {
      if (isScanningRef.current) {
        await scannerRef.current.stop();
        isScanningRef.current = false;
      }
      await scannerRef.current.clear();
    } catch {
      // Ignore stop errors during teardown.
    }
  };

  const startScanner = async (cameraId, useFacingModeFallback = false) => {
    if (!scannerRef.current) return;
    setIsStarting(true);
    setError('');
    hasDetectedRef.current = false;

    try {
      if (isScanningRef.current) {
        await scannerRef.current.stop();
        isScanningRef.current = false;
      }

      try {
        await scannerRef.current.clear();
      } catch {
        // Clear may fail before first render; safe to ignore.
      }

      const cameraConfig = useFacingModeFallback || !cameraId
        ? { facingMode: 'environment' }
        : { deviceId: { exact: cameraId } };

      await scannerRef.current.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 250, height: 120 }, aspectRatio: 1.7777778 },
        async (decodedText) => {
          if (hasDetectedRef.current) return;
          hasDetectedRef.current = true;
          beep();
          await stopScanner();
          onDetected(decodedText);
        },
        () => {}
      );
      isScanningRef.current = true;
      setIsReady(true);
    } catch (err) {
      if (!useFacingModeFallback) {
        // Fallback helps when camera IDs are unavailable on some browsers/devices.
        return startScanner('', true);
      }
      setError(err?.message || 'Unable to start camera scanner. Check camera permission and browser settings.');
      isScanningRef.current = false;
      setIsReady(false);
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    scannerRef.current = new Html5Qrcode(SCANNER_ID);

    const loadCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!mounted) return;
        if (!devices.length) {
          // Try fallback mode even when camera list is unavailable.
          setSelectedCameraId('');
          setError('No camera list available. Trying default camera...');
          startScanner('', true);
          return;
        }
        setCameras(devices);
        setSelectedCameraId(devices[0].id);
      } catch (err) {
        // On some browsers, getCameras can fail but direct facingMode scan still works.
        setError('Camera list unavailable. Trying default camera...');
        startScanner('', true);
      }
    };

    loadCameras();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (!selectedCameraId) return;
    startScanner(selectedCameraId);
  }, [selectedCameraId]);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: '#fafafa' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
        <strong>Scan Product Barcode</strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </div>

      {cameras.length > 1 && (
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label className="form-label">Camera</label>
          <select
            className="form-input"
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
          >
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>{cam.label || 'Camera'}</option>
            ))}
          </select>
        </div>
      )}

      {isStarting && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Starting camera...</p>}
      {!isStarting && isReady && <p style={{ fontSize: 13, color: 'var(--green-primary)', marginBottom: 8 }}>Point the camera at a barcode</p>}
      {error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 8 }}>{error}</p>}

      <div id={SCANNER_ID} style={{ width: '100%', minHeight: 220, borderRadius: 8, overflow: 'hidden', background: '#000' }} />

      <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => startScanner(selectedCameraId)} disabled={isStarting}>
          Scan Again
        </button>
      </div>
    </div>
  );
}
