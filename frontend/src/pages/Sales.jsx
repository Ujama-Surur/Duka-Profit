import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate, formatTime, offlineData } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import styles from './Sales.module.css';
import { ShoppingCart, Zap, Hash, Banknote, Coins, BarChart3, WifiOff, CheckCircle2, Printer, Utensils, Smartphone, Shirt, Home, Package } from 'lucide-react';

export default function Sales() {
  const { t } = useTranslation();
  const { user } = useAuth();
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
        toast('Sale saved offline', { icon: <WifiOff size={16} /> });
      }

      setSales(prev => [newSale, ...prev.slice(0, 19)]);
      
      const fullSale = {
        _id: newSale._id || `temp_${Date.now()}`,
        createdAt: newSale.createdAt || new Date().toISOString(),
        totalAmount: calcRevenue(),
        paymentMethod: 'cash',
        items: [{
          productName: selectedProduct?.productName,
          quantity: form.quantity,
          unitPrice: selectedProduct?.sellingPrice,
          subtotal: calcRevenue()
        }]
      };

      setShowSuccess({ 
        profit: calcProfit(), 
        revenue: calcRevenue(), 
        product: selectedProduct?.productName,
        fullSale 
      });
      setForm({ productId: '', quantity: 1 });
      setSelectedProduct(null);

      setTimeout(() => setShowSuccess(null), 5000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record sale');
    } finally {
      setSaving(false);
    }
  };



  const printReceipt = (sale) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${sale._id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            h1 { text-align: center; color: #06C; margin-bottom: 5px; }
            .receipt-header { text-align: center; color: #666; font-size: 12px; margin-bottom: 5px; }
            .receipt-id { text-align: center; color: #666; font-size: 12px; margin-bottom: 5px; }
            .date { text-align: center; color: #666; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #06C; color: white; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
            .payment { text-align: right; color: #666; margin-top: 5px; }
            .thank-you { text-align: center; color: #666; margin-top: 30px; }
          </style>
        </head>
        <body>
          <h1>${user?.storeName || 'Duka Profit'}</h1>
          ${user?.receiptHeader ? `<div class="receipt-header">${user.receiptHeader}</div>` : ''}
          <div class="receipt-id">Receipt #${sale._id}</div>
          <div class="date">${formatDate(new Date(sale.createdAt))} ${formatTime(sale.createdAt)}</div>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">Total: ${formatCurrency(sale.totalAmount)}</div>
          <div class="payment">Payment: ${sale.paymentMethod.toUpperCase()}</div>
          <div class="thank-you">${user?.receiptFooter || 'Thank you for your purchase!'}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const quickQuantity = (qty) => setForm(prev => ({ ...prev, quantity: qty }));

  const categoryIcon = (c, size = 16) => {
    const icons = {
      food: <Utensils size={size} />,
      electronics: <Smartphone size={size} />,
      clothing: <Shirt size={size} />,
      household: <Home size={size} />,
      other: <Package size={size} />
    };
    return icons[c] || <Package size={size} />;
  };

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingCart size={24} /> {t('sales')}</h1>
        <p className="page-subtitle">Record a sale quickly</p>
      </div>

      <div className={styles.layout}>
        {/* Sale Entry Form */}
        <div className={styles.formSection}>
          <div className="card">
            <h2 className={styles.formTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={20} /> {t('quickSale')}</h2>



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
                        {p.productName} ({t(p.category || 'other')}) — {formatCurrency(p.sellingPrice)} 
                        {p.stock <= p.lowStockThreshold && ' (Low Stock)'}
                        {p.category === 'food' && p.isExpired && ' (Expired)'}
                      </option>
                    ))}
                  </select>
                )}
                {errors.productId && <span className="form-error">{errors.productId}</span>}
              </div>

              {/* Selected product preview */}
              {selectedProduct && (
                <div className={styles.productPreview}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>{categoryIcon(selectedProduct.category, 20)}</span>
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
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Hash size={16} /> {t('quantity')}</label>
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
                  <div className={styles.profitPreviewItem} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Banknote size={18} color="var(--text-muted)" />
                    <strong>{formatCurrency(calcRevenue())}</strong>
                  </div>
                  <div className={`${styles.profitPreviewItem} ${styles.profitPreviewHighlight}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Coins size={18} color="var(--green-primary)" />
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Zap size={18} /> {t('saveSale')}</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Recent Sales */}
        <div className={styles.historySection}>
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:8}}>
              <h2 style={{fontSize:18,fontWeight:700,display:'flex',alignItems:'center',gap:8}}><BarChart3 size={20} /> {t('todaySales')}</h2>
              <span className="badge badge-green">{sales.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length} sales</span>
            </div>

            {loading ? (
              <div style={{display:'flex',justifyContent:'center',padding:'40px 0'}}><div className="spinner"/></div>
            ) : sales.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><ShoppingCart size={48} /></div>
                <p style={{color:'var(--text-muted)'}}>No sales yet today</p>
              </div>
            ) : (
              <div className={styles.salesList}>
                {sales.map((sale, i) => (
                  <div key={sale._id || i} className={`${styles.saleItem} ${sale.offline ? styles.saleOffline : ''}`}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>{categoryIcon(sale.product?.category, 18)}</span>
                    <div className={styles.saleInfo}>
                      <p className={styles.saleName}>{sale.product?.productName || 'Unknown Product'}</p>
                      <p className={styles.saleMeta}>
                        {sale.quantity} unit{sale.quantity !== 1 ? 's' : ''} · {formatTime(sale.createdAt)}
                        {sale.offline && <span className={styles.offlineBadge} title="Offline" style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center' }}><WifiOff size={12} /></span>}
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
        <div className={styles.successOverlay} onClick={() => setShowSuccess(null)}>
          <div className={styles.successCard} onClick={e => e.stopPropagation()}>
            <div className={styles.successIcon} style={{ color: 'var(--green-primary)', display: 'flex', justifyContent: 'center' }}><CheckCircle2 size={48} /></div>
            <p className={styles.successTitle}>{t('saleRecorded')}</p>
            <p className={styles.successProduct}>{showSuccess.product}</p>
            <div className={styles.successProfit}>
              <span>Profit earned:</span>
              <strong>+{formatCurrency(showSuccess.profit)}</strong>
            </div>
            
            <button 
              className="btn btn-secondary btn-full" 
              style={{ marginTop: '16px' }}
              onClick={() => {
                printReceipt(showSuccess.fullSale);
                setShowSuccess(null);
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Printer size={16} /> Print Receipt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
