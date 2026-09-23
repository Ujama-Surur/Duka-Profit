import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, Lock, CheckCircle2, ArrowLeft, Sparkles, Key } from 'lucide-react';

export default function UpgradePremiumScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '24px',
        background: 'var(--bg)',
        fontFamily: 'var(--font-display)',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '36px 32px',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          background: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Shield Crown Premium Badge */}
        <div
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--green-primary)',
            marginBottom: '20px',
          }}
        >
          <Crown size={36} />
          <div
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              background: 'var(--bg-card)',
              borderRadius: '50%',
              padding: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={14} color="var(--red)" />
          </div>
        </div>

        <span
          className="badge badge-green"
          style={{
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            marginBottom: '12px',
          }}
        >
          Pro Feature Locked
        </span>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: 'var(--text)',
            margin: '0 0 10px 0',
            letterSpacing: '-0.5px',
          }}
        >
          Unlock Point of Sale & Stock In
        </h1>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '14.5px',
            lineHeight: '1.6',
            margin: '0 0 24px 0',
            maxWidth: '460px',
          }}
        >
          Fast POS checkout, receipt printing, and wireless barcode scanning are available on our Pro subscription.
          Starting at just <strong>5,000 RWF / month</strong>.
        </p>

        {/* Feature List */}
        <div
          style={{
            width: '100%',
            textAlign: 'left',
            background: 'var(--bg)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border)',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CheckCircle2 size={18} color="var(--green-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                Smart POS Checkout
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Complete multi-item purchases in seconds, accept MTN MoMo/Airtel/Cash, calculate profit instantly, and print custom receipts.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CheckCircle2 size={18} color="var(--green-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                Barcode Stock-In & Inventory Sync
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Scan barcodes to receive new inventory instantly. Connect any phone as a free remote handheld scanner.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
          }}
        >
          <button
            className="btn btn-primary btn-lg btn-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => navigate('/pricing')}
          >
            <Sparkles size={18} /> View Subscription Plans
          </button>

          <button
            className="btn btn-secondary btn-lg btn-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        </div>

        <button
          onClick={() => navigate('/subscription')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '13px',
            marginTop: '20px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'underline',
          }}
        >
          <Key size={14} /> Have a license card key? Redeem here
        </button>
      </div>
    </div>
  );
}
