import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate, formatTime, offlineData } from '../utils/api';
import BarcodeScanner from '../components/BarcodeScanner';
import RemoteScannerPairing from '../components/RemoteScannerPairing';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { ShoppingCart, Camera, Smartphone, Trash2, BarChart3, Receipt, X, Printer, Download, WifiOff, Utensils, Home, Package, Shirt, Banknote, CreditCard, Wifi, AlertTriangle, Check, Building, User, Search, Plus, Minus } from 'lucide-react';

const PAYMENT_METHODS = ['cash', 'momo', 'card', 'bank', 'credit'];

export default function Checkout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'history'
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showScanner, setShowScanner] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showReceipt, setShowReceipt] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [showRemoteScanner, setShowRemoteScanner] = useState(false);
  const receiptRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const handleBarcodeDetectedRef = useRef(null);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

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
    playBeep();
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

    if (paymentMethod === 'credit' && (!customerName || !customerName.trim())) {
      toast.error('Customer name is required for sales on credit');
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
        customerName: paymentMethod === 'credit' ? customerName : undefined,
        customerPhone: paymentMethod === 'credit' ? customerPhone : undefined,
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
      setCustomerName('');
      setCustomerPhone('');
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
    const paymentText = `Payment: ${(sale.paymentMethod || 'CASH').toUpperCase()}`;
    doc.text(paymentText, 190, finalY + 8, { align: 'right' });

    let messageOffset = 20;
    if (sale.paymentMethod === 'credit' && sale.customerName) {
      const debtorText = `Customer: ${sale.customerName}${sale.customerPhone ? ` (${sale.customerPhone})` : ''}`;
      doc.text(debtorText, 190, finalY + 14, { align: 'right' });
      messageOffset = 26;
    }
    
    // Thank you message
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(user?.receiptFooter || 'Thank you for your purchase!', 105, finalY + messageOffset, { align: 'center' });
    
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
      <div className="checkout-page" style={{ padding: '20px', maxWidth: '1440px', margin: '0 auto' }}>
        {/* POS Header with Tab Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '24px', letterSpacing: '-0.02em' }}>
              <ShoppingCart size={24} style={{ color: 'var(--green-primary)' }} />
              Point of Sale (POS)
            </h1>
            <p className="page-subtitle" style={{ fontSize: '13.5px', marginTop: 2 }}>
              Fast barcode scanning, touchscreen catalog, and instant checkout
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border)'
          }}>
            <button
              onClick={() => setActiveTab('pos')}
              className={`btn btn-sm ${activeTab === 'pos' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: '8px',
                fontWeight: '700',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ShoppingCart size={15} />
              <span>POS Terminal</span>
              {cart.length > 0 && (
                <span style={{
                  background: 'white',
                  color: 'var(--green-dark)',
                  borderRadius: '999px',
                  padding: '1px 6px',
                  fontSize: '11px',
                  fontWeight: '800'
                }}>
                  {cart.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: '8px',
                fontWeight: '700',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <BarChart3 size={15} />
              <span>Sales History ({salesHistory.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'pos' ? (
          <div className="checkout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '20px' }}>
            {/* Left Column: Scanner & Quick Touch Product Catalog */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Scanner Section */}
              <div className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Camera size={18} style={{ color: 'var(--green-primary)' }} />
                    Barcode Scanner
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Auto-detects USB scanner</span>
                </div>

                {showScanner ? (
                  <BarcodeScanner
                    onDetected={handleBarcodeDetected}
                    onClose={() => setShowScanner(false)}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-outline"
                      onClick={() => setShowScanner(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Camera size={16} />
                      <span>Camera</span>
                    </button>
                    <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '220px' }}>
                      <input
                        ref={barcodeInputRef}
                        className="form-input"
                        placeholder="Scan or type barcode, then press Enter..."
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                        disabled={lookupLoading}
                        style={{ padding: '10px 14px', fontSize: '13.5px' }}
                      />
                      <button 
                        type="submit" 
                        className="btn btn-primary btn-sm"
                        disabled={lookupLoading || !manualBarcode.trim()}
                      >
                        {lookupLoading ? '...' : 'Add'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Remote Scanner Drawer */}
                {showRemoteScanner && (
                  <div style={{ marginTop: '16px' }}>
                    <RemoteScannerPairing onBarcodeScanned={handleBarcodeDetected} />
                  </div>
                )}

                {!showRemoteScanner && (
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowRemoteScanner(true)}
                    style={{ marginTop: '10px', fontSize: '12px', color: 'var(--green-primary)' }}
                  >
                    <Smartphone size={14} style={{ marginRight: 6 }} /> Use smartphone as wireless barcode scanner
                  </button>
                )}
              </div>

              {/* Quick Touch Product Catalog */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Package size={18} style={{ color: 'var(--green-primary)' }} />
                      Quick Product Picker
                    </h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      Click any item to add directly to cart
                    </p>
                  </div>

                  {/* Search input */}
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-light)' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search items..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      style={{ paddingLeft: '34px', padding: '8px 12px 8px 34px', fontSize: '13px' }}
                    />
                  </div>
                </div>

                {/* Category Pills */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '14px' }}>
                  {['all', 'food', 'electronics', 'clothing', 'household', 'other'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        border: '1px solid',
                        borderColor: selectedCategory === cat ? 'var(--green-primary)' : 'var(--border)',
                        background: selectedCategory === cat ? 'var(--green-50)' : 'white',
                        color: selectedCategory === cat ? 'var(--green-dark)' : 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat === 'all' ? 'All Items' : cat}
                    </button>
                  ))}
                </div>

                {/* Product Tiles Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                  gap: '12px',
                  maxHeight: '440px',
                  overflowY: 'auto',
                  paddingRight: '4px'
                }}>
                  {products
                    .filter(p => {
                      const matchesSearch = !productSearch.trim() || 
                        p.productName.toLowerCase().includes(productSearch.toLowerCase()) || 
                        (p.barcode && p.barcode.includes(productSearch));
                      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
                      return matchesSearch && matchesCat;
                    })
                    .map(product => {
                      const inCart = cart.find(c => c._id === product._id);
                      const isOutOfStock = product.stock <= 0;

                      return (
                        <div
                          key={product._id}
                          className="card-interactive"
                          onClick={() => !isOutOfStock && addToCart(product)}
                          style={{
                            padding: '14px',
                            background: inCart ? '#F0FDF4' : 'white',
                            border: `1.5px solid ${inCart ? 'var(--green-vibrant)' : 'var(--border)'}`,
                            borderRadius: '12px',
                            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                            opacity: isOutOfStock ? 0.6 : 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '8px',
                            position: 'relative'
                          }}
                        >
                          {inCart && (
                            <span style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              background: 'var(--green-primary)',
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: 800,
                              borderRadius: '999px',
                              padding: '2px 7px'
                            }}>
                              x{inCart.quantity}
                            </span>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '20px' }}>{categoryEmoji(product.category)}</span>
                            <p style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              margin: 0,
                              color: 'var(--text)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {product.productName}
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--green-primary)' }}>
                              {formatCurrency(product.sellingPrice)}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: isOutOfStock ? '#DC2626' : product.stock <= 5 ? '#D97706' : 'var(--text-muted)'
                            }}>
                              {isOutOfStock ? 'Out' : `${product.stock} left`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Right Column: Sticky Cart & Payment Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card" style={{
                position: 'sticky',
                top: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-md)',
                borderRadius: 'var(--radius-xl)'
              }}>
                {/* Cart Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShoppingCart size={19} style={{ color: 'var(--green-primary)' }} />
                    Active Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                  </h2>
                  {cart.length > 0 && (
                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCart([])}
                      style={{ color: '#EF4444', fontSize: '12px' }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Cart Items List */}
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'var(--bg-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      color: 'var(--text-light)'
                    }}>
                      <ShoppingCart size={28} />
                    </div>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', margin: '0 0 4px' }}>
                      Cart is empty
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: 0 }}>
                      Scan a barcode or click products to start
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                    {cart.map(item => (
                      <div 
                        key={item._id}
                        className="cart-item"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px',
                          padding: '10px 12px',
                          background: '#F8FAFC',
                          borderRadius: '10px',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontWeight: 700,
                            fontSize: '13px',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.productName}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                            {formatCurrency(item.sellingPrice)} × {item.quantity} = <strong>{formatCurrency(item.sellingPrice * item.quantity)}</strong>
                          </p>
                        </div>

                        {/* Quantity Stepper */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => updateQuantity(item._id, item.quantity - 1)}
                            style={{ padding: '4px 8px', height: '28px', minWidth: '28px', borderRadius: '6px' }}
                          >
                            <Minus size={13} />
                          </button>
                          <span style={{ fontWeight: 700, fontSize: '13px', minWidth: '22px', textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => updateQuantity(item._id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            style={{ padding: '4px 8px', height: '28px', minWidth: '28px', borderRadius: '6px' }}
                          >
                            <Plus size={13} />
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeFromCart(item._id)}
                            style={{ color: '#EF4444', padding: '4px 6px', height: '28px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cart Financial Summary */}
                {cart.length > 0 && (
                  <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1.5px dashed var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: 'var(--text-muted)' }}>
                      <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(cartTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                      <span style={{ color: 'var(--green-primary)', fontWeight: 600 }}>Expected Profit</span>
                      <span className="profit-pill" style={{ fontSize: '12px', padding: '2px 8px' }}>
                        +{formatCurrency(cartProfit)}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      fontSize: '22px',
                      fontWeight: 800,
                      marginTop: '4px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border)',
                      color: 'var(--text)'
                    }}>
                      <span>Total:</span>
                      <span style={{ color: 'var(--green-primary)' }}>{formatCurrency(cartTotal)}</span>
                    </div>

                    {/* Payment Method Selector */}
                    <div style={{ marginTop: '12px' }}>
                      <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontSize: '12px' }}>
                        Payment Method
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {[
                          { id: 'cash', label: 'Cash', icon: <Banknote size={15} /> },
                          { id: 'momo', label: 'MoMo', icon: <Smartphone size={15} /> },
                          { id: 'card', label: 'Card', icon: <CreditCard size={15} /> },
                          { id: 'bank', label: 'Bank', icon: <Building size={15} /> },
                          { id: 'credit', label: 'Credit', icon: <User size={15} /> },
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '8px 6px',
                              borderRadius: '8px',
                              fontSize: '12.5px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              border: '1.5px solid',
                              borderColor: paymentMethod === m.id ? 'var(--green-primary)' : 'var(--border)',
                              background: paymentMethod === m.id ? 'var(--green-50)' : 'white',
                              color: paymentMethod === m.id ? 'var(--green-dark)' : 'var(--text)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {m.icon}
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Debtor Fields for Sales on Credit */}
                    {paymentMethod === 'credit' && (
                      <div style={{
                        background: '#FEF2F2',
                        border: '1px dashed #F87171',
                        borderRadius: '10px',
                        padding: '12px',
                        marginTop: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <p style={{ color: '#B91C1C', fontWeight: 700, fontSize: '12.5px', margin: 0 }}>
                          Customer / Debtor Details
                        </p>
                        <div>
                          <input
                            type="text"
                            placeholder="Customer name *"
                            className="form-input"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Phone number (optional)"
                            className="form-input"
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Complete Sale CTA */}
                    <button
                      className="btn btn-primary btn-lg btn-full"
                      onClick={handleCheckout}
                      disabled={processing || cart.length === 0}
                      style={{
                        marginTop: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: 'var(--shadow-green)',
                        fontWeight: '800'
                      }}
                    >
                      {processing ? (
                        <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}/>&nbsp;Processing...</>
                      ) : (
                        <><Check size={18} /> Charge {formatCurrency(cartTotal)}</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Sales History Tab */
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={20} style={{ color: 'var(--green-primary)' }} />
                  Recent Sales History
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Click any transaction to view receipt, print, or download PDF
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {salesHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--text-muted)' }}><BarChart3 size={48} /></div>
                  <p style={{ color: 'var(--text-muted)' }}>No sales recorded yet</p>
                </div>
              ) : (
                salesHistory.map((sale, index) => (
                  <div 
                    key={sale._id || index}
                    className="card-interactive"
                    style={{ 
                      padding: '16px 20px', 
                      background: 'white', 
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}
                    onClick={() => setShowReceipt(sale)}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
                          #{sale._id?.slice(-8) || 'OFFLINE'}
                        </span>
                        <span className={`badge ${sale.paymentMethod === 'credit' ? 'badge-red' : 'badge-green'}`} style={{ textTransform: 'uppercase' }}>
                          {sale.paymentMethod || 'cash'}
                        </span>
                        {sale.offline && (
                          <span className="badge badge-yellow" style={{ gap: 4 }}>
                            <WifiOff size={11} /> Offline
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                        {formatDate(new Date(sale.createdAt))} at {formatTime(sale.createdAt)} · {sale.items?.length || 1} item(s)
                        {sale.customerName && ` · Customer: ${sale.customerName}`}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(sale.totalAmount)}
                      </span>
                      <button className="btn btn-outline btn-sm" style={{ padding: '6px 12px' }}>
                        <Receipt size={14} style={{ marginRight: 4 }} /> Receipt
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
                <p style={{ fontSize: '14px', color: '#666', textTransform: 'uppercase' }}>
                  Payment: {showReceipt.paymentMethod || 'CASH'}
                </p>
                {showReceipt.paymentMethod === 'credit' && showReceipt.customerName && (
                  <p style={{ fontSize: '13px', color: '#444', marginTop: '4px' }}>
                    <strong>Customer:</strong> {showReceipt.customerName}
                    {showReceipt.customerPhone && <> ({showReceipt.customerPhone})</>}
                  </p>
                )}
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
