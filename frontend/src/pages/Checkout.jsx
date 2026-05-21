import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate, formatTime, offlineData } from '../utils/api';
import BarcodeScanner from '../components/BarcodeScanner';
import RemoteScannerPairing from '../components/RemoteScannerPairing';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { ShoppingCart, Camera, Smartphone, Trash2, BarChart3, Receipt, X, Printer, Download, WifiOff, Utensils, Home, Package, Shirt, Banknote, CreditCard, Wifi, AlertTriangle, Check } from 'lucide-react';

const PAYMENT_METHODS = ['cash', 'card', 'mobile_money'];

export default function Checkout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showReceipt, setShowReceipt] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [showRemoteScanner, setShowRemoteScanner] = useState(false);
  const receiptRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const handleBarcodeDetectedRef = useRef(null);

  // Keep callback ref updated to avoid event listener re-binding
  useEffect(() => {
    handleBarcodeDetectedRef.current = handleBarcodeDetected;
  }, [products]);

  // Autofocus the input field on mount
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Global keydown event listener for keyboard wedge hardware scanners
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e) => {
      const activeEl = document.activeElement;
      // If user is focusing any input or textarea, let normal inputs flow
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }

      if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
        buffer += e.key;
        lastKeyTime = currentTime;
      } else if (e.key === 'Enter') {
        const scannedBarcode = buffer.trim();
        if (scannedBarcode.length >= 3 && handleBarcodeDetectedRef.current) {
          e.preventDefault();
          handleBarcodeDetectedRef.current(scannedBarcode);
        }
        buffer = '';
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  useEffect(() => {
    loadProducts();
    loadSalesHistory();
  }, []);

  const loadProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
      await offlineData.set('products', data);
    } catch {
      const cached = await offlineData.get('products');
      if (cached) setProducts(cached);
    }
  };

  const loadSalesHistory = async () => {
    try {
      const { data } = await api.get('/sales?limit=50');
      setSalesHistory(data);
      await offlineData.set('sales_history', data);
    } catch {
      const cached = await offlineData.get('sales_history');
      if (cached) setSalesHistory(cached);
    }
  };

  const handleBarcodeDetected = async (barcodeValue) => {
    const barcode = String(barcodeValue || '').trim();
    if (!barcode) {
      toast.error('Invalid barcode detected');
      return;
    }

    setManualBarcode(barcode);
    setShowScanner(false);
    setLookupLoading(true);

    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
      if (data?.found && data?.product) {
        addToCart(data.product);
        toast.success(`Added ${data.product.productName} to cart`);
        setManualBarcode('');
        // Re-focus the scanner input
        setTimeout(() => {
          if (barcodeInputRef.current) barcodeInputRef.current.focus();
        }, 50);
      } else {
        toast.error('Product not found with this barcode');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Product not found with this barcode');
      } else {
        toast.error('Failed to look up barcode');
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

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Only ${product.stock} units available`);
          return prev;
        }
        return prev.map(item => 
          item._id === product._id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (product.stock <= 0) {
        toast.error('Product is out of stock');
        return prev;
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, newQty) => {
    const product = products.find(p => p._id === productId);
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    if (product && newQty > product.stock) {
      toast.error(`Only ${product.stock} units available`);
      return;
    }
    setCart(prev => 
      prev.map(item => 
        item._id === productId 
          ? { ...item, quantity: newQty }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item._id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const cartProfit = cart.reduce((sum, item) => {
    const profitPerUnit = item.sellingPrice - item.costPrice;
    return sum + (profitPerUnit * item.quantity);
  }, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setProcessing(true);
    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item._id,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.sellingPrice,
          costPrice: item.costPrice,
          subtotal: item.sellingPrice * item.quantity,
        })),
        totalAmount: cartTotal,
        totalProfit: cartProfit,
        paymentMethod,
      };

      let newSale;
      if (navigator.onLine) {
        const { data } = await api.post('/sales/checkout', saleData);
        newSale = data;
      } else {
        // Store offline
        await offlineData.queueOperation({ method: 'post', url: '/sales/checkout', data: saleData });
        newSale = {
          ...saleData,
          _id: `offline_${Date.now()}`,
          createdAt: new Date().toISOString(),
          offline: true,
        };
        toast('Sale saved offline', { icon: <WifiOff size={16} /> });
      }

      // Update local stock
      const updatedProducts = products.map(p => {
        const cartItem = cart.find(c => c._id === p._id);
        if (cartItem) {
          return { ...p, stock: p.stock - cartItem.quantity };
        }
        return p;
      });
      setProducts(updatedProducts);
      await offlineData.set('products', updatedProducts);

      // Add to sales history
      setSalesHistory(prev => [newSale, ...prev]);
      await offlineData.set('sales_history', [newSale, ...(await offlineData.get('sales_history') || [])]);

      setShowReceipt(newSale);
      setCart([]);
      setPaymentMethod('cash');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete sale');
    } finally {
      setProcessing(false);
    }
  };

  const generatePDF = (sale) => {
    const doc = new jsPDF();
    
    // Shop name/logo placeholder
    doc.setFontSize(20);
    doc.setTextColor(0, 102, 204);
    doc.text(user?.storeName || 'Duka Profit', 105, 20, { align: 'center' });
    
    // Receipt header
    if (user?.receiptHeader) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(user.receiptHeader, 105, 28, { align: 'center' });
    }
    
    // Receipt ID
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Receipt #${sale._id}`, 105, user?.receiptHeader ? 36 : 30, { align: 'center' });
    
    // Date & Time
    const date = new Date(sale.createdAt);
    doc.text(`${formatDate(date)} ${formatTime(date)}`, 105, user?.receiptHeader ? 42 : 36, { align: 'center' });
    
    // Line
    doc.setDrawColor(200);
    doc.line(20, 45, 190, 45);
    
    // Items table
    const tableData = sale.items.map(item => [
      item.productName,
      item.quantity,
      formatCurrency(item.unitPrice),
      formatCurrency(item.subtotal),
    ]);
    
    doc.autoTable({
      startY: 50,
      head: [['Item', 'Qty', 'Price', 'Subtotal']],
      body: tableData,
      theme: 'plain',
      headStyles: { fillColor: [0, 102, 204] },
    });
    
    // Total
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatCurrency(sale.totalAmount)}`, 190, finalY, { align: 'right' });
    
    // Payment method
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Payment: ${sale.paymentMethod.toUpperCase()}`, 190, finalY + 10, { align: 'right' });
    
    // Thank you message
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(user?.receiptFooter || 'Thank you for your purchase!', 105, finalY + 25, { align: 'center' });
    
    // Save
    doc.save(`receipt_${sale._id}.pdf`);
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

  const categoryEmoji = (c) => ({food:<Utensils size={16} />,electronics:<Smartphone size={16} />,clothing:<Shirt size={16} />,household:<Home size={16} />,other:<Package size={16} />})[c] || <Package size={16} />;

  return (
    <>
      <style>{`
        @media (max-width: 1024px) {
          .checkout-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .checkout-page {
            padding: 16px !important;
          }
          .checkout-grid {
            gap: 16px !important;
            margin-top: 16px !important;
          }
          .cart-item {
            padding: 10px !important;
            gap: 10px !important;
          }
          .qty-btn {
            padding: 4px 8px !important;
          }
        }
        @media (max-width: 480px) {
          .checkout-page {
            padding: 12px !important;
          }
          .payment-buttons {
            flex-direction: column !important;
          }
          .payment-buttons button {
            width: 100% !important;
          }
        }
      `}</style>
      <div className="checkout-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <div className="page-header">
          <h1 className="page-title" style={{display:'flex',alignItems:'center',gap:8}}><ShoppingCart size={24} /> Checkout - Scan to Sell</h1>
          <p className="page-subtitle">Scan products to build cart and complete sales</p>
        </div>

        <div className="checkout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', marginTop: '24px' }}>
        {/* Left: Scanner and Cart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Scanner Section */}
          <div className="card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display:'flex',alignItems:'center',gap:8 }}><Camera size={20} /> Scan Product</h2>
            
            {showScanner ? (
              <BarcodeScanner
                onDetected={handleBarcodeDetected}
                onClose={() => setShowScanner(false)}
              />
            ) : (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowScanner(true)}
                >
                  Start Scanner
                </button>
                <span style={{ color: 'var(--text-muted)' }}>or</span>
                 <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px', flex: 1 }}>
                   <input
                     ref={barcodeInputRef}
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
                    {lookupLoading ? '...' : 'Add'}
                  </button>
                </form>
              </div>
            )}

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
                <Smartphone size={16} style={{marginRight:6}} /> Connect Remote Scanner
              </button>
            )}
          </div>

          {/* Cart Section */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, display:'flex',alignItems:'center',gap:8 }}><ShoppingCart size={20} /> Cart ({cart.length} items)</h2>
              {cart.length > 0 && (
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCart([])}
                >
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', color:'var(--text-muted)' }}><ShoppingCart size={48} /></div>
                <p style={{ color: 'var(--text-muted)' }}>Cart is empty. Scan products to add them.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cart.map(item => (
                  <div 
                    key={item._id}
                    className="cart-item"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      padding: '12px',
                      background: 'var(--bg-muted)',
                      borderRadius: '8px'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{categoryEmoji(item.category)}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600 }}>{item.productName}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {formatCurrency(item.sellingPrice)} × {item.quantity} = {formatCurrency(item.sellingPrice * item.quantity)}
                      </p>
                      {item.quantity >= item.stock && (
                        <p style={{ fontSize: '12px', color: 'var(--red)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={12} /> Max stock reached
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span style={{ fontWeight: 600, minWidth: '30px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                      >
                        ＋
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeFromCart(item._id)}
                        style={{ color: 'var(--red)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Cart Summary */}
                <div style={{ 
                  marginTop: '16px', 
                  paddingTop: '16px', 
                  borderTop: '2px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                    <span>Subtotal:</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: 'var(--green-primary)' }}>
                    <span>Profit:</span>
                    <span>+{formatCurrency(cartProfit)}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '24px', 
                    fontWeight: 800,
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border)'
                  }}>
                    <span>Total:</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Payment Method</label>
                  <div className="payment-buttons" style={{ display: 'flex', gap: '8px' }}>
                    {PAYMENT_METHODS.map(method => (
                      <button
                        key={method}
                        type="button"
                        className={`btn ${paymentMethod === method ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPaymentMethod(method)}
                      >
                        {method === 'cash' ? <><Banknote size={16} style={{marginRight:6}} /> Cash</> : method === 'card' ? <><CreditCard size={16} style={{marginRight:6}} /> Card</> : <><Smartphone size={16} style={{marginRight:6}} /> Mobile Money</>}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-lg btn-full"
                  onClick={handleCheckout}
                  disabled={processing || cart.length === 0}
                  style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {processing ? (
                    <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, display: 'inline-block' }}/>&nbsp;Processing...</>
                  ) : (
                    <><Check size={18} /> Complete Sale ({formatCurrency(cartTotal)})</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sales History */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display:'flex',alignItems:'center',gap:8 }}><BarChart3 size={20} /> Sales History</h2>
          
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {salesHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', color:'var(--text-muted)' }}><BarChart3 size={48} /></div>
                <p style={{ color: 'var(--text-muted)' }}>No sales yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {salesHistory.map((sale, index) => (
                  <div 
                    key={sale._id || index}
                    style={{ 
                      padding: '12px', 
                      background: 'var(--bg-muted)', 
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowReceipt(sale)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        #{sale._id?.slice(-8) || 'OFFLINE'}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatTime(sale.createdAt)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>
                        {sale.items?.length || 1} item{sale.items?.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '18px' }}>
                        {formatCurrency(sale.totalAmount)}
                      </span>
                    </div>
                    {sale.offline && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display:'flex',alignItems:'center',gap:4 }}><WifiOff size={12} /> Offline</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="modal-overlay" onClick={() => setShowReceipt(null)}>
          <div className="card" style={{ maxWidth: '500px', margin: '40px auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, display:'flex',alignItems:'center',gap:8 }}><Receipt size={20} /> Receipt</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowReceipt(null)}><X size={20} /></button>
            </div>

            <div ref={receiptRef} style={{ padding: '20px', background: 'white', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '24px', color: '#06C', marginBottom: '8px' }}>{user?.storeName || 'Duka Profit'}</h3>
                {user?.receiptHeader && <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{user.receiptHeader}</p>}
                <p style={{ fontSize: '12px', color: '#666' }}>Receipt #{showReceipt._id}</p>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  {formatDate(new Date(showReceipt.createdAt))} {formatTime(showReceipt.createdAt)}
                </p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ background: '#06C', color: 'white' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {showReceipt.items?.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px' }}>{item.productName}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ textAlign: 'right', marginBottom: '8px' }}>
                <p style={{ fontSize: '18px', fontWeight: 800 }}>
                  Total: {formatCurrency(showReceipt.totalAmount)}
                </p>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Payment: {showReceipt.paymentMethod?.toUpperCase() || 'CASH'}
                </p>
              </div>

              <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
                <p>{user?.receiptFooter || 'Thank you for your purchase!'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-secondary btn-full"
                onClick={() => printReceipt(showReceipt)}
              >
                <Printer size={16} style={{marginRight:6}} /> Print
              </button>
              <button 
                className="btn btn-secondary btn-full"
                onClick={() => generatePDF(showReceipt)}
              >
                <Download size={16} style={{marginRight:6}} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
