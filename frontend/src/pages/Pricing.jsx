import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api, { formatCurrency } from '../utils/api';
import Logo from '../components/common/Logo';
import { Check, Zap, Crown, Shield, ArrowRight, Smartphone, CreditCard, Sparkles } from 'lucide-react';

export default function Pricing() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [phone, setPhone] = useState(user?.phone || '');
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data } = await api.get('/plans');
      if (data?.plans) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
      toast.error('Could not load pricing plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    if (!user) {
      navigate('/register');
      return;
    }

    if (plan.price === 0) {
      // Free plan directly activates
      activatePlan(plan, '');
      return;
    }

    setSelectedPlan(plan);
    setPhone(user.phone || '');
    setShowPhoneModal(true);
  };

  const activatePlan = async (plan, customerPhone) => {
    setInitiatingPayment(true);
    try {
      const redirectUrl = `${window.location.origin}${window.location.pathname}#/payment-verify`;

      const { data } = await api.post('/payments/create', {
        planId: plan._id,
        customerPhone: customerPhone || phone,
        redirectUrl,
      });

      if (data?.data?.isFree) {
        toast.success('Free Starter plan activated!');
        navigate('/dashboard');
        return;
      }

      if (data?.data?.paymentUrl) {
        toast.loading('Redirecting to secure Flutterwave checkout...', { duration: 2000 });
        window.location.href = data.data.paymentUrl;
      } else {
        toast.error('Could not obtain checkout URL from payment gateway.');
      }
    } catch (err) {
      console.error('Payment start error:', err);
      toast.error(err.response?.data?.message || 'Failed to initiate payment.');
    } finally {
      setInitiatingPayment(false);
      setShowPhoneModal(false);
    }
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 8) {
      toast.error('Please enter a valid mobile number (e.g. 078XXXXXXX)');
      return;
    }
    activatePlan(selectedPlan, phone.trim());
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 20px', fontFamily: 'var(--font-display)' }}>
      {/* Header */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-block', marginBottom: '16px' }}>
          <Logo size="medium" />
        </div>
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
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <Sparkles size={16} /> Affordable Plans for Rwandan Merchants
        </span>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text)', margin: '0 0 14px 0', letterSpacing: '-0.02em' }}>
          Choose the Perfect Plan for Your Shop
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
          Track sales, manage stock, and see real daily profits. Pay securely with MTN MoMo, Airtel Money, or bank cards.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Smartphone size={16} color="var(--green-primary)" /> MTN & Airtel MoMo</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={16} color="var(--green-primary)" /> Instant Access</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={16} color="var(--green-primary)" /> Cancel Anytime</span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading plans...</p>
        </div>
      ) : (
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {plans.map((plan) => {
            const isPopular = plan.popular;
            const isCurrentPlan = user?.subscription?.plan?.slug === plan.slug;

            return (
              <div
                key={plan._id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  border: isPopular ? '2px solid var(--green-primary)' : '1px solid var(--border)',
                  padding: '30px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: isPopular ? '0 12px 30px rgba(16, 185, 129, 0.15)' : '0 4px 16px rgba(0,0,0,0.04)',
                  transform: isPopular ? 'translateY(-4px)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isPopular && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-13px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--green-primary)',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '4px 14px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    Most Popular
                  </span>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0' }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, minHeight: '38px', lineHeight: 1.4 }}>
                    {plan.description}
                  </p>
                </div>

                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                      {formatCurrency(plan.price, plan.currency || 'RWF')}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {plan.price === 0 ? '/ Always' : plan.durationDays === 365 ? '/ year' : plan.durationDays === 90 ? '/ 3 mos' : '/ month'}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div style={{ flex: 1, marginBottom: '28px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
                    Included Features:
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(plan.featureLabels && plan.featureLabels.length > 0
                      ? plan.featureLabels
                      : plan.features
                    ).map((feature, fIdx) => (
                      <li key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.4 }}>
                        <span style={{ color: 'var(--green-primary)', marginTop: '2px', flexShrink: 0 }}>
                          <Check size={16} strokeWidth={3} />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Call to action */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={initiatingPayment || isCurrentPlan}
                  className={`btn ${isPopular ? 'btn-primary' : 'btn-secondary'} btn-lg`}
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
                  {isCurrentPlan ? (
                    'Your Active Plan'
                  ) : plan.price === 0 ? (
                    'Get Started Free'
                  ) : (
                    <>
                      Subscribe Now <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* MoMo Rwanda Phone Input Modal */}
      {showPhoneModal && selectedPlan && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '28px',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)' }}>
              Complete Subscription
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
              You are subscribing to <strong>{selectedPlan.name}</strong> for{' '}
              <strong>{formatCurrency(selectedPlan.price, selectedPlan.currency)}</strong>.
            </p>

            <form onSubmit={handlePhoneSubmit}>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Mobile Money Phone Number (MTN / Airtel Rwanda)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    className="form-input form-input-lg"
                    placeholder="078 XXX XXXX or 072 XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <span className="form-hint">You will receive an instant payment prompt on this phone.</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowPhoneModal(false)}
                  disabled={initiatingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  disabled={initiatingPayment}
                >
                  {initiatingPayment ? 'Connecting...' : 'Pay with Flutterwave'}
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
          Questions? Contact our Rwanda merchant team: <strong>support@dukaprofit.com</strong>
        </p>
      </div>
    </div>
  );
}
