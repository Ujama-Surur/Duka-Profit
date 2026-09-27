import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Check, 
  CheckCheck, 
  Pencil, 
  RefreshCw, 
  DollarSign, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  History,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import api, { formatCurrency, offlineData } from '../utils/api';
import styles from './Products.module.css';

export default function PriceReview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [currentRate, setCurrentRate] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'below_replacement', 'currency_linked'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editedPrices, setEditedPrices] = useState({});
  const [editingProductId, setEditingProductId] = useState(null);
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
      const [settingsRes, rateRes, productsRes] = await Promise.all([
        api.get('/currency/settings').catch(() => ({ data: { baseCurrency: 'USD', sellingCurrency: 'SSP', isEnabled: true } })),
        api.get('/currency/rate/current').catch(() => ({ data: null })),
        api.get('/currency/review-products'),
      ]);

      setSettings(settingsRes.data);
      setCurrentRate(rateRes.data);
      setProducts(productsRes.data || []);

      // Cache review products offline
      await offlineData.set('currency_review_products', productsRes.data || []);
      if (rateRes.data) await offlineData.set('current_exchange_rate', rateRes.data);
    } catch (err) {
      console.error('Failed to load review products:', err);
      // Attempt offline fallback
      const cached = await offlineData.get('currency_review_products');
      const cachedRate = await offlineData.get('current_exchange_rate');
      if (cached) {
        setProducts(cached);
        toast('Using offline cached price review data', { icon: <Clock size={16} /> });
      }
      if (cachedRate) setCurrentRate(cachedRate);
    } finally {
      setLoading(false);
    }
  };

  const sellingCurrency = settings?.sellingCurrency || 'SSP';
  const baseCurrency = settings?.baseCurrency || 'USD';

  // Filter products
  const filteredProducts = products.filter(p => {
    if (filter === 'below_replacement') return p.isBelowReplacementCost;
    if (filter === 'currency_linked') return p.pricingMode === 'currency_linked';
    return true;
  });

  const belowReplacementCount = products.filter(p => p.isBelowReplacementCost).length;
  const totalReplacementGap = products.reduce((sum, p) => sum + ((p.replacementGap || 0) * (p.stock || 0)), 0);

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p._id)));
    }
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Price editing in-place
  const handlePriceChange = (productId, value) => {
    setEditedPrices(prev => ({
      ...prev,
      [productId]: value,
    }));
  };

  const getEffectivePrice = (product) => {
    if (editedPrices[product._id] !== undefined) {
      return parseFloat(editedPrices[product._id]) || 0;
    }
    return product.suggestedSellingPrice || product.sellingPrice;
  };

  // Batch or single price approval
  const applyApprovals = async (targetProducts, reason = 'Price review manual approval') => {
    if (!targetProducts || targetProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    const payload = targetProducts.map(p => ({
      productId: p._id,
      newPrice: getEffectivePrice(p),
    }));

    // Client-side guard: ensure price > costPrice
    for (const item of payload) {
      const prod = products.find(p => p._id === item.productId);
      if (prod && item.newPrice <= prod.costPrice && prod.costPrice > 0) {
        toast.error(`Price for ${prod.productName} must be higher than historical cost (${formatCurrency(prod.costPrice, sellingCurrency)})`);
        return;
      }
    }

    setSaving(true);
    try {
      if (isOffline) {
        // Queue operation offline
        await offlineData.queueOperation({
          method: 'post',
          url: '/currency/apply-prices',
          data: { approvals: payload, reason },
        });
        toast.success(`Queued ${payload.length} price change(s) for sync on reconnect`);
        // Optimistically update local view
        setProducts(prev => prev.filter(p => !payload.some(item => item.productId === p._id)));
        setSelectedIds(new Set());
      } else {
        const { data } = await api.post('/currency/apply-prices', { approvals: payload, reason });
        if (data.successCount > 0) {
          toast.success(`Successfully updated ${data.successCount} product price(s)!`);
          // Remove approved products from list
          const approvedIds = data.results.map(r => r.productId);
          setProducts(prev => prev.filter(p => !approvedIds.includes(p._id)));
          setSelectedIds(new Set());
        }
        if (data.errors && data.errors.length > 0) {
          toast.error(`${data.errors.length} product(s) could not be updated.`);
        }
      }
    } catch (err) {
      console.error('Error applying price approvals:', err);
      toast.error(err.response?.data?.message || 'Failed to update prices.');
    } finally {
      setSaving(false);
      setEditingProductId(null);
    }
  };

  const handleDismissProduct = async (product) => {
    // Dismissing means user chooses to keep current selling price
    try {
      await api.put(`/products/${product._id}`, {
        priceReviewRequired: false,
      });
      setProducts(prev => prev.filter(p => p._id !== product._id));
      toast('Product dismissed from price review.', { icon: <Info size={16} /> });
    } catch (err) {
      toast.error('Failed to dismiss product review.');
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
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
          <h1 style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            Review Price Changes
            {belowReplacementCount > 0 && (
              <span className="badge badge-red" style={{ fontSize: '13px', padding: '4px 10px' }}>
                {belowReplacementCount} Below Replacement Cost
              </span>
            )}
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Exchange rate changes have affected your stock replacement costs. Review and approve suggested prices.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/pricing/rates')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} />
            <span>Rate History</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={products.length === 0 || saving}
            onClick={() => applyApprovals(filteredProducts, 'Bulk approval of all review prices')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCheck size={16} />
            <span>Apply All Suggested ({filteredProducts.length})</span>
          </button>
        </div>
      </div>

      {/* Info Notice & Current Rate Banner */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          background: belowReplacementCount > 0 ? '#FEF2F2' : '#F0FDF4',
          border: belowReplacementCount > 0 ? '1px solid #FECACA' : '1px solid #BBF7D0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: belowReplacementCount > 0 ? '#EF4444' : '#16A34A',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {belowReplacementCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              Active Rate: 1 {baseCurrency} = {currentRate?.rate != null && !isNaN(Number(currentRate.rate)) ? Number(currentRate.rate).toLocaleString() : '—'} {sellingCurrency}
              {Boolean(currentRate?.changePercent) && (
                <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 600, color: currentRate.changePercent > 0 ? '#DC2626' : '#16A34A' }}>
                  ({currentRate.changePercent > 0 ? `+${currentRate.changePercent}%` : `${currentRate.changePercent}%`})
                </span>
              )}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              {belowReplacementCount > 0
                ? `Selling below replacement cost means selling each unit results in cash shortfall when restocking.`
                : `All products meet your target replacement margin.`}
            </div>
          </div>
        </div>

        {totalReplacementGap > 0 && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: 700, textTransform: 'uppercase' }}>Total Replacement Gap</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626' }}>
              -{formatCurrency(totalReplacementGap, sellingCurrency)}
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs & Bulk Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('all')}
          >
            All Needing Review ({products.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filter === 'below_replacement' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('below_replacement')}
            style={filter === 'below_replacement' ? { backgroundColor: '#DC2626', borderColor: '#DC2626' } : {}}
          >
            ⚠️ Below Replacement ({belowReplacementCount})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filter === 'currency_linked' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('currency_linked')}
          >
            Currency-Linked Mode
          </button>
        </div>

        {/* Selected Batch Action */}
        {selectedIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{selectedIds.size} selected</span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={saving}
              onClick={() => {
                const selectedProducts = products.filter(p => selectedIds.has(p._id));
                applyApprovals(selectedProducts);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={14} />
              <span>Apply Selected</span>
            </button>
          </div>
        )}
      </div>

      {/* Products Review Table */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Analyzing currency valuation...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>All Prices are Up to Date!</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px' }}>
            No products are currently priced below replacement cost or requiring rate adjustment.
          </p>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/products')}>
            View Product Catalog
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Product</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Base Cost</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Purchase Cost</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Current Price</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Replacement Cost</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Suggested Price</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status / Difference</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const isSelected = selectedIds.has(p._id);
                const isEditing = editingProductId === p._id;
                const effectiveSuggested = getEffectivePrice(p);

                return (
                  <tr
                    key={p._id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: p.isBelowReplacementCost ? '#FFFBEB' : isSelected ? '#F0FDF4' : 'transparent',
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(p._id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* Product Name */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13.5px' }}>{p.productName}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                        <span>{p.category}</span>
                        <span>•</span>
                        <span>Stock: {p.stock}</span>
                      </div>
                    </td>

                    {/* Base Cost (e.g. $20 USD) */}
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)' }}>
                      {p.baseCost ? `${p.baseCost} ${p.currency || baseCurrency}` : '—'}
                    </td>

                    {/* Historical Purchase Cost Paid */}
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(p.costPrice, sellingCurrency)}
                    </td>

                    {/* Current Customer Selling Price */}
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(p.sellingPrice, sellingCurrency)}
                    </td>

                    {/* Replacement Cost Today */}
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: p.isBelowReplacementCost ? '#DC2626' : 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(p.currentReplacementCost, sellingCurrency)}
                    </td>

                    {/* Suggested Selling Price (with Inline Edit) */}
                    <td style={{ padding: '14px 16px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            className="input"
                            style={{ width: '110px', padding: '4px 8px', fontSize: '13px' }}
                            value={editedPrices[p._id] !== undefined ? editedPrices[p._id] : p.suggestedSellingPrice}
                            onChange={(e) => handlePriceChange(p._id, e.target.value)}
                            min={p.costPrice || 0}
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm btn-icon"
                            onClick={() => applyApprovals([p])}
                            title="Save & Approve Price"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, color: 'var(--green-primary)', fontFamily: 'var(--font-mono)' }}>
                            {formatCurrency(effectiveSuggested, sellingCurrency)}
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => setEditingProductId(p._id)}
                            title="Edit suggested price"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status & Margin Gap */}
                    <td style={{ padding: '14px 16px' }}>
                      {p.isBelowReplacementCost ? (
                        <div>
                          <span className="badge badge-red" style={{ fontSize: '11px', fontWeight: 800 }}>
                            ⚠️ Below Replacement
                          </span>
                          <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, marginTop: '2px' }}>
                            Gap: -{formatCurrency(p.replacementGap, sellingCurrency)}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="badge badge-yellow" style={{ fontSize: '11px', fontWeight: 700 }}>
                            Rate Linked
                          </span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Margin: +{p.targetMargin || 15}%
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Row Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={saving}
                          onClick={() => applyApprovals([p])}
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDismissProduct(p)}
                          title="Keep current price"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Keep Price
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
