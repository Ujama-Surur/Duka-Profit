import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, offlineData } from '../utils/api';
import { SUPPORTED_CURRENCIES, calculateReplacementCost } from '../utils/currencyUtils';
import BarcodeScanner from '../components/BarcodeScanner';
import RemoteScannerPairing from '../components/RemoteScannerPairing';
import { Package, Camera, Smartphone, Info, CheckCircle2, Utensils, Shirt, Home, Plus, AlertTriangle, ShieldAlert, DollarSign } from 'lucide-react';

const CATEGORIES = ['food', 'electronics', 'clothing', 'household', 'other'];

const defaultForm = { 
  productName: '', 
  barcode: '', 
  costPrice: '', 
  sellingPrice: '', 
  quantity: '', 
  expirationDate: '', 
  lowStockThreshold: '10', 
  category: 'other',
  pricingMode: 'fixed',
  currency: 'USD',
  baseCost: '',
  purchaseExchangeRate: '',
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
  const [currencySettings, setCurrencySettings] = useState(null);
  const [currentRate, setCurrentRate] = useState(null);
  const [batchBaseCost, setBatchBaseCost] = useState('');
  const [batchExchangeRate, setBatchExchangeRate] = useState('');
  const [updateBatchCost, setUpdateBatchCost] = useState(false);

  useEffect(() => {
    const loadCurrencyInfo = async () => {
      try {
        const [settingsRes, rateRes] = await Promise.all([
          api.get('/currency/settings').catch(() => ({ data: null })),
          api.get('/currency/rate/current').catch(() => ({ data: null })),
        ]);
        if (settingsRes?.data) setCurrencySettings(settingsRes.data);
        if (rateRes?.data?.rate) setCurrentRate(rateRes.data);
      } catch {}
    };
    loadCurrencyInfo();
  }, []);

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
        setBatchBaseCost(product.baseCost != null ? product.baseCost.toString() : '');
        setBatchExchangeRate(currentRate?.rate ? currentRate.rate.toString() : (product.purchaseExchangeRate != null ? product.purchaseExchangeRate.toString() : ''));
        setUpdateBatchCost(false);
        setShowAddForm(false);
        toast.success('Product found! Ready to add stock.');
      } else {
        setExistingProduct(null);
        setForm({
          ...defaultForm,
          barcode,
          currency: currencySettings?.baseCurrency || 'USD',
          purchaseExchangeRate: currentRate?.rate ? currentRate.rate.toString() : '',
        });
        setShowAddForm(true);
        toast('Product not found. Enter details to create.', { icon: <Info size={16} color="var(--green-primary)" /> });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setExistingProduct(null);
        setForm({
          ...defaultForm,
          barcode,
          currency: currencySettings?.baseCurrency || 'USD',
          purchaseExchangeRate: currentRate?.rate ? currentRate.rate.toString() : '',
        });
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
      const updates = {
        ...existingProduct,
        stock: newStock,
      };

      if (updateBatchCost) {
        if (batchBaseCost) updates.baseCost = parseFloat(batchBaseCost);
        if (batchExchangeRate) updates.purchaseExchangeRate = parseFloat(batchExchangeRate);
        if (batchBaseCost && batchExchangeRate) {
          updates.costPrice = parseFloat(batchBaseCost) * parseFloat(batchExchangeRate);
        }
      }

      const { data } = await api.put(`/products/${existingProduct._id}`, updates);
      
      setExistingProduct(data);
      toast.success(`Stock updated! New quantity: ${newStock}`);
      setStockUpdateQty(1);
      setUpdateBatchCost(false);
      
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
        costPrice: form.costPrice ? parseFloat(form.costPrice) : (form.baseCost && form.purchaseExchangeRate ? parseFloat(form.baseCost) * parseFloat(form.purchaseExchangeRate) : 0),
        sellingPrice: parseFloat(form.sellingPrice),
        pricingMode: form.pricingMode || 'fixed',
        currency: form.pricingMode !== 'fixed' ? form.currency : undefined,
        baseCost: form.pricingMode !== 'fixed' && form.baseCost ? parseFloat(form.baseCost) : undefined,
        purchaseExchangeRate: form.pricingMode !== 'fixed' && form.purchaseExchangeRate ? parseFloat(form.purchaseExchangeRate) : undefined,
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

                {/* Below Replacement Warning */}
                {(existingProduct.isBelowReplacementCost || (existingProduct.currentReplacementCost && existingProduct.sellingPrice < existingProduct.currentReplacementCost)) && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 10px',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '8px',
                    color: '#991B1B',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <AlertTriangle size={15} color="#DC2626" />
                    <span>⚠️ Warning: Current replacement cost is {formatCurrency(existingProduct.currentReplacementCost)}, which is above selling price!</span>
                  </div>
                )}

                {/* Currency & Replacement details if linked */}
                {existingProduct.pricingMode && existingProduct.pricingMode !== 'fixed' && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--green-200)', fontSize: '12.5px', color: '#374151' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Base Purchase Cost:</span>
                      <strong>{existingProduct.baseCost} {existingProduct.currency || 'USD'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Current Replacement Cost:</span>
                      <strong style={{ color: '#1E40AF' }}>{formatCurrency(existingProduct.currentReplacementCost || 0)}</strong>
                    </div>
                  </div>
                )}
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

              {/* Optional: Update purchase cost on restock */}
              {existingProduct.pricingMode && existingProduct.pricingMode !== 'fixed' && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={updateBatchCost}
                      onChange={(e) => setUpdateBatchCost(e.target.checked)}
                    />
                    Update purchase cost/rate for this restock batch
                  </label>

                  {updateBatchCost && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>New Base Cost ({existingProduct.currency || 'USD'})</label>
                        <input
                          type="number"
                          step="any"
                          className="form-input"
                          value={batchBaseCost}
                          onChange={(e) => setBatchBaseCost(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>Exchange Rate</label>
                        <input
                          type="number"
                          step="any"
                          className="form-input"
                          value={batchExchangeRate}
                          onChange={(e) => setBatchExchangeRate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                    <label className="form-label">Cost Price ({currencySettings?.sellingCurrency || 'Local'})</label>
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
                    <label className="form-label">Selling Price ({currencySettings?.sellingCurrency || 'Local'})</label>
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

                {/* Pricing Mode & Currency Strategy */}
                <div style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldAlert size={14} color="var(--green-primary)" />
                      Pricing Mode
                    </label>
                  </div>

                  <select
                    className="form-input"
                    value={form.pricingMode || 'fixed'}
                    onChange={(e) => setForm(prev => ({ ...prev, pricingMode: e.target.value }))}
                  >
                    <option value="fixed">Fixed Price ({currencySettings?.sellingCurrency || 'Local Currency'})</option>
                    <option value="currency_linked">Currency-Linked (Exchange Rate)</option>
                    <option value="replacement_protected">Replacement-Protected</option>
                  </select>

                  {form.pricingMode !== 'fixed' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>Purchase Currency</label>
                        <select
                          className="form-input"
                          value={form.currency || 'USD'}
                          onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))}
                        >
                          {SUPPORTED_CURRENCIES.map(curr => (
                            <option key={curr.code} value={curr.code}>{curr.code}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>Base Cost ({form.currency || 'USD'})</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="form-input"
                          placeholder="e.g. 10.00"
                          value={form.baseCost}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm(prev => {
                              const newF = { ...prev, baseCost: val };
                              const rate = parseFloat(newF.purchaseExchangeRate || currentRate?.rate || 0);
                              if (rate > 0 && val) {
                                newF.costPrice = (parseFloat(val) * rate).toFixed(2);
                              }
                              return newF;
                            });
                          }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>Rate</label>
                        <input
                          type="number"
                          step="any"
                          className="form-input"
                          placeholder={currentRate?.rate ? `Rate: ${currentRate.rate}` : "e.g. 3500"}
                          value={form.purchaseExchangeRate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm(prev => {
                              const newF = { ...prev, purchaseExchangeRate: val };
                              const base = parseFloat(newF.baseCost || 0);
                              if (base > 0 && val) {
                                newF.costPrice = (base * parseFloat(val)).toFixed(2);
                              }
                              return newF;
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
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
