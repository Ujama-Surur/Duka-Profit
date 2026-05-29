import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api, { formatCurrency, formatDate, offlineData } from '../utils/api';
import { 
  Package, Search, Utensils, Smartphone, Shirt, Home, AlertTriangle, Info, Calendar, BarChart3, TrendingUp 
} from 'lucide-react';

export default function Stock() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prodRes, catsRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      setProducts(prodRes.data);
      setCategories(catsRes.data);
      await offlineData.set('products', prodRes.data);
    } catch {
      const cached = await offlineData.get('products');
      if (cached) setProducts(cached);
    } finally {
      setLoading(false);
    }
  };

  const categoryEmoji = (c) => ({
    food: <Utensils size={16} />,
    electronics: <Smartphone size={16} />,
    clothing: <Shirt size={16} />,
    household: <Home size={16} />,
    other: <Package size={16} />,
  })[c.toLowerCase()] || <Package size={16} />;

  // Filter products: must have stock > 0
  const stockProducts = products.filter(p => (p.stock || 0) > 0);

  const filtered = stockProducts.filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));
    const matchesCategory = !categoryFilter || p.category?.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const getProfit = (cost, sell) => sell - cost;
  const getMargin = (cost, sell) => sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : 0;

  // Calculate high-level stock statistics
  const totalStockItems = stockProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalStockValue = stockProducts.reduce((sum, p) => sum + ((p.sellingPrice || 0) * (p.stock || 0)), 0);
  const totalCostValue = stockProducts.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.stock || 0)), 0);
  const totalProjectedProfit = totalStockValue - totalCostValue;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={24} /> Active Stock Inventory
          </h1>
          <p className="page-subtitle">
            Products currently in stock with active quantities and prices
          </p>
        </div>
      </div>

      {/* Stats Cards Dashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: 'rgba(22, 163, 74, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-primary)'
          }}>
            <Package size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total In-Stock Items</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{totalStockItems} units</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6'
          }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Stock Value (Sell)</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{formatCurrency(totalStockValue)}</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: 'rgba(22, 163, 74, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-primary)'
          }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Projected Profit</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--green-primary)' }}>+{formatCurrency(totalProjectedProfit)}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={18} />
          </span>
          <input
            className="form-input"
            style={{ paddingLeft: 40 }}
            placeholder="Search stock by name or barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <select
          className="form-input"
          style={{ width: '180px', background: 'var(--bg-card)', cursor: 'pointer' }}
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
      </div>

      {/* Grid of Stock Items */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Items in Stock</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {search || categoryFilter ? 'No stock matches your search criteria.' : 'Stock is empty. Products appear here after replenishment orders are approved.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {filtered.map(product => {
            const isLowStock = product.stock <= (product.lowStockThreshold || 10);
            const isExpired = product.expirationDate && new Date() > new Date(product.expirationDate);
            
            return (
              <div 
                key={product._id} 
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 20,
                  position: 'relative',
                  border: isLowStock ? '1px solid var(--red)' : '1px solid var(--border)'
                }}
              >
                {/* Header Info */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                  {product.productImageUrl ? (
                    <img 
                      src={product.productImageUrl} 
                      alt={product.productName} 
                      style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: 8, background: 'var(--bg-muted)',
                      display: 'flex', alignItems: 'center', justify: 'center'
                    }}>
                      {categoryEmoji(product.category || 'other')}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {product.productName}
                    </h3>
                    <span className="badge badge-gray" style={{ fontSize: '11px', padding: '2px 6px', marginTop: 4, display: 'inline-block' }}>
                      {product.category || 'other'}
                    </span>
                  </div>
                </div>

                {/* Barcode */}
                {product.barcode && (
                  <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                    Barcode: {product.barcode}
                  </p>
                )}

                {/* Stock Level Row */}
                <div style={{
                  background: 'var(--bg-muted)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Available Stock:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: isLowStock ? 'var(--red)' : 'var(--text)'
                    }}>
                      {product.stock} {product.unitType || 'pieces'}
                    </span>
                    {isLowStock && (
                      <span style={{ color: 'var(--red)', display: 'inline-flex', alignItems: 'center' }} title="Low Stock Alert">
                        <AlertTriangle size={14} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Prices Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{ borderRight: '1px solid var(--border)' }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Buying (Cost)</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>{formatCurrency(product.costPrice)}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Selling Price</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{formatCurrency(product.sellingPrice)}</p>
                  </div>
                </div>

                {/* Margin & Profit unit Info */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  paddingTop: 8,
                  borderTop: '1px solid var(--border)',
                  marginBottom: 12
                }}>
                  <span>Profit: <strong style={{ color: 'var(--green-primary)' }}>+{formatCurrency(getProfit(product.costPrice, product.sellingPrice))}</strong></span>
                  <span>Margin: <strong style={{ color: 'var(--green-primary)' }}>{getMargin(product.costPrice, product.sellingPrice)}%</strong></span>
                </div>

                {/* Expiry Date info */}
                {product.expirationDate && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: isExpired ? 'var(--red)' : 'var(--text-muted)',
                    background: isExpired ? '#fee2e2' : 'transparent',
                    padding: isExpired ? '6px 10px' : 0,
                    borderRadius: 6,
                    marginTop: 'auto'
                  }}>
                    <Calendar size={14} />
                    <span>
                      {isExpired ? 'Expired: ' : 'Expires: '}
                      <strong>{formatDate(product.expirationDate)}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
