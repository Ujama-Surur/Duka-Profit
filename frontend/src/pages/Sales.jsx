import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate, formatTime, offlineData } from '../utils/api';
import styles from './Sales.module.css';

export default function Sales() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ productId: '', quantity: 1 });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuccess, setShowSuccess] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (form.productId) {
      const p = products.find(p => p._id === form.productId);
      setSelectedProduct(p || null);
    } else {
      setSelectedProduct(null);
    }
  }, [form.productId, products]);

  const loadData = async () => {
    try {
      const [prodRes, salesRes] = await Promise.all([
        api.get('/products'),
        api.get('/sales?limit=20'),
      ]);
      setProducts(prodRes.data);
      setSales(salesRes.data);
      await offlineData.set('products', prodRes.data);
      await offlineData.set('recent_sales', salesRes.data);
    } catch {
      const [cachedProducts, cachedSales] = await Promise.all([
        offlineData.get('products'),
        offlineData.get('recent_sales'),
      ]);
      if (cachedProducts) setProducts(cachedProducts);
      if (cachedSales) setSales(cachedSales);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (selectedProduct && selectedProduct.category === 'food' && !selectedProduct.expirationDate) {
      errs.productId = 'Expiration date required for food items';
    }
    if (!form.productId) errs.productId = 'Please select a product';
    if (!form.quantity || form.quantity < 1) errs.quantity = 'Quantity must be at least 1';
    
    // Check stock availability
    if (selectedProduct && form.quantity > selectedProduct.stock) {
      errs.quantity = `Only ${selectedProduct.stock} units available`;
    }
    
    // Check expiration (only for food items)
    if (selectedProduct && selectedProduct.category === 'food' && selectedProduct.isExpired) {
      errs.productId = 'This product has expired';
    }
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const calcProfit = () => {
    if (!selectedProduct || !form.quantity) return 0;
    return (selectedProduct.sellingPrice - selectedProduct.costPrice) * form.quantity;
  };

  const calcRevenue = () => {
    if (!selectedProduct || !form.quantity) return 0;
    return selectedProduct.sellingPrice * form.quantity;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const saleData = {
        productId: form.productId,
        quantity: Number(form.quantity),
      };

      let newSale;
      if (navigator.onLine) {
        const { data } = await api.post('/sales', saleData);
        newSale = data;
      } else {
        // Store offline
        await offlineData.queueOperation({ method: 'post', url: '/sales', data: saleData });
        newSale = {
          ...saleData,
          _id: `offline_${Date.now()}`,
          profit: calcProfit(),
          product: selectedProduct,
          createdAt: new Date().toISOString(),
          offline: true,
        };
        toast('Sale saved offline 📴', { icon: '📴' });
      }

      setSales(prev => [newSale, ...prev.slice(0, 19)]);
      setShowSuccess({ profit: calcProfit(), revenue: calcRevenue(), product: selectedProduct?.productName });
      setForm({ productId: '', quantity: 1 });
      setSelectedProduct(null);

      setTimeout(() => setShowSuccess(null), 3500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record sale');
    } finally {
      setSaving(false);
    }
  };



  const quickQuantity = (qty) => setForm(prev => ({ ...prev, quantity: qty }));

  const categoryEmoji = (c) => ({food:'🍽️',electronics:'📱',clothing:'👕',household:'🏠',other:'📦'})[c] || '📦';

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1 className="page-title">🛒 {t('sales')}</h1>
        <p className="page-subtitle">Record a sale quickly</p>
      </div>

      <div className={styles.layout}>
        {/* Sale Entry Form */}
        <div className={styles.formSection}>
          <div className="card">
            <h2 className={styles.formTitle}>⚡ {t('quickSale')}</h2>



            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Product Selection */}
              <div className="form-group">
                <label className="form-label">{t('selectProduct')}</label>
                {products.length === 0 ? (
                  <div className={styles.noProducts}>
                    <span>Warning</span>
                    <span>No products yet. <Link to="/products">Add products first</Link></span>
                  </div>
                ) : (
                  <select
                    className={`form-input form-input-lg ${errors.productId ? 'error' : ''}`}
                    value={form.productId}
                    onChange={e => setForm(prev => ({...prev, productId: e.target.value}))}
                  >
                    <option value="">-- Select a product --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>
                        {categoryEmoji(p.category)} {p.productName} — {formatCurrency(p.sellingPrice)} 
                        {p.stock <= p.lowStockThreshold && ' ⚠️ Low Stock'}
                        {p.category === 'food' && p.isExpired && ' ⚠️ Expired'}
                      </option>
                    ))}
                  </select>
                )}
                {errors.productId && <span className="form-error">{errors.productId}</span>}
              </div>

              {/* Selected product preview */}
              {selectedProduct && (
                <div className={styles.productPreview}>
                  <span style={{fontSize:28}}>{categoryEmoji(selectedProduct.category)}</span>
                  <div style={{flex:1}}>
                    <p style={{fontFamily:'var(--font-display)',fontWeight:700}}>{selectedProduct.productName}</p>
                    <p style={{fontSize:13,color:'var(--text-muted)'}}>
                      Cost: {formatCurrency(selectedProduct.costPrice)} → Sell: {formatCurrency(selectedProduct.sellingPrice)}
                    </p>
                    <div style={{marginTop:8,fontSize:12}}>
                      <span style={{color:'var(--text-muted)',fontWeight:600}}>Stock: </span>
                      <span style={{color: selectedProduct.stock <= selectedProduct.lowStockThreshold ? 'var(--red)' : 'var(--green-primary)',fontWeight:700}}>
                        {selectedProduct.stock || 0} units
                        {selectedProduct.stock <= selectedProduct.lowStockThreshold && ' (Low Stock)'}
                      </span>
                    </div>
                    {selectedProduct.expirationDate && selectedProduct.category === 'food' && (
                      <div style={{marginTop:4,fontSize:12}}>
                        <span style={{color:'var(--text-muted)',fontWeight:600}}>Expires: </span>
                        <span style={{color: selectedProduct.isExpired ? 'var(--red)' : 'var(--text-muted)',fontWeight:700}}>
                          {new Date(selectedProduct.expirationDate).toLocaleDateString()}
                          {selectedProduct.isExpired && ' (Expired)'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:11,color:'var(--text-muted)',fontWeight:600}}>PROFIT/UNIT</p>
                    <p className="profit-text" style={{fontSize:16}}>
                      +{formatCurrency(selectedProduct.sellingPrice - selectedProduct.costPrice)}
                    </p>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="form-group">
                <label className="form-label">🔢 {t('quantity')}</label>
                <div className={styles.quantityRow}>
                  <button type="button" className={styles.qtyBtn} onClick={() => setForm(p => ({...p, quantity: Math.max(1, p.quantity - 1)}))}>−</button>
                  <input
                    className={`form-input form-input-lg ${styles.qtyInput} ${errors.quantity ? 'error' : ''}`}
                    type="number"
                    min="1"
                    max={selectedProduct?.stock || 999}
                    value={form.quantity}
                    onChange={e => setForm(prev => ({...prev, quantity: Math.max(1, parseInt(e.target.value) || 1)}))}
                  />
                  <button type="button" className={styles.qtyBtn} onClick={() => setForm(p => ({...p, quantity: p.quantity + 1}))}>＋</button>
                </div>
                {/* Quick quantity buttons */}
                <div className={styles.quickQty}>
                  {[1,2,3,5,10,20].map(q => (
                    <button
                      key={q}
                      type="button"
                      className={`${styles.quickQtyBtn} ${form.quantity === q ? styles.quickQtyBtnActive : ''} ${selectedProduct && q > selectedProduct.stock ? styles.quickQtyBtnDisabled : ''}`}
                      onClick={() => quickQuantity(q)}
                      disabled={selectedProduct && q > selectedProduct.stock}
                      title={selectedProduct && q > selectedProduct.stock ? `Only ${selectedProduct.stock} units available` : undefined}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                {errors.quantity && <span className="form-error">{errors.quantity}</span>}
              </div>

              {/* Profit preview */}
              {selectedProduct && form.quantity >= 1 && (
                <div className={styles.profitPreview}>
                  <div className={styles.profitPreviewItem}>
                    <span>💵</span>
                    <strong>{formatCurrency(calcRevenue())}</strong>
                  </div>
                  <div className={`${styles.profitPreviewItem} ${styles.profitPreviewHighlight}`}>
                    <span>💰</span>
                    <strong style={{color:'var(--green-primary)',fontSize:18}}>+{formatCurrency(calcProfit())}</strong>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={`btn btn-primary btn-xl btn-full ${styles.saveBtn}`}
                disabled={saving || !form.productId}
              >
                {saving ? (
                  <><div className="spinner" style={{width:20,height:20,borderWidth:2}}/>&nbsp;Saving...</>
                ) : (
                  `🚀 ${t('saveSale')}`
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Recent Sales */}
        <div className={styles.historySection}>
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:8}}>
              <h2 style={{fontSize:18,fontWeight:700}}>{t('todaySales')} 📊</h2>
              <span className="badge badge-green">{sales.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length} sales</span>
            </div>

            {loading ? (
              <div style={{display:'flex',justifyContent:'center',padding:'40px 0'}}><div className="spinner"/></div>
            ) : sales.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🛒</div>
                <p style={{color:'var(--text-muted)'}}>No sales yet today</p>
              </div>
            ) : (
              <div className={styles.salesList}>
                {sales.map((sale, i) => (
                  <div key={sale._id || i} className={`${styles.saleItem} ${sale.offline ? styles.saleOffline : ''}`}>
                    <span style={{fontSize:20,flexShrink:0}}>{categoryEmoji(sale.product?.category)}</span>
                    <div className={styles.saleInfo}>
                      <p className={styles.saleName}>{sale.product?.productName || 'Unknown Product'}</p>
                      <p className={styles.saleMeta}>
                        {sale.quantity} unit{sale.quantity !== 1 ? 's' : ''} · {formatTime(sale.createdAt)}
                        {sale.offline && <span className={styles.offlineBadge}>📴</span>}
                      </p>
                    </div>
                    <span className="profit-pill">+{formatCurrency(sale.profit)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Animation */}
      {showSuccess && (
        <div className={styles.successOverlay}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✅</div>
            <p className={styles.successTitle}>{t('saleRecorded')}</p>
            <p className={styles.successProduct}>{showSuccess.product}</p>
            <div className={styles.successProfit}>
              <span>Profit earned:</span>
              <strong>+{formatCurrency(showSuccess.profit)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
