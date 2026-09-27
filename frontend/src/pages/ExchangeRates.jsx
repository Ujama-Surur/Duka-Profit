import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  RefreshCw, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Calendar, 
  User, 
  Info, 
  Clock, 
  WifiOff, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import api, { formatDate, formatTime, offlineData } from '../utils/api';

export default function ExchangeRates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [currentRate, setCurrentRate] = useState(null);
  const [history, setHistory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newRateInput, setNewRateInput] = useState('');
  const [sourceInput, setSourceInput] = useState('manual');
  const [notesInput, setNotesInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    loadData();
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, rateRes, historyRes] = await Promise.all([
        api.get('/currency/settings'),
        api.get('/currency/rate/current'),
        api.get('/currency/rate/history'),
      ]);

      setSettings(settingsRes.data);
      setCurrentRate(rateRes.data);
      setHistory(historyRes.data || []);

      // Cache offline
      await offlineData.set('currency_settings', settingsRes.data);
      if (rateRes.data) await offlineData.set('current_exchange_rate', rateRes.data);
      await offlineData.set('currency_rate_history', historyRes.data || []);
    } catch (err) {
      console.error('Failed to load exchange rates data:', err);
      const cachedSettings = await offlineData.get('currency_settings');
      const cachedRate = await offlineData.get('current_exchange_rate');
      const cachedHistory = await offlineData.get('currency_rate_history');

      if (cachedSettings) setSettings(cachedSettings);
      if (cachedRate) setCurrentRate(cachedRate);
      if (cachedHistory) setHistory(cachedHistory);

      toast('Using offline cached exchange rates', { icon: <WifiOff size={16} /> });
    } finally {
      setLoading(false);
    }
  };

  const baseCurrency = settings?.baseCurrency || 'USD';
  const sellingCurrency = settings?.sellingCurrency || 'SSP';

  const handleSaveNewRate = async (e) => {
    e.preventDefault();
    const rateVal = parseFloat(newRateInput);
    if (isNaN(rateVal) || rateVal <= 0) {
      toast.error('Please enter a valid positive exchange rate');
      return;
    }

    setSavingRate(true);
    try {
      if (isOffline) {
        // Queue offline operation
        await offlineData.queueOperation({
          method: 'post',
          url: '/currency/rate',
          data: {
            rate: rateVal,
            baseCurrency,
            targetCurrency: sellingCurrency,
            source: 'offline_sync',
            notes: notesInput,
          },
        });

        // Update local state optimistically
        const optimisticRate = {
          rate: rateVal,
          previousRate: currentRate?.rate || null,
          changePercent: currentRate?.rate ? parseFloat((((rateVal - currentRate.rate) / currentRate.rate) * 100).toFixed(2)) : 0,
          source: 'offline_sync',
          effectiveDate: new Date().toISOString(),
          status: 'active',
        };
        setCurrentRate(optimisticRate);
        setHistory([optimisticRate, ...history]);
        await offlineData.set('current_exchange_rate', optimisticRate);

        toast.success(`Exchange rate saved offline! Will synchronize on reconnect.`);
        setShowModal(false);
        setNewRateInput('');
        setNotesInput('');
      } else {
        const { data } = await api.post('/currency/rate', {
          rate: rateVal,
          baseCurrency,
          targetCurrency: sellingCurrency,
          source: sourceInput,
          notes: notesInput,
        });

        toast.success(`Exchange rate updated! ${data.impactedProductsCount || 0} products flagged for price review.`);
        setShowModal(false);
        setNewRateInput('');
        setNotesInput('');
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update exchange rate');
    } finally {
      setSavingRate(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/products')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', paddingLeft: 0, marginBottom: '6px' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Products</span>
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
            Exchange Rate Management
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Track and record exchange rates. Historical rates are permanently preserved for audit and valuation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setNewRateInput(currentRate?.rate ? String(currentRate.rate) : '');
              setShowModal(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} />
            <span>Update Exchange Rate</span>
          </button>
        </div>
      </div>

      {/* Offline Alert Banner */}
      {isOffline && (
        <div
          className="card"
          style={{
            background: '#FEF3C7',
            borderColor: '#FDE68A',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <WifiOff size={20} color="#D97706" />
          <div style={{ fontSize: '13px', color: '#92400E' }}>
            <strong>Offline Mode Active:</strong> You are viewing cached exchange rates. Any rate updates entered will be queued securely and synced when internet connection is restored.
          </div>
        </div>
      )}

      {/* Current Active Rate Hero Card */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
          border: '1.5px solid #86EFAC',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-green" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                Active Market Rate
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Source: <strong>{currentRate?.source || 'Manual'}</strong>
              </span>
            </div>

            <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-main)', marginTop: '8px' }}>
              1 {baseCurrency} = {currentRate?.rate != null && !isNaN(Number(currentRate.rate)) ? Number(currentRate.rate).toLocaleString() : 'Not set'} {sellingCurrency}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
              {currentRate?.previousRate != null && !isNaN(Number(currentRate.previousRate)) && (
                <span>Previous rate: <strong>{Number(currentRate.previousRate).toLocaleString()} {sellingCurrency}</strong></span>
              )}
              {currentRate?.effectiveDate && (
                <span>Last updated: <strong>{formatDate(currentRate.effectiveDate)} {formatTime(currentRate.effectiveDate)}</strong></span>
              )}
            </div>
          </div>

          {/* Change Pill */}
          {currentRate?.changePercent !== undefined && currentRate.changePercent !== 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Rate Change</span>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '30px',
                  background: currentRate.changePercent > 0 ? '#FEE2E2' : '#DCFCE7',
                  color: currentRate.changePercent > 0 ? '#DC2626' : '#16A34A',
                  fontSize: '18px',
                  fontWeight: 800,
                }}
              >
                {currentRate.changePercent > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {currentRate.changePercent > 0 ? `+${currentRate.changePercent}%` : `${currentRate.changePercent}%`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rate History Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
            Exchange Rate History ({baseCurrency}/{sellingCurrency})
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Immutable Audit Trail</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div className="spinner" />
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No historical rates recorded yet. Click "Update Exchange Rate" above to record the initial rate.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Date & Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Exchange Rate</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Previous Rate</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Change</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Source</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, index) => {
                  const isCurrent = record.status === 'active' || index === 0;
                  return (
                    <tr
                      key={record._id || index}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isCurrent ? '#F0FDF4' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{formatDate(record.effectiveDate)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(record.effectiveDate)}</div>
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        1 {record.baseCurrency || baseCurrency} = {record.rate != null && !isNaN(Number(record.rate)) ? Number(record.rate).toLocaleString() : '—'} {record.targetCurrency || sellingCurrency}
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {record.previousRate != null && !isNaN(Number(record.previousRate)) ? Number(record.previousRate).toLocaleString() : '—'}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {record.changePercent ? (
                          <span
                            style={{
                              fontWeight: 700,
                              color: record.changePercent > 0 ? '#DC2626' : '#16A34A',
                            }}
                          >
                            {record.changePercent > 0 ? `+${record.changePercent}%` : `${record.changePercent}%`}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>0%</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>
                          {record.source || 'manual'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {isCurrent ? (
                          <span className="badge badge-green">Active</span>
                        ) : (
                          <span className="badge badge-gray">Superseded</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', maxWidth: '200px' }}>
                        {record.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Rate Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="card"
            style={{ maxWidth: '480px', width: '100%', margin: '40px auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Update Exchange Rate</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveNewRate}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="label">Currency Pair</label>
                <input
                  type="text"
                  className="input"
                  disabled
                  value={`${baseCurrency} → ${sellingCurrency}`}
                  style={{ background: 'var(--bg-subtle)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="label">
                  New Exchange Rate <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="any"
                    min="0.000001"
                    className="input"
                    placeholder={`e.g. 4200`}
                    value={newRateInput}
                    onChange={(e) => setNewRateInput(e.target.value)}
                    required
                    autoFocus
                    style={{ fontSize: '16px', fontWeight: 700 }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {sellingCurrency}
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="label">Rate Source</label>
                <select
                  className="input"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                >
                  <option value="manual">Manual Entry / Bureau</option>
                  <option value="supplier">Supplier Invoiced Rate</option>
                  <option value="api">Reference / Bank Rate</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="label">Notes / Reference (Optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Rate provided by supplier or bureau"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', marginBottom: '20px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                ℹ️ <strong>Transparent Protection:</strong> Saving this rate recalculates replacement cost and flags affected items. <em>Customer-facing selling prices will never change without your manual approval on the Price Review screen.</em>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingRate}>
                  {savingRate ? 'Updating...' : 'Save Exchange Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
