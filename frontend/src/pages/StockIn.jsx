import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, offlineData } from '../utils/api';
import BarcodeScanner from '../components/BarcodeScanner';
import RemoteScannerPairing from '../components/RemoteScannerPairing';
import { Package, Camera, Smartphone, Info, CheckCircle2, Utensils, Shirt, Home, Plus } from 'lucide-react';

const CATEGORIES = ['food', 'electronics', 'clothing', 'household', 'other'];

const defaultForm = { 
  productName: '', 
  barcode: '', 
  costPrice: '', 
  sellingPrice: '', 
  quantity: '', 
  expirationDate: '', 
  lowStockThreshold: '10', 
  category: 'other' 
};

export default function StockIn() {
  const { t } = useTranslation();
  const [showScanner, setShowScanner] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [existingProduct, setExistingProduct] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [stockUpdateQty, setStockUpdateQty] = useState(1);
  const [showRemoteScanner, setShowRemoteScanner] = useState(false);

  const handleBarcodeDetected = async (barcodeValue) => {
    const barcode = String(barcodeValue || '').trim();
    if (!barcode) {
      toast.error('Invalid barcode detected');
      return;
    }

    setManualBarcode(barcode);
    setShowScanner(false);
    setLookupLoading(true);
    setErrors((prev) => ({ ...prev, barcode: undefined }));

    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
      if (data?.found && data?.product) {
        const product = data.product;
        setExistingProduct(product);
        setStockUpdateQty(1);
        setShowAddForm(false);
        toast.success('Product found! Ready to add stock.');
      } else {
        setExistingProduct(null);
        setForm((prev) => ({ ...prev, barcode }));
        setShowAddForm(true);
        toast('Product not found. Enter details to create.', { icon: <Info size={16} color="var(--green-primary)" /> });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setExistingProduct(null);
        setForm((prev) => ({ ...prev, barcode }));
        setShowAddForm(true);
        toast('Product not found. Enter details to create.', { icon: <Info size={16} color="var(--green-primary)" /> });
      } else {
        toast.error(err.response?.data?.message || 'Failed to look up barcode');
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualBarcode.trim()) {
      toast.error('Please enter a barcode');
      return;
    }
    await handleBarcodeDetected(manualBarcode);
  };

  const handleStockUpdate = async () => {
    if (!existingProduct || stockUpdateQty < 1) {
      toast.error('Invalid quantity');
      return;
    }

    setSaving(true);
    try {
      const newStock = existingProduct.stock + stockUpdateQty;
      const { data } = await api.put(`/products/${existingProduct._id}`, {
        ...existingProduct,
        stock: newStock,
      });
      
      setExistingProduct(data);
      toast.success(`Stock updated! New quantity: ${newStock}`);
      setStockUpdateQty(1);
      
      // Update cached products
      const cached = await offlineData.get('products');
      if (cached) {
        await offlineData.set('products', cached.map(p => p._id === data._id ? data : p));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  const validate = () => {
    const errs = {};
    
    if (!form.productName || form.productName.trim() === '') {
      errs.productName = 'Product name required';
    }
    
    const costPriceNum = parseFloat(form.costPrice);
    const sellingPriceNum = parseFloat(form.sellingPrice);
    
    if (!form.costPrice || isNaN(costPriceNum) || costPriceNum <= 0) {
      errs.costPrice = 'Enter valid cost price';
    }
    
    if (!form.sellingPrice || isNaN(sellingPriceNum) || sellingPriceNum <= 0) {
      errs.sellingPrice = 'Enter valid selling price';
    }
    
    if (sellingPriceNum <= costPriceNum) {
      errs.sellingPrice = 'Selling price must be higher than cost price';
    }
    
    const quantityNum = parseInt(form.quantity);
    if (!form.quantity || isNaN(quantityNum) || quantityNum < 0) {
      errs.quantity = 'Quantity must be a non-negative number';
    }
    
    if (form.category === 'food' && !form.expirationDate) {
      errs.expirationDate = 'Expiration date required for food items';
    }
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setSaving(true);
    try {
      const payload = {
        ...form,
        stock: form.quantity,
        barcode: form.barcode?.trim() || undefined,
        expirationDate: form.category === 'food' ? form.expirationDate : undefined,
      };
      
      const { data } = await api.post('/products', payload);
      setExistingProduct(data);
      setShowAddForm(false);
      toast.success('Product created!');
      
      // Update cached products
      const cached = await offlineData.get('products');
      if (cached) {
        await offlineData.set('products', [...cached, data]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setManualBarcode('');
    setForm(defaultForm);
    setExistingProduct(null);
    setShowAddForm(false);
    setStockUpdateQty(1);
    setErrors({});
  };

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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Package size={24} /> Stock In - Scan to Add</h1>
        <p className="page-subtitle">Scan barcodes to quickly add stock or create new products</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        {/* Scanner Section */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}><Camera size={20} /> Scan Barcode</h2>
          
          {showScanner ? (
            <BarcodeScanner
              onDetected={handleBarcodeDetected}
              onClose={() => setShowScanner(false)}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><Camera size={48} color="var(--text-muted)" /></div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                Click below to start scanning barcodes
              </p>
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => setShowScanner(true)}
              >
                Start Scanner
              </button>
            </div>
          )}

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Or enter barcode manually:</p>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                placeholder="Enter barcode..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                disabled={lookupLoading}
              />
              <button 
                type="submit" 
                className="btn btn-secondary"
                disabled={lookupLoading || !manualBarcode.trim()}
              >
                {lookupLoading ? '...' : 'Lookup'}
              </button>
            </form>
          </div>

          {/* Remote Scanner */}
          {showRemoteScanner && (
            <div style={{ marginTop: '24px' }}>
              <RemoteScannerPairing 
                onBarcodeScanned={handleBarcodeDetected}
              />
            </div>
          )}

          {!showRemoteScanner && (
            <button 
              className="btn btn-ghost btn-full"
              onClick={() => setShowRemoteScanner(true)}
              style={{ marginTop: '16px' }}
            >
              <Smartphone size={16} style={{ marginRight: 6 }} /> Connect Remote Scanner
            </button>
          )}
        </div>

        {/* Action Section */}
        <div className="card">
          {lookupLoading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" />
              <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Looking up barcode...</p>
            </div>
          )}

          {!lookupLoading && existingProduct && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={20} color="var(--green-primary)" /> Product Found</h2>
              
              <div style={{ 
                padding: '16px', 
                background: 'var(--green-50)', 
                border: '1px solid var(--green-200)', 
                borderRadius: '12px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, background: 'var(--green-50)', borderRadius: 'var(--radius-md)' }}>{categoryIcon(existingProduct.category, 20)}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '16px' }}>{existingProduct.productName}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Barcode: {existingProduct.barcode}</p>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Current Stock:</span>
                    <span style={{ marginLeft: '8px', fontWeight: 700 }}>{existingProduct.stock || 0}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Selling Price:</span>
                    <span style={{ marginLeft: '8px', fontWeight: 700 }}>{formatCurrency(existingProduct.sellingPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity to Add</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setStockUpdateQty(Math.max(1, stockUpdateQty - 1))}
                  >
                    −
                  </button>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={stockUpdateQty}
                    onChange={(e) => setStockUpdateQty(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ textAlign: 'center', width: '100px' }}
                  />
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setStockUpdateQty(stockUpdateQty + 1)}
                  >
                    ＋
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  className="btn btn-primary btn-full"
                  onClick={handleStockUpdate}
                  disabled={saving}
                >
                  {saving ? '...' : `Add ${stockUpdateQty} to Stock`}
                </button>
                <button 
                  className="btn btn-ghost"
                  onClick={reset}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {!lookupLoading && showAddForm && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={20} /> Create New Product</h2>
              
              <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Barcode</label>
                  <input
                    className="form-input"
                    value={form.barcode}
                    readOnly
                    style={{ background: 'var(--bg-muted)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    className={`form-input ${errors.productName ? 'error' : ''}`}
                    placeholder="e.g. Coca Cola 500ml"
                    value={form.productName}
                    onChange={(e) => setForm(prev => ({ ...prev, productName: e.target.value }))}
                  />
                  {errors.productName && <span className="form-error">{errors.productName}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={form.category}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      category: e.target.value,
                      expirationDate: e.target.value === 'food' ? prev.expirationDate : '',
                    }))}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Cost Price (RWF)</label>
                    <input
                      className={`form-input ${errors.costPrice ? 'error' : ''}`}
                      type="number"
                      min="0"
                      value={form.costPrice}
                      onChange={(e) => setForm(prev => ({ ...prev, costPrice: e.target.value }))}
                    />
                    {errors.costPrice && <span className="form-error">{errors.costPrice}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (RWF)</label>
                    <input
                      className={`form-input ${errors.sellingPrice ? 'error' : ''}`}
                      type="number"
                      min="0"
                      value={form.sellingPrice}
                      onChange={(e) => setForm(prev => ({ ...prev, sellingPrice: e.target.value }))}
                    />
                    {errors.sellingPrice && <span className="form-error">{errors.sellingPrice}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Stock</label>
                  <input
                    className={`form-input ${errors.quantity ? 'error' : ''}`}
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                  />
                  {errors.quantity && <span className="form-error">{errors.quantity}</span>}
                </div>

                {form.category === 'food' && (
                  <div className="form-group">
                    <label className="form-label">Expiration Date *</label>
                    <input
                      className={`form-input ${errors.expirationDate ? 'error' : ''}`}
                      type="date"
                      value={form.expirationDate}
                      onChange={(e) => setForm(prev => ({ ...prev, expirationDate: e.target.value }))}
                    />
                    {errors.expirationDate && <span className="form-error">{errors.expirationDate}</span>}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-full"
                    onClick={reset}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-full"
                    disabled={saving}
                  >
                    {saving ? '...' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {!lookupLoading && !existingProduct && !showAddForm && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><Package size={48} color="var(--text-muted)" /></div>
              <p style={{ color: 'var(--text-muted)' }}>
                Scan a barcode or enter one manually to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
