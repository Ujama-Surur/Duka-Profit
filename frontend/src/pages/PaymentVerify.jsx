import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api, { formatCurrency, formatDate } from '../utils/api';
import Logo from '../components/common/Logo';
import { CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, ShoppingCart, TrendingUp } from 'lucide-react';

export default function PaymentVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    verifyPaymentTransaction();
  }, []);

  const verifyPaymentTransaction = async () => {
    setLoading(true);
    setError(null);

    try {
      // Parse parameters from hash or search
      const hashParams = location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
      const params = new URLSearchParams(hashParams);

      const txRef = params.get('tx_ref') || params.get('transaction_reference');
      const transactionId = params.get('transaction_id') || params.get('id');
      const statusParam = params.get('status');

      if (!txRef) {
        throw new Error('No transaction reference found in return URL.');
      }

      if (statusParam === 'cancelled') {
        throw new Error('The payment was cancelled. Your account was not charged.');
      }

      // Call backend verification endpoint
      const queryStr = transactionId ? `?transaction_id=${encodeURIComponent(transactionId)}` : '';
      const { data } = await api.get(`/payments/verify/${encodeURIComponent(txRef)}${queryStr}`);

      if (data?.success) {
        setSuccess(true);
        setPaymentData(data.data);
        await refreshUser();
        toast.success('Subscription activated successfully! 🎉');
      } else {
        throw new Error(data?.message || 'Payment verification failed.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err?.response?.data?.message || err.message || 'Could not verify payment.');
      toast.error('Payment could not be confirmed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-display)',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '36px 30px',
          textAlign: 'center',
          borderRadius: '16px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.06)',
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <Logo size="medium" />
        </div>

        {loading && (
          <div>
            <div className="spinner" style={{ margin: '20px auto 24px auto', width: '44px', height: '44px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 10px 0', color: 'var(--text)' }}>
              Verifying Payment...
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', lineHeight: 1.5 }}>
              Confirming your transaction with Flutterwave. This only takes a moment.
            </p>
          </div>
        )}

        {!loading && success && (
          <div>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--green-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <CheckCircle2 size={42} />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)' }}>
              Subscription Activated! 🎉
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Thank you! Your Duka Profit Pro features are now unlocked.
            </p>

            {paymentData?.subscription && (
              <div
                style={{
                  background: 'var(--bg)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  textAlign: 'left',
                  marginBottom: '28px',
                  display: 'grid',
                  gap: '8px',
                  fontSize: '13.5px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span style={{ fontWeight: 700, color: 'var(--green-primary)' }}>ACTIVE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Valid Until:</span>
                  <span style={{ fontWeight: 700 }}>
                    {formatDate(paymentData.subscription.endDate)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Transaction Reference:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {paymentData.payment?.transactionReference}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => navigate('/checkout')}
                className="btn btn-primary btn-lg"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
              >
                <ShoppingCart size={18} /> Open Point of Sale (POS)
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-secondary btn-lg"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
              >
                <TrendingUp size={18} /> Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {!loading && !success && (
          <div>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: '#FEF2F2',
                color: 'var(--red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <AlertTriangle size={38} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)' }}>
              Payment Verification Issue
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              {error || 'We could not verify your payment. If funds were deducted, please contact support with your transaction reference.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={verifyPaymentTransaction}
                className="btn btn-secondary btn-lg"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
              >
                <RefreshCw size={16} /> Retry Verification
              </button>
              <Link
                to="/pricing"
                className="btn btn-primary btn-lg"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', textDecoration: 'none' }}
              >
                View Plans & Try Again <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
