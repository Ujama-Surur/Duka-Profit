import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api, { formatCurrency, formatDate } from '../utils/api';
import { 
  Crown, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  CreditCard, 
  Key, 
  Sparkles, 
  Calendar, 
  ArrowRight, 
  RefreshCw, 
  ReceiptText 
} from 'lucide-react';

export default function Subscription() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [subscriptionData, setSubscriptionData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [legacyKey, setLegacyKey] = useState('');
  const [redeemingKey, setRedeemingKey] = useState(false);
  const [showLegacyForm, setShowLegacyForm] = useState(false);

  useEffect(() => {
    loadSubscriptionAndHistory();
  }, []);

  const loadSubscriptionAndHistory = async () => {
    setLoading(true);
    try {
      const [subRes, paymentsRes] = await Promise.all([
        api.get('/subscriptions/current'),
        api.get('/payments/history'),
      ]);

      if (subRes.data) {
        setSubscriptionData(subRes.data);
      }
      if (paymentsRes.data?.payments) {
        setPayments(paymentsRes.data.payments);
      }
    } catch (err) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemLegacyKey = async (e) => {
    e.preventDefault();
    if (!legacyKey.trim()) {
      toast.error('Please enter a license key.');
      return;
    }

    setRedeemingKey(true);
    try {
      const { data } = await api.put('/auth/activate-license', {
        licenseKey: legacyKey.trim().toUpperCase(),
      });
      toast.success(data?.message || 'Legacy license successfully redeemed! Pro access active.');
      setLegacyKey('');
      setShowLegacyForm(false);
      await refreshUser();
      await loadSubscriptionAndHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to redeem license key.');
    } finally {
      setRedeemingKey(false);
    }
  };

  const sub = subscriptionData?.subscription;
  const isPro = subscriptionData?.isEntitled || user?.role === 'admin' || user?.licenseStatus === 'active';
  const status = subscriptionData?.status || user?.subscriptionStatus || (isPro ? 'ACTIVE' : 'FREE_TIER');
  const daysRemaining = subscriptionData?.daysRemaining ?? (isPro ? 30 : 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'var(--font-display)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Crown size={28} color="var(--green-primary)" /> My Subscription & Billing
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', margin: 0 }}>
            Manage your store's plan, renewal schedule, and invoice history.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadSubscriptionAndHistory} className="btn btn-secondary btn-sm" title="Refresh">
            <RefreshCw size={15} /> Refresh
          </button>
          <Link to="/pricing" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} /> Upgrade / Change Plan
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading subscription details...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '28px' }}>
          {/* Active Plan Card */}
          <div
            className="card"
            style={{
              padding: '28px',
              borderRadius: '16px',
              border: isPro ? '2px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border)',
              background: 'var(--bg-card)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                    {user?.role === 'admin'
                      ? 'Administrator Plan'
                      : sub?.plan?.name || (isPro ? 'Monthly Pro' : 'Free Starter')}
                  </h2>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background:
                        status === 'ACTIVE'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : status === 'EXPIRING_SOON'
                          ? '#FEF3C7'
                          : '#F3F4F6',
                      color:
                        status === 'ACTIVE'
                          ? 'var(--green-primary)'
                          : status === 'EXPIRING_SOON'
                          ? '#B45309'
                          : 'var(--text-muted)',
                    }}
                  >
                    {status}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                  {user?.role === 'admin'
                    ? 'All system features unlocked under administrator privileges.'
                    : isPro
                    ? 'Full access to Point of Sale (POS), barcode stock-in, and real-time profit tracking.'
                    : 'Basic stock and sales tracking. Upgrade to unlock POS and scanning.'}
                </p>
              </div>

              {isPro && sub?.endDate && (
                <div style={{ textAlign: 'right', background: 'var(--bg)', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                    Days Remaining
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: daysRemaining <= 3 ? '#DC2626' : 'var(--green-primary)' }}>
                    {daysRemaining} Day{daysRemaining === 1 ? '' : 's'}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Renews on {formatDate(sub.endDate)}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Action buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <Link to="/pricing" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} /> Renew / Change Plan
              </Link>
              <button
                onClick={() => setShowLegacyForm(!showLegacyForm)}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Key size={16} /> Have a license card key?
              </button>
            </div>

            {/* Legacy License Redemption Accordion */}
            {showLegacyForm && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '20px',
                  background: 'var(--bg)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}
              >
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700 }}>
                  Redeem Legacy Retail License Key
                </h4>
                <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  If you purchased a physical Duka Profit scratch card or retail key, enter it below to activate your Pro subscription.
                </p>
                <form onSubmit={handleRedeemLegacyKey} style={{ display: 'flex', gap: '10px', maxWidth: '500px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="DUKA-XXXX-XXXX-XXXX"
                    value={legacyKey}
                    onChange={(e) => setLegacyKey(e.target.value)}
                    disabled={redeemingKey}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={redeemingKey}>
                    {redeemingKey ? 'Redeeming...' : 'Redeem Key'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Payment Invoice History Table */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
              <ReceiptText size={20} /> Payment History & Receipts
            </h3>

            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                <CreditCard size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No payment transactions recorded yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ width: '100%', fontSize: '13.5px' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Reference ID</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{formatDate(p.date)}</td>
                        <td style={{ fontWeight: 700 }}>{p.planName}</td>
                        <td style={{ fontWeight: 700, color: 'var(--green-primary)' }}>
                          {formatCurrency(p.amount, p.currency)}
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{p.paymentMethod || 'MoMo'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{p.transactionReference}</td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: p.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.12)' : '#FEF3C7',
                              color: p.status === 'SUCCESS' ? 'var(--green-primary)' : '#B45309',
                            }}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
