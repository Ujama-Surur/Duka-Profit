import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate } from '../utils/api';
import styles from './InventoryOrders.module.css';
import { 
  FileText, Plus, Search, Trash2, Printer, Check, X, 
  AlertTriangle, ArrowRight, CornerDownRight, HelpCircle,
  SlidersHorizontal, Filter
} from 'lucide-react';

export default function InventoryOrders() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'create'
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Form State for creating a new order
  const [orderItems, setOrderItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState('');

  // Detailed Filter States
  const [searchRef, setSearchRef] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minCost, setMinCost] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Selected Order for detail view modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get('/orders'),
        api.get('/products')
      ]);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      toast.error('Failed to load orders or products.');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const url = statusFilter ? `/orders?status=${statusFilter}` : '/orders';
      const { data } = await api.get(url);
      setOrders(data);
    } catch (err) {
      toast.error('Failed to load orders.');
    }
  };

  useEffect(() => {
    if (!loading) {
      loadOrders();
    }
  }, [statusFilter]);

  // Product search inside creation tab
  useEffect(() => {
    if (!searchProduct.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = products.filter(p => 
      p.productName.toLowerCase().includes(searchProduct.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchProduct))
    );
    setSearchResults(filtered.slice(0, 10));
  }, [searchProduct, products]);

  const handleAddProduct = (product) => {
    const exists = orderItems.some(item => item.product === product._id);
    if (exists) {
      toast.error('Product already added to the order.');
      return;
    }

    setOrderItems(prev => [
      ...prev,
      {
        product: product._id,
        productName: product.productName,
        quantity: 1,
        buyingPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice || 0,
        barcode: product.barcode || '',
        expiryDate: product.expirationDate ? new Date(product.expirationDate).toISOString().split('T')[0] : '',
      }
    ]);
    setSearchProduct('');
    setSearchResults([]);
  };

  const handleUpdateItem = (index, field, value) => {
    setOrderItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, [field]: value };
    }));
  };

  const handleRemoveItem = (index) => {
    setOrderItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      toast.error('Please add at least one product to the order.');
      return;
    }

    // Basic validation
    for (const item of orderItems) {
      if (item.quantity <= 0) {
        toast.error(`Invalid quantity for ${item.productName}`);
        return;
      }
      if (item.buyingPrice < 0 || item.sellingPrice < 0) {
        toast.error(`Prices cannot be negative for ${item.productName}`);
        return;
      }
      if (parseFloat(item.sellingPrice) <= parseFloat(item.buyingPrice)) {
        toast.error(`Selling price must be higher than buying price for ${item.productName}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        items: orderItems,
        notes: notes.trim(),
      };
      await api.post('/orders', payload);
      toast.success('Order submitted successfully for approval.');
      setOrderItems([]);
      setNotes('');
      setActiveTab('list');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to approve this order? Stock will be updated.')) return;

    try {
      const { data } = await api.put(`/orders/${orderId}/approve`);
      toast.success('Order approved! Stock successfully updated.');
      setOrders(prev => prev.map(o => o._id === orderId ? data : o));
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(data);
      }
      // Reload products to get latest stock levels
      const prodRes = await api.get('/products');
      setProducts(prodRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve order');
    }
  };

  const handleOpenReject = (order) => {
    setRejectingOrder(order);
    setRejectionReason('');
  };

  const handleRejectOrder = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      const { data } = await api.put(`/orders/${rejectingOrder._id}/reject`, {
        rejectionReason: rejectionReason.trim()
      });
      toast.success('Order rejected.');
      setOrders(prev => prev.map(o => o._id === rejectingOrder._id ? data : o));
      if (selectedOrder?._id === rejectingOrder._id) {
        setSelectedOrder(data);
      }
      setRejectingOrder(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject order');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Delete this pending order? This action cannot be undone.')) return;

    try {
      await api.delete(`/orders/${orderId}`);
      setOrders(prev => prev.filter(o => o._id !== orderId));
      toast.success('Order deleted successfully.');
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err) {
      toast.error('Failed to delete order');
    }
  };

  const printOrder = (order) => {
    const printWindow = window.open('', '_blank');
    const orderDate = new Date(order.createdAt);
    const dateStr = orderDate.toLocaleDateString();
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Order Receipt - ${order.orderNumber}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1f2937; }
            h1 { font-size: 24px; font-weight: 800; text-align: center; color: #16a34a; margin-bottom: 4px; }
            .header-subtitle { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 24px; }
            .meta-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 24px; }
            .meta-col p { margin: 4px 0; font-size: 14px; }
            .meta-label { color: #6b7280; font-weight: 500; }
            .meta-val { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th, td { padding: 12px; text-align: left; font-size: 14px; border-bottom: 1px solid #e5e7eb; }
            th { background: #f9fafb; color: #4b5563; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .total-row { display: flex; justify-content: flex-end; gap: 24px; font-size: 16px; margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
            .total-label { color: #6b7280; font-weight: 600; }
            .total-val { font-weight: 800; }
            .footer { text-align: center; margin-top: 60px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 16px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-approved { background: #d1fae5; color: #065f46; }
            .status-rejected { background: #fee2e2; color: #991b1b; }
          </style>
        </head>
        <body>
          <h1>Stock Replenishment Order</h1>
          <div class="header-subtitle">${order.orderNumber}</div>
          
          <div class="meta-section">
            <div class="meta-col">
              <p><span class="meta-label">Date Generated:</span> <span class="meta-val">${dateStr}</span></p>
              <p><span class="meta-label">Order Number:</span> <span class="meta-val">${order.orderNumber}</span></p>
            </div>
            <div class="meta-col" style="text-align: right;">
              <p><span class="meta-label">Status:</span> <span class="badge status-${order.status}">${order.status}</span></p>
              ${order.approvedAt ? `<p><span class="meta-label">Approved:</span> <span class="meta-val">${new Date(order.approvedAt).toLocaleDateString()}</span></p>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Buying Price</th>
                <th>Selling Price</th>
                <th>Subtotal (Buying)</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td style="font-weight:600;">${item.productName}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.buyingPrice)}</td>
                  <td>${formatCurrency(item.sellingPrice)}</td>
                  <td style="font-weight:600;">${formatCurrency(item.buyingPrice * item.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-row">
            <div><span class="total-label">Total Cost:</span> <span class="total-val">${formatCurrency(order.totalBuyingCost)}</span></div>
            <div><span class="total-label">Projected Sales Value:</span> <span class="total-val">${formatCurrency(order.totalSellingValue)}</span></div>
          </div>

          ${order.notes ? `<div style="margin-top:24px; padding:16px; background:#f9fafb; border-radius:8px;"><p style="margin:0 0 4px 0; font-weight:600; font-size:13px; color:#4b5563;">Notes:</p><p style="margin:0; font-size:14px; color:#1f2937;">${order.notes}</p></div>` : ''}

          <div class="footer">
            Duka Profit Inventory Control System
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusBadgeClass = (status) => {
    return `${styles.statusBadge} ${
      status === 'pending' ? styles.statusPending : 
      status === 'approved' ? styles.statusApproved : 
      status === 'rejected' ? styles.statusRejected : 
      styles.statusCancelled
    }`;
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setSearchRef('');
    setDateFrom('');
    setDateTo('');
    setMinCost('');
    setMaxCost('');
    setProductFilter('');
    setSortBy('date_desc');
  };

  const filteredOrders = orders.filter(order => {
    // 1. Search Reference / Notes
    if (searchRef.trim()) {
      const q = searchRef.toLowerCase();
      const matchesNum = order.orderNumber?.toLowerCase().includes(q);
      const matchesNotes = order.notes?.toLowerCase().includes(q);
      if (!matchesNum && !matchesNotes) return false;
    }

    // 2. Dates
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0,0,0,0);
      if (new Date(order.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23,59,59,999);
      if (new Date(order.createdAt) > to) return false;
    }

    // 3. Min/Max Costs
    if (minCost !== '' && (order.totalBuyingCost || 0) < parseFloat(minCost)) return false;
    if (maxCost !== '' && (order.totalBuyingCost || 0) > parseFloat(maxCost)) return false;

    // 4. Contained Product
    if (productFilter) {
      const hasProduct = order.items && order.items.some(item => item.product === productFilter);
      if (!hasProduct) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortBy === 'date_asc') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    if (sortBy === 'cost_desc') {
      return (b.totalBuyingCost || 0) - (a.totalBuyingCost || 0);
    }
    if (sortBy === 'cost_asc') {
      return (a.totalBuyingCost || 0) - (b.totalBuyingCost || 0);
    }
    if (sortBy === 'items_desc') {
      return (b.items?.length || 0) - (a.items?.length || 0);
    }
    return 0;
  });

  const isFiltersActive = statusFilter || searchRef || dateFrom || dateTo || minCost || maxCost || productFilter;

  const totalBuyingOrder = orderItems.reduce((sum, item) => sum + (parseFloat(item.buyingPrice || 0) * (parseInt(item.quantity) || 0)), 0);
  const totalSellingOrder = orderItems.reduce((sum, item) => sum + (parseFloat(item.sellingPrice || 0) * (parseInt(item.quantity) || 0)), 0);
  const projectedProfit = totalSellingOrder - totalBuyingOrder;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={24} /> Stock Replenishment Orders
            </h1>
            <p className="page-subtitle">Add orders, request approvals, and print stock replenishment bills</p>
          </div>
          <div>
            <button 
              className={`btn ${activeTab === 'create' ? 'btn-secondary' : 'btn-primary'}`} 
              onClick={() => setActiveTab(activeTab === 'list' ? 'create' : 'list')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {activeTab === 'list' ? (
                <><Plus size={18} /> New Stock Order</>
              ) : (
                'View All Orders'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'list' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Orders List
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create New Order
        </button>
      </div>

      {activeTab === 'list' && (
        <>
          {/* Detailed Filters Panel */}
          <div className={styles.filtersContainer}>
            <div className={styles.filtersMainRow}>
              {/* Reference Search */}
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}><Search size={16} /></span>
                <input
                  className={styles.searchInput}
                  placeholder="Search by order number or notes..."
                  value={searchRef}
                  onChange={e => setSearchRef(e.target.value)}
                />
              </div>

              {/* Status Select */}
              <select 
                className={styles.filterSelect}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Sort By Select */}
              <select
                className={styles.filterSelect}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="cost_desc">Cost: High to Low</option>
                <option value="cost_asc">Cost: Low to High</option>
                <option value="items_desc">Items Count: High to Low</option>
              </select>

              {/* Advanced Toggle */}
              <button
                type="button"
                className={`btn btn-secondary ${showAdvanced ? 'btn-active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px' }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <SlidersHorizontal size={15} />
                Filters
              </button>

              {/* Clear Button */}
              {isFiltersActive && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)' }}
                  onClick={handleClearFilters}
                >
                  <X size={15} />
                  Clear
                </button>
              )}
            </div>

            {/* Advanced Filters Expandable Grid */}
            {showAdvanced && (
              <div className={styles.advancedFiltersGrid}>
                {/* Date From */}
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Date From</label>
                  <input
                    type="date"
                    className={styles.filterInput}
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                  />
                </div>

                {/* Date To */}
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Date To</label>
                  <input
                    type="date"
                    className={styles.filterInput}
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                  />
                </div>

                {/* Min Cost */}
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Min Cost (RWF)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Min total cost..."
                    className={styles.filterInput}
                    value={minCost}
                    onChange={e => setMinCost(e.target.value)}
                  />
                </div>

                {/* Max Cost */}
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Max Cost (RWF)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max total cost..."
                    className={styles.filterInput}
                    value={maxCost}
                    onChange={e => setMaxCost(e.target.value)}
                  />
                </div>

                {/* Product Filter */}
                <div className={styles.filterGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.filterLabel}>Contains Product</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%', minWidth: '100%' }}
                    value={productFilter}
                    onChange={e => setProductFilter(e.target.value)}
                  >
                    <option value="">Filter by product contained in order...</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.productName}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Orders list rendering */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div className="spinner" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {isFiltersActive ? 'No Matching Orders' : 'No Orders Found'}
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>
                {isFiltersActive 
                  ? 'No stock orders match your active filter parameters. Try clearing them.' 
                  : 'There are no stock replenishment orders recorded yet.'}
              </p>
              {isFiltersActive && (
                <button 
                  className="btn btn-secondary" 
                  style={{ marginTop: 12 }} 
                  onClick={handleClearFilters}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className={styles.ordersList}>
              {filteredOrders.map(order => (
                <div 
                  key={order._id} 
                  className={styles.orderCard}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className={styles.orderCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className={styles.orderNumber}>{order.orderNumber}</span>
                      <span className={getStatusBadgeClass(order.status)}>{order.status}</span>
                    </div>
                    <span className={styles.orderDate}>{formatDate(order.createdAt)}</span>
                  </div>

                  <div className={styles.orderCardBody}>
                    <div className={styles.orderCardStat}>
                      <span className={styles.orderCardStatLabel}>Items Count</span>
                      <span className={styles.orderCardStatValue}>{order.items?.length || 0}</span>
                    </div>
                    <div className={styles.orderCardStat}>
                      <span className={styles.orderCardStatLabel}>Total Cost</span>
                      <span className={styles.orderCardStatValue}>{formatCurrency(order.totalBuyingCost)}</span>
                    </div>
                    <div className={styles.orderCardStat}>
                      <span className={styles.orderCardStatLabel}>Sales Value</span>
                      <span className={styles.orderCardStatValue}>{formatCurrency(order.totalSellingValue)}</span>
                    </div>
                    <div className={styles.orderCardStat}>
                      <span className={styles.orderCardStatLabel}>Projected Profit</span>
                      <span className={styles.orderCardStatValue} style={{ color: 'var(--green-primary)' }}>
                        +{formatCurrency(order.totalSellingValue - order.totalBuyingCost)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'create' && (
        <form onSubmit={handleSubmitOrder}>
          {/* Left panel: Search & Details, Right panel: Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            {/* Search Box */}
            <div className={styles.formSection}>
              <h2 className={styles.formSectionTitle}><Search size={18} /> Search & Add Products</h2>
              <div className={styles.productSearch}>
                <span className={styles.searchIconWrap}><Search size={18} /></span>
                <input
                  className={styles.productSearchInput}
                  placeholder="Type product name or barcode to add to replenishment list..."
                  value={searchProduct}
                  onChange={e => setSearchProduct(e.target.value)}
                />

                {searchResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {searchResults.map(product => (
                      <div 
                        key={product._id} 
                        className={styles.searchResultItem}
                        onClick={() => handleAddProduct(product)}
                      >
                        <div>
                          <p className={styles.searchResultName}>{product.productName}</p>
                          <p className={styles.searchResultMeta}>
                            Current Stock: {product.stock || 0} | Category: {product.category || 'other'}
                          </p>
                        </div>
                        <Plus size={18} style={{ color: 'var(--green-primary)' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Added Items List */}
              {orderItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
                  No products added to this order. Search and add products above.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.orderItemsTable}>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th style={{ width: 100 }}>Quantity</th>
                        <th style={{ width: 130 }}>Buying Price</th>
                        <th style={{ width: 130 }}>Selling Price</th>
                        <th style={{ width: 140 }}>Expiry Date</th>
                        <th style={{ width: 60, textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item, index) => (
                        <tr key={item.product}>
                          <td style={{ fontWeight: 600 }}>{item.productName}</td>
                          <td>
                            <input
                              type="number"
                              className={styles.orderItemInput}
                              value={item.quantity}
                              min="1"
                              onChange={e => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className={styles.orderItemInput}
                              value={item.buyingPrice}
                              min="0"
                              onChange={e => handleUpdateItem(index, 'buyingPrice', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className={styles.orderItemInput}
                              value={item.sellingPrice}
                              min="0"
                              onChange={e => handleUpdateItem(index, 'sellingPrice', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              className={styles.orderItemInput}
                              value={item.expiryDate}
                              onChange={e => handleUpdateItem(index, 'expiryDate', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: 'var(--red)' }}
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Note & Summary panel */}
            <div className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>Order Notes & Summary</h2>
              
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className={styles.notesInput}
                  placeholder="Add notes for this order (e.g. Supplier info, payment status...)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className={styles.totalsSummary}>
                <div className={styles.totalsRow}>
                  <span className={styles.totalsLabel}>Total Items:</span>
                  <span className={styles.totalsValue}>
                    {orderItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)} units
                  </span>
                </div>
                <div className={styles.totalsRow}>
                  <span className={styles.totalsLabel}>Total Cost Price (Buying):</span>
                  <span className={styles.totalsValue}>{formatCurrency(totalBuyingOrder)}</span>
                </div>
                <div className={styles.totalsRow}>
                  <span className={styles.totalsLabel}>Total Projected Sales Value:</span>
                  <span className={styles.totalsValue}>{formatCurrency(totalSellingOrder)}</span>
                </div>
                <div className={styles.totalsRow} style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
                  <span className={styles.totalsLabel} style={{ fontWeight: 800 }}>Projected Net Profit:</span>
                  <span className={styles.totalsProfitValue}>+{formatCurrency(projectedProfit)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={submitting || orderItems.length === 0}
                style={{ marginTop: 20 }}
              >
                {submitting ? 'Submitting Order...' : 'Submit Order for Approval'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>
                Order Details - {selectedOrder.orderNumber}
              </h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => printOrder(selectedOrder)} title="Print">
                  <Printer size={16} />
                </button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedOrder(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={styles.orderCardHeader} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
              <div>
                <span className={getStatusBadgeClass(selectedOrder.status)} style={{ marginRight: 8 }}>
                  {selectedOrder.status}
                </span>
                <span className={styles.orderDate}>Generated: {formatDate(selectedOrder.createdAt)}</span>
              </div>
              <div>
                {selectedOrder.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleApproveOrder(selectedOrder._id)}
                    >
                      Approve
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                      onClick={() => handleOpenReject(selectedOrder)}
                    >
                      Reject
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)' }}
                      onClick={() => handleDeleteOrder(selectedOrder._id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Display rejection reason if rejected */}
            {selectedOrder.status === 'rejected' && selectedOrder.rejectionReason && (
              <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, color: '#991b1b', fontSize: 13, marginBottom: 16 }}>
                <strong>Rejection Reason:</strong> {selectedOrder.rejectionReason}
              </div>
            )}

            {/* Order Items Table */}
            <div className={styles.orderDetailItems}>
              <table className={styles.orderDetailTable}>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Qty</th>
                    <th>Buying Price</th>
                    <th>Selling Price</th>
                    <th>Subtotal (Buying)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.buyingPrice)}</td>
                      <td>{formatCurrency(item.sellingPrice)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(item.buyingPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Summaries */}
            <div className={styles.totalsSummary} style={{ marginTop: 16 }}>
              <div className={styles.totalsRow}>
                <span className={styles.totalsLabel}>Total Order Cost:</span>
                <span className={styles.totalsValue}>{formatCurrency(selectedOrder.totalBuyingCost)}</span>
              </div>
              <div className={styles.totalsRow}>
                <span className={styles.totalsLabel}>Projected Sales Value:</span>
                <span className={styles.totalsValue}>{formatCurrency(selectedOrder.totalSellingValue)}</span>
              </div>
              <div className={styles.totalsRow} style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
                <span className={styles.totalsLabel} style={{ fontWeight: 800 }}>Projected Profit:</span>
                <span className={styles.totalsProfitValue}>+{formatCurrency(selectedOrder.totalSellingValue - selectedOrder.totalBuyingCost)}</span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Notes</p>
                <p style={{ fontSize: 14, color: 'var(--text)', background: 'var(--bg-muted)', padding: 12, borderRadius: 8 }}>{selectedOrder.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingOrder && (
        <div className="modal-overlay" onClick={() => setRejectingOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>
                Reject Order - {rejectingOrder.orderNumber}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setRejectingOrder(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectOrder}>
              <div className="form-group">
                <label className="form-label">Rejection Reason</label>
                <textarea
                  className={styles.rejectTextarea}
                  placeholder="Explain why this order is rejected..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setRejectingOrder(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-full" style={{ background: 'var(--red)', border: 'none' }}>
                  Reject Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
