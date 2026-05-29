import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate, offlineData } from '../utils/api';
import styles from './Stock.module.css';
import { 
  Package, Search, Utensils, Smartphone, Shirt, Home, AlertTriangle, 
  Info, Calendar, BarChart3, TrendingUp, Grid, List, Plus, 
  RotateCcw, Sparkles, X, ChevronRight, CornerDownRight, ShieldAlert,
  SlidersHorizontal, RefreshCw
} from 'lucide-react';

export default function Stock() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState('instock'); // 'instock', 'lowstock', 'expiring', 'all'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('duka_stock_view_mode') || 'grid';
  });

  // Stock Adjustment Form State
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [adjustmentQty, setAdjustmentQty] = useState(1);
  const [adjustmentType, setAdjustmentType] = useState('add'); // 'add' or 'sub'
  const [adjustmentReason, setAdjustmentReason] = useState('Audit Correction');
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catsRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      setProducts(prodRes.data);
      setCategories(catsRes.data);
      await offlineData.set('products', prodRes.data);
    } catch (err) {
      const cached = await offlineData.get('products');
      if (cached) {
        setProducts(cached);
        toast('Loaded cached offline stock data.', { icon: '📴' });
      } else {
        toast.error('Failed to load inventory data.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper for Category Emojis
  const categoryEmoji = (c) => ({
    food: <Utensils size={15} />,
    electronics: <Smartphone size={15} />,
    clothing: <Shirt size={15} />,
    household: <Home size={15} />,
    other: <Package size={15} />,
  })[c.toLowerCase()] || <Package size={15} />;

  // Toggle card/table view mode
  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('duka_stock_view_mode', mode);
  };

  // Open adjustment modal
  const openAdjustModal = (product) => {
    setAdjustingProduct(product);
    setAdjustmentQty(1);
    setAdjustmentType('add');
    setAdjustmentReason('Audit Correction');
  };

  // Submit stock adjustment
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    if (adjustmentQty < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    setSavingAdjustment(true);
    const currentStock = adjustingProduct.stock || 0;
    const newStock = adjustmentType === 'add' 
      ? currentStock + adjustmentQty 
      : Math.max(0, currentStock - adjustmentQty);

    try {
      const { data } = await api.put(`/products/${adjustingProduct._id}`, {
        ...adjustingProduct,
        stock: newStock,
        quantity: newStock // Keep in sync
      });

      toast.success(`Updated stock for ${adjustingProduct.productName}! New total: ${newStock}`);
      
      // Update local state
      setProducts(prev => prev.map(p => p._id === data._id ? data : p));
      
      // Update cached offline storage
      const cached = await offlineData.get('products');
      if (cached) {
        await offlineData.set('products', cached.map(p => p._id === data._id ? data : p));
      }

      setAdjustingProduct(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock. Please try again.');
    } finally {
      setSavingAdjustment(false);
    }
  };

  // Date threshold helper: is Expired or Expiring Soon (within 30 days)
  const getExpiryStatus = (expirationDate) => {
    if (!expirationDate) return null;
    const now = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'expired';
    if (diffDays <= 30) return 'expiring_soon';
    return 'good';
  };

  // Filter Categories Lists
  const getFilteredProducts = () => {
    return products.filter(product => {
      // 1. Search filter
      const matchesSearch = product.productName.toLowerCase().includes(search.toLowerCase()) ||
        (product.barcode && product.barcode.includes(search));
      
      // 2. Category filter
      const matchesCategory = !categoryFilter || product.category?.toLowerCase() === categoryFilter.toLowerCase();
      
      if (!matchesSearch || !matchesCategory) return false;

      // 3. Tab filter
      const stockVal = product.stock || 0;
      const threshold = product.lowStockThreshold || 10;
      const expiryStatus = getExpiryStatus(product.expirationDate);

      switch (activeTab) {
        case 'instock':
          return stockVal > 0;
        case 'lowstock':
          return stockVal <= threshold;
        case 'expiring':
          return product.category?.toLowerCase() === 'food' && (expiryStatus === 'expired' || expiryStatus === 'expiring_soon');
        case 'all':
        default:
          return true;
      }
    });
  };

  // Compute stock levels and metrics
  const activeStockItems = products.filter(p => (p.stock || 0) > 0);
  
  const totalStockQuantity = activeStockItems.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalStockValueCost = activeStockItems.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.stock || 0)), 0);
  const totalStockValueRetail = activeStockItems.reduce((sum, p) => sum + ((p.sellingPrice || 0) * (p.stock || 0)), 0);
  const totalProjectedProfit = totalStockValueRetail - totalStockValueCost;

  const lowStockCount = products.filter(p => (p.stock || 0) <= (p.lowStockThreshold || 10)).length;
  
  const expiredOrExpiringCount = products.filter(p => {
    if (p.category?.toLowerCase() !== 'food') return false;
    const status = getExpiryStatus(p.expirationDate);
    return status === 'expired' || status === 'expiring_soon';
  }).length;

  const filteredItems = getFilteredProducts();

  return (
    <div className={styles.page}>
      
      {/* Page Header Area */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerTitle}>
            <TrendingUp size={24} style={{ color: 'var(--green-primary)' }} />
            Stock & Inventory Control
          </h1>
          <p className={styles.headerSubtitle}>
            Monitor active levels, manage near-expiry foods, audit stock counts, and check valuations.
          </p>
        </div>
        
        {/* Toggle List/Grid & Shortcuts */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/inventory-orders')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Order Stock
          </button>
          
          <div className={styles.viewToggle}>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.toggleBtnActive : ''}`}
              onClick={() => handleToggleViewMode('grid')}
              title="Card Grid View"
            >
              <Grid size={16} />
            </button>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'table' ? styles.toggleBtnActive : ''}`}
              onClick={() => handleToggleViewMode('table')}
              title="Detailed Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards Panel */}
      <div className={styles.statsGrid}>
        
        {/* Metric Card 1: Unique Items */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Package size={22} />
          </div>
          <div>
            <p className={styles.statLabel}>Unique Products</p>
            <p className={styles.statValue}>{products.length}</p>
          </div>
        </div>

        {/* Metric Card 2: Total Units */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--green-primary)' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <p className={styles.statLabel}>Total In Stock</p>
            <p className={styles.statValue}>{totalStockQuantity} <span style={{fontSize: 12, fontWeight: 500, color: 'var(--text-muted)'}}>units</span></p>
          </div>
        </div>

        {/* Metric Card 3: Stock Value (Cost) */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <p className={styles.statLabel}>Stock Valuation (Cost)</p>
            <p className={styles.statValue}>{formatCurrency(totalStockValueCost)}</p>
          </div>
        </div>

        {/* Metric Card 4: Profit Potential */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <p className={styles.statLabel}>Projected Net Profit</p>
            <p className={styles.statValue} style={{ color: 'var(--green-primary)' }}>+{formatCurrency(totalProjectedProfit)}</p>
          </div>
        </div>

      </div>

      {/* Critical Alert Banners */}
      <div className={styles.alertsContainer}>
        {lowStockCount > 0 && (
          <div className={`${styles.alertBanner} ${styles.alertBannerYellow}`}>
            <div className={styles.alertLeft}>
              <AlertTriangle size={18} />
              <span>
                <strong>Low Stock Notice:</strong> {lowStockCount} products are running critically low or are out of stock. Consider creating a replenishment request soon.
              </span>
            </div>
            <button className={styles.alertActionBtn} onClick={() => setActiveTab('lowstock')}>
              View Low Stock
            </button>
          </div>
        )}

        {expiredOrExpiringCount > 0 && (
          <div className={`${styles.alertBanner} ${styles.alertBannerRed}`}>
            <div className={styles.alertLeft}>
              <ShieldAlert size={18} />
              <span>
                <strong>Food Expiry Notice:</strong> {expiredOrExpiringCount} perishable items are expired or expiring soon. Check expiration status to secure your quality controls.
              </span>
            </div>
            <button className={styles.alertActionBtn} onClick={() => setActiveTab('expiring')}>
              Check Expiration
            </button>
          </div>
        )}
      </div>

      {/* Navigation Filter Tabs */}
      <div className={styles.tabsBar}>
        <button 
          className={`${styles.tab} ${activeTab === 'instock' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('instock')}
        >
          <span>Active In-Stock</span>
          <span className={styles.tabCountBadge}>{activeStockItems.length}</span>
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'lowstock' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('lowstock')}
        >
          <span>Low & Out of Stock</span>
          <span className={styles.tabCountBadge}>{lowStockCount}</span>
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'expiring' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('expiring')}
        >
          <span>Expiring & Expired</span>
          <span className={styles.tabCountBadge}>{expiredOrExpiringCount}</span>
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>All Products library</span>
          <span className={styles.tabCountBadge}>{products.length}</span>
        </button>
      </div>

      {/* Advanced Filters (Search & Category Selector) */}
      <div className={styles.filtersRow}>
        
        {/* Search */}
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}><Search size={18} /></span>
          <input 
            className={styles.searchInput}
            placeholder="Search stock list by product name or barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Category drop down */}
        <select
          className={styles.filterSelect}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat._id} value={cat.name}>{cat.name}</option>
          ))}
          {categories.length === 0 && (
            <>
              <option value="food">Food & Drinks</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="household">Household</option>
              <option value="other">Other</option>
            </>
          )}
        </select>
        
        <button 
          className="btn btn-secondary" 
          onClick={loadData}
          title="Refresh Data"
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px' }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>

      </div>

      {/* Loading Spinner */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : filteredItems.length === 0 ? (
        
        // Empty State Banner
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Inventory Items Found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto 20px auto', fontSize: 14 }}>
            {search || categoryFilter 
              ? 'No products match your current search queries or filters. Try checking spelling or clearing options.'
              : 'There are currently no products items on this list. Products are added to stock after replenishment orders are approved.'}
          </p>
          {!search && !categoryFilter && (
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/inventory-orders')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> Create Replenishment Order
            </button>
          )}
        </div>

      ) : viewMode === 'grid' ? (
        
        // Render Stock Cards Grid
        <div className={styles.grid}>
          {filteredItems.map(product => {
            const stockVal = product.stock || 0;
            const threshold = product.lowStockThreshold || 10;
            const isOutOfStock = stockVal === 0;
            const isLowStock = stockVal > 0 && stockVal <= threshold;
            
            const expiryStatus = getExpiryStatus(product.expirationDate);
            const isExpired = expiryStatus === 'expired';
            const isExpiringSoon = expiryStatus === 'expiring_soon';

            // Card custom style class based on levels
            let cardClass = styles.itemCard;
            if (isOutOfStock) cardClass += ` ${styles.itemCardOutOfStock}`;
            else if (isLowStock) cardClass += ` ${styles.itemCardLowStock}`;
            else if (isExpired) cardClass += ` ${styles.itemCardExpired}`;

            const profitPerItem = (product.sellingPrice || 0) - (product.costPrice || 0);
            const marginPerItem = product.sellingPrice > 0 
              ? (((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100).toFixed(1) 
              : 0;

            return (
              <div key={product._id} className={cardClass}>
                
                {/* Header Row */}
                <div className={styles.itemHeader}>
                  {product.productImageUrl ? (
                    <img 
                      src={product.productImageUrl} 
                      alt={product.productName} 
                      className={styles.itemImage}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={styles.itemEmojiWrapper}>
                      {categoryEmoji(product.category || 'other')}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className={styles.itemName} title={product.productName}>
                      {product.productName}
                    </h3>
                    <span className={`badge badge-gray ${styles.itemBadge}`}>
                      {product.category || 'other'}
                    </span>
                  </div>
                </div>

                {/* Barcode display */}
                <p className={styles.barcodeText}>
                  Barcode: {product.barcode || 'N/A'}
                </p>

                {/* Stock Level Container */}
                <div className={styles.stockLevelContainer}>
                  <span className={styles.stockLabel}>Stock Quantity:</span>
                  <span className={`${styles.stockValText} ${isOutOfStock ? styles.stockValNone : isLowStock ? styles.stockValLow : ''}`}>
                    {stockVal} {product.unitType || 'pieces'}
                    {isOutOfStock && <span style={{fontSize:10, padding:'1px 5px', background:'#fee2e2', borderRadius:4, color:'#dc2626'}}>OUT</span>}
                    {isLowStock && <span style={{fontSize:10, padding:'1px 5px', background:'#fffbeb', borderRadius:4, color:'#d97706'}}>LOW</span>}
                  </span>
                </div>

                {/* Cost vs Retail prices */}
                <div className={styles.priceDetailsGrid}>
                  <div className={styles.priceCol} style={{ borderRight: '1px solid var(--border)' }}>
                    <span className={styles.priceColLabel}>Cost Price</span>
                    <span className={styles.priceColVal}>{formatCurrency(product.costPrice || 0)}</span>
                  </div>
                  <div className={styles.priceCol} style={{ paddingLeft: 8 }}>
                    <span className={styles.priceColLabel}>Retail Price</span>
                    <span className={styles.priceColValSell}>{formatCurrency(product.sellingPrice || 0)}</span>
                  </div>
                </div>

                {/* Margin & profits */}
                <div className={styles.profitMarginBar}>
                  <span className={styles.profitText}>
                    Profit: <span className={styles.profitValGreen}>+{formatCurrency(profitPerItem)}</span>
                  </span>
                  <span>
                    Margin: <span className={styles.marginValGreen}>{marginPerItem}%</span>
                  </span>
                </div>

                {/* Expiry Dates tags */}
                {product.expirationDate && (
                  <div className={styles.expirationBox}>
                    <Calendar size={13} style={{ color: isExpired ? '#dc2626' : isExpiringSoon ? '#d97706' : 'var(--text-muted)' }} />
                    <span className={isExpired ? styles.expiredText : isExpiringSoon ? styles.expiringText : ''}>
                      {isExpired ? 'Expired: ' : isExpiringSoon ? 'Expiring soon: ' : 'Expiry: '}
                      <strong>{formatDate(product.expirationDate)}</strong>
                    </span>
                  </div>
                )}

                {/* Action button */}
                <button 
                  className={styles.cardAdjustBtn}
                  onClick={() => openAdjustModal(product)}
                >
                  <SlidersHorizontal size={14} />
                  Adjust Stock Count
                </button>

              </div>
            );
          })}
        </div>

      ) : (
        
        // Render Stock Detailed Table View
        <div className={styles.tableContainer}>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.responsiveTable}>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Barcode</th>
                  <th>Cost Price</th>
                  <th>Retail Price</th>
                  <th>Stock Quantity</th>
                  <th>Status Alerts</th>
                  <th>Expiry Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(product => {
                  const stockVal = product.stock || 0;
                  const threshold = product.lowStockThreshold || 10;
                  const isOutOfStock = stockVal === 0;
                  const isLowStock = stockVal > 0 && stockVal <= threshold;
                  
                  const expiryStatus = getExpiryStatus(product.expirationDate);
                  const isExpired = expiryStatus === 'expired';
                  const isExpiringSoon = expiryStatus === 'expiring_soon';

                  // Row highlight classes
                  let rowClass = '';
                  if (isOutOfStock || isExpired) rowClass = styles.tableRowDanger;
                  else if (isLowStock || isExpiringSoon) rowClass = styles.tableRowAlert;

                  return (
                    <tr key={product._id} className={rowClass}>
                      <td style={{ fontWeight: 600 }}>{product.productName}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {categoryEmoji(product.category || 'other')}
                          <span style={{ textTransform: 'capitalize', fontSize: 13 }}>{product.category || 'other'}</span>
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{product.barcode || 'N/A'}</td>
                      <td>{formatCurrency(product.costPrice || 0)}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(product.sellingPrice || 0)}</td>
                      <td style={{ fontWeight: 700 }}>
                        <span className={isOutOfStock ? 'text-red' : isLowStock ? 'text-yellow' : ''}>
                          {stockVal} {product.unitType || 'pieces'}
                        </span>
                      </td>
                      <td>
                        {isOutOfStock ? (
                          <span className="badge badge-red" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Out of Stock</span>
                        ) : isLowStock ? (
                          <span className="badge badge-yellow" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Low Stock</span>
                        ) : (
                          <span className="badge badge-green" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Ok</span>
                        )}
                      </td>
                      <td>
                        {product.expirationDate ? (
                          <span 
                            className={isExpired ? 'text-red font-bold' : isExpiringSoon ? 'text-yellow font-bold' : ''} 
                            style={{ fontSize: 13 }}
                          >
                            {formatDate(product.expirationDate)}
                            {isExpired && ' (EXPIRED)'}
                            {isExpiringSoon && ' (EXPIRING)'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => openAdjustModal(product)}
                          style={{ padding: '6px 10px', fontSize: 12 }}
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {/* Manual Quick Adjust Stock Modal */}
      {adjustingProduct && (
        <div className={styles.modalOverlay} onClick={() => setAdjustingProduct(null)}>
          <div className={styles.modalWindow} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Adjust Stock Quantity</h3>
              <button className={styles.closeBtn} onClick={() => setAdjustingProduct(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Product Banner Info */}
            <div className={styles.modalProductBanner}>
              {adjustingProduct.productImageUrl ? (
                <img 
                  src={adjustingProduct.productImageUrl} 
                  alt={adjustingProduct.productName} 
                  style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                />
              ) : (
                <div className={styles.itemEmojiWrapper} style={{ width: '40px', height: '40px', background: 'var(--bg-card)' }}>
                  {categoryEmoji(adjustingProduct.category || 'other')}
                </div>
              )}
              <div className={styles.modalProductInfo}>
                <h4>{adjustingProduct.productName}</h4>
                <p>Current Stock: <strong>{adjustingProduct.stock || 0} {adjustingProduct.unitType || 'pieces'}</strong></p>
              </div>
            </div>

            {/* Adjustment Form */}
            <form onSubmit={handleSaveAdjustment}>
              
              {/* Add vs Subtract selector */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Adjustment Mode</label>
                <div className={styles.adjustTypeSelector}>
                  <button
                    type="button"
                    className={`${styles.adjustTypeBtn} ${adjustmentType === 'add' ? styles.adjustTypeBtnActiveAdd : ''}`}
                    onClick={() => setAdjustmentType('add')}
                  >
                    ＋ Increase Stock
                  </button>
                  <button
                    type="button"
                    className={`${styles.adjustTypeBtn} ${adjustmentType === 'sub' ? styles.adjustTypeBtnActiveSub : ''}`}
                    onClick={() => setAdjustmentType('sub')}
                  >
                    − Write-off / Reduce
                  </button>
                </div>
              </div>

              {/* Quantity Select row */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ textAlign: 'center', display: 'block', marginBottom: 8 }}>
                  Quantity to {adjustmentType === 'add' ? 'Add' : 'Deduct'}
                </label>
                <div className={styles.adjustSelectorRow}>
                  <button
                    type="button"
                    className={styles.adjustMathBtn}
                    onClick={() => setAdjustmentQty(prev => Math.max(1, prev - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    className={styles.adjustMathInput}
                    value={adjustmentQty}
                    onChange={e => setAdjustmentQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <button
                    type="button"
                    className={styles.adjustMathBtn}
                    onClick={() => setAdjustmentQty(prev => prev + 1)}
                  >
                    ＋
                  </button>
                </div>
              </div>

              {/* Reason selection */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Adjustment Reason</label>
                <select 
                  className={styles.filterSelect}
                  style={{ width: '100%', minWidth: '100%' }}
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                >
                  <option value="Audit Correction">Audit Inventory Correction</option>
                  <option value="Breakage/Damage">Breakage & Damage</option>
                  <option value="Expiry Write-off">Expiry Write-off / Waste</option>
                  <option value="Theft/Loss">Theft & Loss</option>
                  <option value="Promotion/Gifts">Promotion / Staff Gift</option>
                  <option value="Supplier Discrepancy">Supplier Delivery discrepancy</option>
                  <option value="Other">Other Reasons</option>
                </select>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => setAdjustingProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-full ${adjustmentType === 'add' ? 'btn-primary' : 'btn-danger'}`}
                  disabled={savingAdjustment}
                  style={adjustmentType === 'add' ? {} : { background: '#ef4444', border: 'none' }}
                >
                  {savingAdjustment ? 'Saving...' : `Save Adjustment`}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
