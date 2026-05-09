import { useState } from 'react';
import api from '../utils/api';

export default function ActivationScreen({ onActivated }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getMachineId = async () => {
    try {
      if (window.electronAPI?.getDeviceId) {
        return await window.electronAPI.getDeviceId();
      }
    } catch {
      // Fallback handled below.
    }
    return `web-${navigator.platform || 'unknown'}-${navigator.userAgent.length}`;
  };

  const saveLicenseLocally = async (payload) => {
    // Preferred: Electron bridge saves a real license.json file.
    if (window.electronAPI?.saveLicenseFile) {
      await window.electronAPI.saveLicenseFile(payload);
      return;
    }

    // Fallback: keep activation state locally if file writer is not exposed yet.
    localStorage.setItem('duka_license', JSON.stringify(payload));
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setError('');

    const key = licenseKey.trim();
    if (!key) {
      setError('Please enter a license key.');
      return;
    }

    setLoading(true);
    try {
      const machineId = await getMachineId();
      const { data } = await api.post('/license/activate', { key, machineId });

      const licensePayload = {
        key: key.toUpperCase(),
        machineId,
        activatedAt: data?.data?.activatedAt || new Date().toISOString(),
        isUsed: true,
      };

      await saveLicenseLocally(licensePayload);

      if (onActivated) {
        onActivated(licensePayload);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'var(--bg)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 24,
          borderRadius: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Activate Duka Profit</h1>
        <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 14 }}>
          Enter your license key to continue.
        </p>

        <form onSubmit={handleActivate} style={{ marginTop: 20, display: 'grid', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">License Key</label>
            <input
              className="form-input form-input-lg"
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="DUKA-XXXX-XXXX-XXXX"
              autoComplete="off"
              disabled={loading}
            />
          </div>

          {error && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--red)',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                padding: '10px 12px',
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Activating...' : 'Activate'}
          </button>
        </form>
      </div>
    </div>
  );
}
