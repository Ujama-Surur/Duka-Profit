import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, ArrowRight, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/api';

export default function CurrencyProtectionWidget({ data, isOffline = false }) {
  const navigate = useNavigate();

  if (!data || !data.isEnabled) {
    return null;
  }

  const {
    baseCurrency = 'USD',
    sellingCurrency = 'SSP',
    currentRate,
    rateChangePercent = 0,
    productsNeedingReview = 0,
    productsBelowReplacement = 0,
    totalReplacementGap = 0,
  } = data;

  const hasUrgentAlert = productsBelowReplacement > 0;
  const hasReviewAlert = productsNeedingReview > 0;

  return (
    <div
      className="card animate-fade-in"
      style={{
        border: hasUrgentAlert ? '1.5px solid #F59E0B' : '1px solid var(--border)',
        background: hasUrgentAlert ? 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)' : '#FFFFFF',
        padding: '18px 22px',
        marginBottom: '20px',
        boxShadow: hasUrgentAlert ? '0 4px 16px rgba(245, 158, 11, 0.12)' : 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Left: Currency Header & Rate */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: hasUrgentAlert ? '#FEF3C7' : 'var(--bg-subtle)',
              color: hasUrgentAlert ? '#D97706' : 'var(--green-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {hasUrgentAlert ? <AlertTriangle size={22} /> : <ShieldAlert size={22} />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Currency Protection
              </span>
              {isOffline && (
                <span className="badge badge-yellow" style={{ fontSize: '11px', padding: '2px 6px' }}>
                  Offline Rate
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>
                1 {baseCurrency} = {currentRate != null && !isNaN(Number(currentRate)) ? Number(currentRate).toLocaleString() : '—'} {sellingCurrency}
              </span>

              {rateChangePercent !== 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: rateChangePercent > 0 ? '#FEE2E2' : '#DCFCE7',
                    color: rateChangePercent > 0 ? '#DC2626' : '#16A34A',
                  }}
                >
                  {rateChangePercent > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {rateChangePercent > 0 ? `+${rateChangePercent}%` : `${rateChangePercent}%`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Protection Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block' }}>Below Replacement</span>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: productsBelowReplacement > 0 ? '#DC2626' : '#16A34A',
              }}
            >
              {productsBelowReplacement} {productsBelowReplacement === 1 ? 'product' : 'products'}
            </span>
          </div>

          {totalReplacementGap > 0 && (
            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block' }}>Replacement Deficit</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#DC2626' }}>
                -{formatCurrency(totalReplacementGap, sellingCurrency)}
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/pricing/rates')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} />
            <span>Update Rate</span>
          </button>

          <button
            type="button"
            className={hasUrgentAlert ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
            onClick={() => navigate('/pricing/review')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: hasUrgentAlert ? '#D97706' : undefined,
              borderColor: hasUrgentAlert ? '#D97706' : undefined,
            }}
          >
            <span>Review Prices ({productsNeedingReview})</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
