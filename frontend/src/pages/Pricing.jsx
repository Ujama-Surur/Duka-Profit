import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api, { formatCurrency } from '../utils/api';
import Logo from '../components/common/Logo';
import {
  Check,
  Zap,
  Crown,
  Shield,
  ArrowRight,
  Smartphone,
  CreditCard,
  Sparkles,
  Upload,
  Copy,
  AlertTriangle,
  Clock,
  Info,
  X,
  WifiOff,
} from 'lucide-react';

export default function Pricing() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [instructions, setInstructions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual payment submission form state
  const [form, setForm] = useState({
    fullName: user?.name || '',
    phoneNumber: user?.phone || '',
    network: 'MTN',
    transactionId: '',
    amountPaid: '',
    reference: '',
    screenshot: null,
  });
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    loadPlans();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPlans = async () => {
    try {
      const { data } = await api.get('/plans');
      if (data?.plans) {
        setPlans(data.plans);
      }
      if (data?.instructions) {
        setInstructions(data.instructions);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
      toast.error('Could not load pricing plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateReference = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `DP-${code}`;
  };

  const handleSelectPlan = (plan) => {
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }

    if (plan.price === 0) {
      toast.success('You are on the Free Starter plan.');
      navigate('/dashboard');
      return;
    }

    const ref = generateReference();
    setSelectedPlan(plan);
    setForm({
      fullName: user.name || '',
      phoneNumber: user.phone || '',
      network: 'MTN',
      transactionId: '',
      amountPaid: plan.price.toString(),
      reference: ref,
      screenshot: null,
    });
    setScreenshotPreview(null);
    setShowManualModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Screenshot must be 2 MB or smaller.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WEBP image files are allowed.');
      return;
    }

    setForm((prev) => ({ ...prev, screenshot: file }));
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (isOffline) {
      toast.error(t('offlinePaymentWarning') || 'You are currently offline. Connect to the internet to submit your payment.');
      return;
    }

    if (!form.transactionId.trim()) {
      toast.error('Please enter the Transaction ID from your SMS.');
      return;
    }

    if (!form.phoneNumber.trim()) {
      toast.error('Please enter your phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('plan', selectedPlan.slug || selectedPlan.id);
      formData.append('amountPaid', form.amountPaid);
      formData.append('network', form.network);
      formData.append('transactionId', form.transactionId.trim());
      formData.append('customerName', form.fullName.trim());
      formData.append('customerPhone', form.phoneNumber.trim());
      formData.append('reference', form.reference);
      if (form.screenshot) {
        formData.append('screenshot', form.screenshot);
      }

      await api.post('/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Payment submitted for verification! 🎉');
      setShowManualModal(false);
      navigate('/my-payments');
    } catch (err) {
      console.error('Payment submission failed:', err);
      toast.error(err.response?.data?.message || 'Failed to submit payment request.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  // Default fallback instructions
  const momoCode = instructions?.momo?.code || '055123';
  const momoName = instructions?.momo?.accountName || 'DUKA PROFIT LTD';
  const airtelNumber = instructions?.airtel?.phone || '+250730000000';
  const airtelName = instructions?.airtel?.accountName || 'DUKA PROFIT LTD';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 20px', fontFamily: 'var(--font-display)' }}>
      {/* Header */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-block', marginBottom: '16px' }}>
          <Logo size="medium" />
        </div>
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--green-primary)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            <Sparkles size={15} /> Transparent Local Rwandan Pricing
          </span>
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)', margin: '0 0 10px 0' }}>
          Choose the Perfect Plan for Your Shop
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto 20px' }}>
          Pay directly via MTN Mobile Money or Airtel Money. Instant verification and device-bound license activation.
        </p>

        {user && (
          <div style={{ marginTop: '12px' }}>
            <Link
              to="/my-payments"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600 }}
            >
              <CreditCard size={16} /> {t('myPayments')} & License Status
            </Link>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading pricing plans...</p>
        </div>
      ) : (
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {plans.map((plan) => {
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id || plan.slug}
                className="card"
                style={{
                  position: 'relative',
                  padding: '32px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '16px',
                  border: isPopular ? '2px solid var(--green-primary)' : '1px solid var(--border-color)',
                  boxShadow: isPopular ? '0 10px 30px rgba(16, 185, 129, 0.15)' : 'var(--shadow-sm)',
                  background: 'var(--card-bg, #ffffff)',
                }}
              >
                {isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--green-primary)',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      padding: '4px 14px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Most Popular
                  </div>
                )}

                {plan.badge && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      background: '#FEF3C7',
                      color: '#B45309',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text)' }}>
                    {plan.name}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: '0 0 20px 0', minHeight: '38px' }}>
                    {plan.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '34px', fontWeight: 800, color: 'var(--text)' }}>
                      {plan.price === 0 ? 'Free' : formatCurrency(plan.price, plan.currency || 'RWF')}
                    </span>
                    {plan.price > 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
                        / {plan.durationDays} days
                      </span>
                    )}
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 0 20px 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    {(plan.features || []).map((feat, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div
                          style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '50%',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--green-primary)',
                            marginTop: '2px',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={14} />
                        </div>
                        <span style={{ fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.4 }}>
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className={isPopular ? 'btn btn-primary btn-lg' : 'btn btn-secondary btn-lg'}
                  onClick={() => handleSelectPlan(plan)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: 700,
                    borderRadius: '10px',
                    padding: '12px',
                  }}
                >
                  {plan.price === 0 ? 'Get Started Free' : 'Pay with MoMo / Airtel'}
                  <ArrowRight size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual MoMo / Airtel Payment Modal */}
      {showManualModal && selectedPlan && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowManualModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '95%',
              margin: '30px auto',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                  {t('manualPayment')} — {selectedPlan.name}
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Amount due: <strong>{formatCurrency(selectedPlan.price)}</strong>
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setShowManualModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Offline Alert */}
            {isOffline && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <WifiOff size={16} />
                <span>{t('offlinePaymentWarning')}</span>
              </div>
            )}

            {/* Step 1: Payment Instructions Card */}
            <div
              style={{
                background: 'var(--bg-subtle)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Smartphone size={18} style={{ color: 'var(--green-primary)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  {t('paymentInstructions')}
                </h3>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                {t('payInstructionsHelp')}
              </p>

              {/* Instructions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                {/* MTN MoMo Box */}
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '12px', color: '#B45309', marginBottom: '4px' }}>
                    MTN Mobile Money
                  </div>
                  <div style={{ fontSize: '12px', color: '#78350F' }}>
                    Pay Code: <strong style={{ fontSize: '14px' }}>{momoCode}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#92400E' }}>{momoName}</div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(momoCode, 'MoMo Pay Code')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      marginTop: '4px',
                      color: '#B45309',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Copy size={11} /> Copy Code
                  </button>
                </div>

                {/* Airtel Money Box */}
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '12px', color: '#1D4ED8', marginBottom: '4px' }}>
                    Airtel Money
                  </div>
                  <div style={{ fontSize: '12px', color: '#1E40AF' }}>
                    Number: <strong style={{ fontSize: '13px' }}>{airtelNumber}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#1E40AF' }}>{airtelName}</div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(airtelNumber, 'Airtel Number')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      marginTop: '4px',
                      color: '#1D4ED8',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Copy size={11} /> Copy Number
                  </button>
                </div>
              </div>

              {/* Payment Reference Banner */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                    {t('paymentReference')} (Your Payment Reason)
                  </span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '15px', color: 'var(--green-primary)' }}>
                    {form.reference}
                  </strong>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => copyToClipboard(form.reference, 'Reference')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px' }}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
            </div>

            {/* Step 2: Confirmation Submission Form */}
            <form onSubmit={handleSubmitPayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label htmlFor="customer-name" className="form-label">
                    {t('fullName')} *
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    className="form-input"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="customer-phone" className="form-label">
                    {t('phoneNumber')} *
                  </label>
                  <input
                    id="customer-phone"
                    type="tel"
                    className="form-input"
                    placeholder="078 XXX XXXX"
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label htmlFor="network-select" className="form-label">
                    {t('network')} *
                  </label>
                  <select
                    id="network-select"
                    className="form-input"
                    value={form.network}
                    onChange={(e) => setForm({ ...form, network: e.target.value })}
                    required
                  >
                    <option value="MTN">MTN Mobile Money</option>
                    <option value="AIRTEL">Airtel Money</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="amount-paid" className="form-label">
                    {t('amountPaid')} (RWF) *
                  </label>
                  <input
                    id="amount-paid"
                    type="number"
                    className="form-input"
                    value={form.amountPaid}
                    onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="transaction-id" className="form-label">
                  {t('transactionId')} *
                </label>
                <input
                  id="transaction-id"
                  type="text"
                  className="form-input"
                  placeholder={t('transactionIdPlaceholder') || 'e.g. 1928374652'}
                  value={form.transactionId}
                  onChange={(e) => setForm({ ...form, transactionId: e.target.value.toUpperCase() })}
                  required
                />
                <span className="form-hint" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Found in the confirmation SMS you received from MTN or Airtel.
                </span>
              </div>

              {/* Optional Receipt Screenshot Upload */}
              <div className="form-group">
                <label htmlFor="receipt-screenshot" className="form-label">
                  {t('screenshot')}
                </label>
                <input
                  id="receipt-screenshot"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ fontSize: '13px' }}
                />
                {screenshotPreview && (
                  <div style={{ marginTop: '8px' }}>
                    <img
                      src={screenshotPreview}
                      alt="Preview"
                      style={{ maxHeight: '100px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-full"
                  onClick={() => setShowManualModal(false)}
                  disabled={submitting}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={submitting || isOffline}
                  style={{ fontWeight: 800 }}
                >
                  {submitting ? t('submittingPayment') : t('submitPayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div style={{ textAlign: 'center', marginTop: '60px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 12px 0' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--green-primary)', fontWeight: 700, textDecoration: 'none' }}>
            Sign In here
          </Link>
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          Questions? Contact our merchant support: <strong>support@dukaprofit.com</strong>
        </p>
      </div>
    </div>
  );
}
