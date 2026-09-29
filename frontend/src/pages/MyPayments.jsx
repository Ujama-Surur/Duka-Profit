import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Key,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  CreditCard,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

import api, { formatCurrency, formatDate } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function MyPayments() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activatingId, setActivatingId] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments/mine');
      if (data?.requests) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error('Failed to load my payments:', err);
      toast.error('Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success('License key copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 3000);
  };

  const handleActivateLicense = async (key, requestId) => {
    setActivatingId(requestId);
    try {
      // Get machineId from Electron if available, otherwise browser fingerprint or user ID
      let machineId = 'BROWSER-' + user?._id?.slice(-8);
      if (window.electronAPI?.getMachineId) {
        machineId = await window.electronAPI.getMachineId();
      }

      const { data } = await api.post('/license/activate', {
        key,
        machineId,
      });

      if (data?.success) {
        toast.success('License activated successfully! 🎉');
        if (refreshUser) await refreshUser();
        loadRequests();
      }
    } catch (err) {
      console.error('Activation error:', err);
      toast.error(err.response?.data?.message || 'Failed to activate license');
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard style={{ color: 'var(--green-primary)' }} size={26} />
            {t('myPayments')}
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
            Track your manual mobile money transfers and retrieve your issued license keys.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-ghost"
            onClick={loadRequests}
            disabled={loading}
            title="Refresh payments"
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
          <Link to="/pricing" className="btn btn-primary">
            + Upgrade / Buy Plan
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading your payment requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            maxWidth: '540px',
            margin: '40px auto',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--text-light)',
            }}
          >
            <CreditCard size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
            {t('noPaymentsYet')}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            Choose a plan that fits your business, pay with MTN MoMo or Airtel Money, and get your activation license key.
          </p>
          <Link to="/pricing" className="btn btn-primary">
            View Pricing Plans <ArrowRight size={16} style={{ marginLeft: 6 }} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {requests.map((req) => {
            const isApproved = req.status === 'approved';
            const isPending = req.status === 'pending';
            const isRejected = req.status === 'rejected';

            const statusBg = isApproved
              ? 'rgba(16, 185, 129, 0.1)'
              : isPending
              ? 'rgba(245, 158, 11, 0.1)'
              : 'rgba(239, 68, 68, 0.1)';

            const statusColor = isApproved ? '#10B981' : isPending ? '#D97706' : '#EF4444';
            const statusBorder = isApproved ? '#A7F3D0' : isPending ? '#FDE68A' : '#FECACA';

            return (
              <div
                key={req._id}
                className="card"
                style={{
                  padding: '22px',
                  borderLeft: `5px solid ${statusColor}`,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Request Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 800, textTransform: 'capitalize' }}>
                        {req.plan} Pro Plan
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: statusBg,
                          color: statusColor,
                          border: `1px solid ${statusBorder}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        {isApproved && <CheckCircle2 size={13} />}
                        {isPending && <Clock size={13} />}
                        {isRejected && <XCircle size={13} />}
                        {isApproved
                          ? t('approved')
                          : isPending
                          ? t('pendingVerification')
                          : t('rejected')}
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Submitted on {formatDate(req.createdAt)} • Ref: <strong>{req.reference}</strong>
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                      {formatCurrency(req.amountPaid || 0)}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      via {req.network} Mobile Money
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    background: 'var(--bg-subtle)',
                    padding: '14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Customer Name</span>
                    <strong>{req.customerName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Phone Number</span>
                    <strong>{req.customerPhone}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Transaction ID</span>
                    <strong style={{ fontFamily: 'monospace', fontSize: '14px' }}>{req.transactionId}</strong>
                  </div>
                  {req.screenshotUrl && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Receipt</span>
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(req.screenshotUrl)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--green-primary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ExternalLink size={13} /> View Screenshot
                      </button>
                    </div>
                  )}
                </div>

                {/* Approved State: License Key Box */}
                {isApproved && req.licenseKey && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1.5px solid #10B981',
                      borderRadius: '10px',
                      padding: '16px',
                      marginTop: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Key size={18} style={{ color: '#10B981' }} />
                      <span style={{ fontWeight: 800, fontSize: '14px', color: '#065F46' }}>
                        {t('licenseKeyIssued')}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        background: '#ffffff',
                        border: '1px solid #D1FAE5',
                        borderRadius: '8px',
                        padding: '10px 14px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '17px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          letterSpacing: '1px',
                          color: '#047857',
                        }}
                      >
                        {req.licenseKey}
                      </span>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleCopyKey(req.licenseKey)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          {copiedKey === req.licenseKey ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                          {copiedKey === req.licenseKey ? t('copied') || 'Copied!' : t('copyKey')}
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={activatingId === req._id}
                          onClick={() => handleActivateLicense(req.licenseKey, req._id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <ShieldCheck size={14} />
                          {activatingId === req._id ? 'Activating...' : t('activateNow')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending State Notice */}
                {isPending && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid #FCD34D',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      fontSize: '13px',
                      color: '#92400E',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Clock size={16} style={{ flexShrink: 0 }} />
                    <span>
                      Your payment of {formatCurrency(req.amountPaid)} is currently being checked by our admin team against the {req.network} statement. Once verified, your license key will be displayed here immediately.
                    </span>
                  </div>
                )}

                {/* Rejected State Notice */}
                {isRejected && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid #FCA5A5',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      fontSize: '13px',
                      color: '#991B1B',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
                      <AlertCircle size={15} />
                      {t('rejectionReason')}:
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: '13.5px' }}>
                      {req.rejectReason || 'The transaction ID could not be located on our mobile money statement.'}
                    </p>
                    <Link to="/pricing" className="btn btn-sm btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      Submit New Payment
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Screenshot Viewer Modal */}
      {selectedReceipt && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedReceipt(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card"
            style={{ maxWidth: '600px', width: '90%', margin: '40px auto', padding: '16px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>Receipt Screenshot Preview</h3>
            <img
              src={selectedReceipt}
              alt="Receipt Screenshot"
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '6px', objectFit: 'contain' }}
            />
            <div style={{ marginTop: '14px' }}>
              <button className="btn btn-ghost" onClick={() => setSelectedReceipt(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
