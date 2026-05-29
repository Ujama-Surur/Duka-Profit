import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate, formatTime, offlineData } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import styles from './Sales.module.css';
import { ShoppingCart, Zap, Hash, Banknote, Coins, BarChart3, WifiOff, CheckCircle2, Printer, Utensils, Smartphone, Shirt, Home, Package, Search, SlidersHorizontal, X } from 'lucide-react';

export default function Sales() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ productId: '', quantity: 1, paymentMethod: 'cash', customerName: '', customerPhone: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuccess, setShowSuccess] = useState(null);

  // History Filter States
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategory, setHistoryCategory] = useState('');
  const [historyDateRange, setHistoryDateRange] = useState('today'); // 'today', 'yesterday', 'last7', 'custom'
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historySortBy, setHistorySortBy] = useState('date_desc');
  const [salesLoading, setSalesLoading] = useState(false);
  const [showSalesFilters, setShowSalesFilters] = useState(false);

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
      const prodRes = await api.get('/products');
      setProducts(prodRes.data);
      await offlineData.set('products', prodRes.data);
    } catch {
      const cachedProducts = await offlineData.get('products');
      if (cachedProducts) setProducts(cachedProducts);
    } finally {
      setLoading(false);
    }
  };

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      let fromDateStr = '';
      let toDateStr = '';
      const now = new Date();

      if (historyDateRange === 'today') {
        const d = new Date(now);
        d.setHours(0,0,0,0);
        fromDateStr = d.toISOString();
      } else if (historyDateRange === 'yesterday') {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        d.setHours(0,0,0,0);
        fromDateStr = d.toISOString();
        const dTo = new Date(now);
        dTo.setDate(dTo.getDate() - 1);
        dTo.setHours(23,59,59,999);
        toDateStr = dTo.toISOString();
      } else if (historyDateRange === 'last7') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        d.setHours(0,0,0,0);
        fromDateStr = d.toISOString();
      } else if (historyDateRange === 'custom') {
        if (historyDateFrom) {
          const d = new Date(historyDateFrom);
          d.setHours(0,0,0,0);
          fromDateStr = d.toISOString();
        }
        if (historyDateTo) {
          const d = new Date(historyDateTo);
          d.setHours(23,59,59,999);
          toDateStr = d.toISOString();
        }
      }

      let url = '/sales?limit=150';
      if (fromDateStr) url += `&from=${encodeURIComponent(fromDateStr)}`;
      if (toDateStr) url += `&to=${encodeURIComponent(toDateStr)}`;

      const { data } = await api.get(url);
      setSales(data);
      await offlineData.set('recent_sales', data);
    } catch (err) {
      const cached = await offlineData.get('recent_sales');
      if (cached) setSales(cached);
    } finally {
      setSalesLoading(false);
    }
  }, [historyDateRange, historyDateFrom, historyDateTo]);

  useEffect(() => {
    if (!loading) {
      loadSales();
    }
  }, [historyDateRange, historyDateFrom, historyDateTo, loading, loadSales]);

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

    if (form.paymentMethod === 'credit') {
      if (!form.customerName || !form.customerName.trim()) {
        errs.customerName = 'Customer name is required for credit sales';
      }
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
        paymentMethod: form.paymentMethod,
        customerName: form.paymentMethod === 'credit' ? form.customerName : undefined,
        customerPhone: form.paymentMethod === 'credit' ? form.customerPhone : undefined,
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
        paymentMethod: form.paymentMethod,
        customerName: form.paymentMethod === 'credit' ? form.customerName : undefined,
        customerPhone: form.paymentMethod === 'credit' ? form.customerPhone : undefined,
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
      setForm({ productId: '', quantity: 1, paymentMethod: 'cash', customerName: '', customerPhone: '' });
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
            .payment { text-align: right; color: #666; margin-top: 5px; text-transform: uppercase; }
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
          <div class="payment">Payment: ${sale.paymentMethod || 'CASH'}</div>
          ${sale.paymentMethod === 'credit' && sale.customerName ? `
            <div style="text-align: right; color: #444; font-size: 13px; margin-top: 5px;">
              <strong>Customer:</strong> ${sale.customerName}
              ${sale.customerPhone ? `<br/><strong>Phone:</strong> ${sale.customerPhone}` : ''}
            </div>
          ` : ''}
          <div class="thank-you">${user?.receiptFooter || 'Thank you for your purchase!'}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleClearSalesFilters = () => {
    setHistorySearch('');
    setHistoryCategory('');
    setHistoryDateRange('today');
    setHistoryDateFrom('');
    setHistoryDateTo('');
    setHistorySortBy('date_desc');
  };

  const filteredSales = sales.filter(sale => {
    // 1. Search Query
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const nameMatch = sale.productName?.toLowerCase().includes(q) ||
        sale.product?.productName?.toLowerCase().includes(q);
      const barcodeMatch = sale.barcode?.includes(q) || sale.product?.barcode?.includes(q);
      if (!nameMatch && !barcodeMatch) return false;
    }

    // 2. Category Filter
    if (historyCategory) {
      const cat = (sale.category || sale.product?.category || 'other').toLowerCase();
      if (cat !== historyCategory.toLowerCase()) return false;
    }

    return true;
  }).sort((a, b) => {
    if (historySortBy === 'date_desc') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (historySortBy === 'date_asc') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    if (historySortBy === 'revenue_desc') {
      return (b.revenue || b.totalAmount || 0) - (a.revenue || a.totalAmount || 0);
    }
    if (historySortBy === 'revenue_asc') {
      return (a.revenue || a.totalAmount || 0) - (b.revenue || b.totalAmount || 0);
    }
    if (historySortBy === 'profit_desc') {
      return (b.profit || 0) - (a.profit || 0);
    }
    if (historySortBy === 'profit_asc') {
      return (a.profit || 0) - (b.profit || 0);
    }
    return 0;
  });

  const isSalesFiltersActive = historySearch || historyCategory || historySortBy !== 'date_desc' || historyDateRange !== 'today' || historyDateFrom || historyDateTo;

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

              {/* Payment Method Selector */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Banknote size={16} /> Payment Method
                </label>
                <select
                  className="form-input form-input-lg"
                  value={form.paymentMethod}
                  onChange={e => setForm(prev => ({...prev, paymentMethod: e.target.value}))}
                >
                  <option value="cash">Cash</option>
                  <option value="momo">Mobile Money (MoMo)</option>
                  <option value="card">Credit Card</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="credit">Sale on Credit</option>
                </select>
              </div>

              {/* Debtor Fields for Sales on Credit */}
              {form.paymentMethod === 'credit' && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px dashed var(--red)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <p style={{ color: 'var(--red)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <SlidersHorizontal size={14} /> Debtor Information
                  </p>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Customer Name *</label>
                    <input
                      type="text"
                      placeholder="Enter customer name..."
                      className={`form-input ${errors.customerName ? 'error' : ''}`}
                      value={form.customerName}
                      onChange={e => setForm(prev => ({...prev, customerName: e.target.value}))}
                    />
                    {errors.customerName && <span className="form-error" style={{ marginTop: 4, display: 'block' }}>{errors.customerName}</span>}
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Customer Phone</label>
                    <input
                      type="text"
                      placeholder="Enter customer phone (optional)..."
                      className="form-input"
                      value={form.customerPhone}
                      onChange={e => setForm(prev => ({...prev, customerPhone: e.target.value}))}
                    />
                  </div>
                </div>
              )}

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

        {/* Recent Sales History with Advanced Filters */}
        <div className={styles.historySection}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={20} /> Sales History
              </h2>
              <span className="badge badge-green">
                {filteredSales.length} sales
              </span>
            </div>

            {/* Sales Filtering Row */}
            <div className={styles.salesFiltersContainer}>
              <div className={styles.filtersMainRow}>
                {/* Search Product */}
                <div className={styles.searchBox} style={{ minWidth: '150px' }}>
                  <span className={styles.searchIcon}><Search size={14} /></span>
                  <input
                    className={styles.searchInput}
                    placeholder="Search sold item..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                  />
                </div>

                {/* Category Dropdown */}
                <select
                  className={styles.filterSelect}
                  value={historyCategory}
                  onChange={e => setHistoryCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="food">Food & Drinks</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="household">Household</option>
                  <option value="other">Other</option>
                </select>

                {/* Date Presets Dropdown */}
                <select
                  className={styles.filterSelect}
                  value={historyDateRange}
                  onChange={e => setHistoryDateRange(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="custom">Custom Date...</option>
                </select>

                {/* Sort dropdown */}
                <select
                  className={styles.filterSelect}
                  value={historySortBy}
                  onChange={e => setHistorySortBy(e.target.value)}
                >
                  <option value="date_desc">Newest Sold</option>
                  <option value="date_asc">Oldest Sold</option>
                  <option value="revenue_desc">Revenue: High to Low</option>
                  <option value="revenue_asc">Revenue: Low to High</option>
                  <option value="profit_desc">Profit: High to Low</option>
                  <option value="profit_asc">Profit: Low to High</option>
                </select>

                {/* Advanced Toggle */}
                {historyDateRange === 'custom' && (
                  <button
                    type="button"
                    className={`btn btn-secondary ${showSalesFilters ? 'btn-active' : ''}`}
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setShowSalesFilters(!showSalesFilters)}
                  >
                    <SlidersHorizontal size={14} />
                  </button>
                )}

                {/* Clear Filters */}
                {isSalesFiltersActive && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: 'var(--red)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={handleClearSalesFilters}
                  >
                    <X size={14} /> Clear
                  </button>
                )}
              </div>

              {/* Custom Date Pickers Expanded */}
              {historyDateRange === 'custom' && showSalesFilters && (
                <div className={styles.customDatesRow}>
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Date From</label>
                    <input
                      type="date"
                      className={styles.filterInput}
                      value={historyDateFrom}
                      onChange={e => setHistoryDateFrom(e.target.value)}
                    />
                  </div>
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Date To</label>
                    <input
                      type="date"
                      className={styles.filterInput}
                      value={historyDateTo}
                      onChange={e => setHistoryDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sales Loading Spinner / List */}
            {salesLoading || loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
                <div className="spinner" />
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 10px' }}>
                <div className="empty-icon"><ShoppingCart size={36} /></div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '8px 0 4px 0' }}>No Sales Found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {isSalesFiltersActive 
                    ? 'No sales records match your filtering queries. Try resetting filters.' 
                    : 'No sales recorded yet for this date selection.'}
                </p>
                {isSalesFiltersActive && (
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={handleClearSalesFilters}>
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.salesList}>
                {filteredSales.map((sale, i) => (
                  <div key={sale._id || i} className={`${styles.saleItem} ${sale.offline ? styles.saleOffline : ''}`}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
                      {categoryIcon(sale.product?.category || sale.category || 'other', 18)}
                    </span>
                    <div className={styles.saleInfo}>
                      <p className={styles.saleName}>
                        {sale.productName || sale.product?.productName || 'Unknown Product'}
                        {sale.paymentMethod === 'credit' && sale.customerName && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--red)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            Credit: {sale.customerName}
                          </span>
                        )}
                      </p>
                      <p className={styles.saleMeta}>
                        {sale.quantity} unit{sale.quantity !== 1 ? 's' : ''} · {formatTime(sale.createdAt)}
                        <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontWeight: 600 }}>
                          ({formatCurrency(sale.revenue || sale.totalAmount || 0)})
                        </span>
                        <span style={{
                          marginLeft: 8,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: sale.paymentMethod === 'credit' ? 'var(--red)' : 'var(--text-muted)'
                        }}>
                          · {sale.paymentMethod || 'cash'}
                        </span>
                        {sale.offline && (
                          <span className={styles.offlineBadge} title="Offline Saved" style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center' }}>
                            <WifiOff size={12} />
                          </span>
                        )}
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
