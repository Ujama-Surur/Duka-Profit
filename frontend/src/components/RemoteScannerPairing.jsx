import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import QRCode from 'qrcode.react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Smartphone, QrCode } from 'lucide-react';

export default function RemoteScannerPairing({ onBarcodeScanned }) {
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [connectedScanners, setConnectedScanners] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Connect to WebSocket server
    const serverUrl =import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(serverUrl);

    newSocket.on('connect', () => {
      console.log('Connected to scanner server');
      // Request list of connected scanners
      newSocket.emit('scanner:list');
    });

    newSocket.on('scanner:connected', (data) => {
      console.log('Scanner connected:', data);
      setConnectedScanners(prev => [...prev, data]);
      toast.success(`${data.deviceName} connected as scanner`);
    });

    newSocket.on('scanner:disconnected', (data) => {
      console.log('Scanner disconnected:', data);
      setConnectedScanners(prev => prev.filter(s => s.socketId !== data.socketId));
      toast('Scanner disconnected', { icon: 'ℹ️' });
    });

    newSocket.on('scanner:list', (scanners) => {
      setConnectedScanners(scanners);
    });

    newSocket.on('barcode:scanned', (data) => {
      console.log('Barcode received from remote scanner:', data);
      if (onBarcodeScanned) {
        onBarcodeScanned(data.barcode, data.deviceId);
      }
      toast.success(`Scanned from ${data.deviceId}: ${data.barcode}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [onBarcodeScanned]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/scanner/pairing-qr');
      setQrCode(data.qrCode);
      setShowQR(true);
    } catch (err) {
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: '#fafafa' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone size={20} /> Remote Scanner
        </strong>
        <button 
          className="btn btn-ghost btn-sm"
          onClick={() => setShowQR(false)}
        >
          Close
        </button>
      </div>

      {/* Connected Scanners */}
      {connectedScanners.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>
            Connected Devices ({connectedScanners.length})
          </p>
          {connectedScanners.map((scanner, index) => (
            <div 
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: 'var(--green-50)',
                border: '1px solid var(--green-200)',
                borderRadius: 8,
                marginBottom: 8
              }}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--green-primary)',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{scanner.deviceName}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {new Date(scanner.connectedAt).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Display */}
      {showQR ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            background: 'white', 
            padding: '16px', 
            borderRadius: 12, 
            display: 'inline-block',
            marginBottom: 16
          }}>
            {qrCode ? (
              <img src={qrCode} alt="Pairing QR Code" style={{ width: 200, height: 200 }} />
            ) : (
              <QRCode
                value={`${window.location.origin}/scanner/connect?userId=${Date.now()}`}
                size={200}
                level="M"
              />
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Scan this QR code with your phone/tablet to connect as a remote scanner
          </p>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowQR(false)}
          >
            Hide QR Code
          </button>
        </div>
      ) : (
        <button 
          className="btn btn-primary btn-full"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={generateQRCode}
          disabled={loading}
        >
          {loading ? '...' : <><QrCode size={18} /> Show Pairing QR Code</>}
        </button>
      )}

      {/* Instructions */}
      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        background: 'var(--bg-muted)', 
        borderRadius: 8, 
        fontSize: 12,
        color: 'var(--text-muted)'
      }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>How to connect:</p>
        <ol style={{ margin: 0, paddingLeft: 16 }}>
          <li>Click "Show Pairing QR Code"</li>
          <li>Scan the QR code with your phone/tablet</li>
          <li>Open the link in your browser</li>
          <li>Your device will act as a remote scanner</li>
          <li>Scanned barcodes will appear here automatically</li>
        </ol>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
