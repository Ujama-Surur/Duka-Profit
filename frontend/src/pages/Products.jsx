import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import BarcodeScanner from "../components/BarcodeScanner";
import api, { formatCurrency, offlineData } from "../utils/api";
import { SUPPORTED_CURRENCIES, calculateReplacementCost, calculateSuggestedSellingPrice } from "../utils/currencyUtils";
import styles from "./Products.module.css";
import { 
  Package, Search, Trash2, Save, Utensils, Smartphone, Shirt, Home, 
  DollarSign, WifiOff, Plus, Pencil, X, Info, AlertTriangle, 
  TrendingUp, Boxes, Barcode, Camera, Calendar, Layers, CheckCircle2,
  ShieldAlert, RefreshCw, ArrowUpRight
} from 'lucide-react';

const CATEGORIES = ["food", "electronics", "clothing", "household", "other"];
const UNIT_TYPES = ["pieces", "box", "kg", "whole sack", "liter", "meter", "pack"];

const defaultForm = {
  productName: "",
  barcode: "",
  costPrice: "",
  sellingPrice: "",
  quantity: "",
  expirationDate: "",
  lowStockThreshold: "10",
  category: "other",
  unitType: "pieces",
  productImageUrl: "",
  pricingMode: "fixed",
  currency: "USD",
  baseCost: "",
  purchaseExchangeRate: "",
  targetMargin: "20",
};

export default function Products() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [autoSaveActive, setAutoSaveActive] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const [categoriesList, setCategoriesList] = useState([]);
  const [unitTypesList, setUnitTypesList] = useState([]);
  const [currencySettings, setCurrencySettings] = useState(null);
  const [currentRate, setCurrentRate] = useState(null);

  useEffect(() => {
    loadProducts();
    loadCategoriesAndUnits();
    loadCurrencyInfo();
  }, []);

  const loadCurrencyInfo = async () => {
    try {
      const [settingsRes, rateRes] = await Promise.all([
        api.get("/currency/settings").catch(() => ({ data: null })),
        api.get("/currency/rate/current").catch(() => ({ data: null })),
      ]);
      if (settingsRes?.data) setCurrencySettings(settingsRes.data);
      if (rateRes?.data?.rate) setCurrentRate(rateRes.data);
    } catch {
      // offline or not configured
    }
  };

  const loadCategoriesAndUnits = async () => {
    try {
      const [catsRes, unitsRes] = await Promise.all([
        api.get("/categories"),
        api.get("/unit-types"),
      ]);
      setCategoriesList(catsRes.data);
      setUnitTypesList(unitsRes.data);
    } catch {
      console.error("Failed to load custom categories or units");
    }
  };

  const displayCategories = categoriesList.length > 0 
    ? categoriesList.map(c => ({ name: c.name, _id: c._id }))
    : [
        { name: 'food' },
        { name: 'electronics' },
        { name: 'clothing' },
        { name: 'household' },
        { name: 'other' }
      ];

  const displayUnitTypes = unitTypesList.length > 0
    ? unitTypesList.map(u => ({ name: u.name, _id: u._id }))
    : [
        { name: 'pieces' },
        { name: 'box' },
        { name: 'kg' },
        { name: 'whole sack' },
        { name: 'liter' },
        { name: 'meter' },
        { name: 'pack' }
      ];

  // Auto-save form to localStorage with debounce
  useEffect(() => {
    if (!showModal || !autoSaveActive) return;

    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          "duka_product_draft",
          JSON.stringify({ form, editItem }),
        );
      } catch {
        // Silently fail if localStorage is full
      }
    }, 1000);

    return () => clearTimeout(autoSaveTimerRef.current);
  }, [form, showModal, autoSaveActive]);

  const loadProducts = async () => {
    try {
      const { data } = await api.get("/products");
      setProducts(data);
      await offlineData.set("products", data);
    } catch {
      const cached = await offlineData.get("products");
      if (cached) setProducts(cached);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({
      ...defaultForm,
      currency: currencySettings?.baseCurrency || "USD",
      purchaseExchangeRate: currentRate?.rate ? currentRate.rate.toString() : "",
      targetMargin: currencySettings?.minProtectionMargin ? currencySettings.minProtectionMargin.toString() : "20",
    });
    setErrors({});
    setAutoSaveActive(true);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditItem(product);
    setForm({
      productName: product.productName,
      barcode: product.barcode || "",
      costPrice: product.costPrice ? product.costPrice.toString() : "",
      sellingPrice: product.sellingPrice ? product.sellingPrice.toString() : "",
      quantity: (product.stock ?? product.quantity ?? 0).toString(),
      expirationDate: product.expirationDate 
        ? new Date(product.expirationDate).toISOString().split("T")[0] 
        : "",
      category: product.category || "other",
      unitType: product.unitType || "pieces",
      productImageUrl: product.productImageUrl || "",
      lowStockThreshold: product.lowStockThreshold?.toString() || "10",
      pricingMode: product.pricingMode || "fixed",
      currency: product.currency || currencySettings?.baseCurrency || "USD",
      baseCost: product.baseCost != null ? product.baseCost.toString() : "",
      purchaseExchangeRate: product.purchaseExchangeRate != null 
        ? product.purchaseExchangeRate.toString() 
        : (currentRate?.rate ? currentRate.rate.toString() : ""),
      targetMargin: product.targetMargin != null 
        ? product.targetMargin.toString() 
        : (currencySettings?.minProtectionMargin ? currencySettings.minProtectionMargin.toString() : "20"),
    });
    setErrors({});
    setAutoSaveActive(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowScanner(false);
    setAutoSaveActive(false);
    setForm(defaultForm);
    setErrors({});
    localStorage.removeItem("duka_product_draft");
  };

  const validate = () => {
    const errs = {};

    if (!form.productName || form.productName.trim() === "") {
      errs.productName = "Product name is required";
    }

    const cost = parseFloat(form.costPrice || 0);
    const sell = parseFloat(form.sellingPrice || 0);

    if (form.costPrice && (isNaN(cost) || cost < 0)) {
      errs.costPrice = "Cost price must be 0 or higher";
    }

    if (form.sellingPrice && (isNaN(sell) || sell < 0)) {
      errs.sellingPrice = "Selling price must be 0 or higher";
    }

    if (sell > 0 && sell <= cost) {
      errs.sellingPrice = "Selling price must be higher than cost price";
    }

    if (form.category === "food" && !form.expirationDate && sell > 0) {
      errs.expirationDate = "Expiration date is required for food items";
    }

    if (form.lowStockThreshold !== undefined && form.lowStockThreshold !== "") {
      const threshold = parseInt(form.lowStockThreshold, 10);
      if (isNaN(threshold) || threshold < 0) {
        errs.lowStockThreshold = "Must be a non-negative integer";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateBarcodeFormat = (barcode) => {
    if (!barcode || barcode.trim().length === 0) {
      return { valid: false, message: "Barcode cannot be empty" };
    }
    if (barcode.length < 4 || barcode.length > 30) {
      return {
        valid: false,
        message: "Barcode must be between 4-30 characters",
      };
    }
    return { valid: true };
  };

  const handleBarcodeDetected = async (barcodeValue) => {
    const barcode = String(barcodeValue || "")
      .trim()
      .toUpperCase();

    const validation = validateBarcodeFormat(barcode);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setForm((prev) => ({ ...prev, barcode }));
    setShowScanner(false);
    setLookupLoading(true);
    setErrors((prev) => ({ ...prev, barcode: undefined }));

    try {
      const { data } = await api.get(
        `/products/barcode/${encodeURIComponent(barcode)}`,
      );
      if (data?.found && data?.product) {
        const product = data.product;
        setForm((prev) => ({
          ...prev,
          barcode,
          productName: product.productName || prev.productName,
          costPrice: product.costPrice?.toString() || prev.costPrice,
          sellingPrice: product.sellingPrice?.toString() || prev.sellingPrice,
          quantity: product.stock?.toString() || prev.quantity,
          lowStockThreshold:
            product.lowStockThreshold?.toString() || prev.lowStockThreshold,
          category: product.category || prev.category,
          unitType: product.unitType || prev.unitType,
          productImageUrl: product.productImageUrl || prev.productImageUrl || "",
          expirationDate: product.expirationDate
            ? new Date(product.expirationDate).toISOString().split("T")[0]
            : prev.expirationDate,
        }));
        toast.success("Product found. Form auto-filled.");
      } else {
        toast("Product not found. Enter details and save.", { icon: <Info size={16} color="var(--green-primary)" /> });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        toast("Product not found. Enter details and save.", { icon: <Info size={16} color="var(--green-primary)" /> });
      } else {
        toast.error(err.response?.data?.message || "Failed to look up barcode");
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const isValid = validate();
    if (!isValid) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        productName: form.productName.trim(),
        barcode: form.barcode?.trim() || undefined,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : 0,
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : 0,
        quantity: form.quantity ? parseInt(form.quantity, 10) : 0,
        stock: form.quantity ? parseInt(form.quantity, 10) : (editItem ? editItem.stock : 0),
        expirationDate: form.expirationDate || undefined,
        category: form.category,
        unitType: form.unitType,
        productImageUrl: form.productImageUrl?.trim() || undefined,
        lowStockThreshold: form.lowStockThreshold ? parseInt(form.lowStockThreshold, 10) : 10,
        pricingMode: form.pricingMode || "fixed",
        currency: form.currency || "USD",
        baseCost: form.baseCost ? parseFloat(form.baseCost) : undefined,
        purchaseExchangeRate: form.purchaseExchangeRate ? parseFloat(form.purchaseExchangeRate) : undefined,
        targetMargin: form.targetMargin ? parseFloat(form.targetMargin) : undefined,
      };

      if (editItem) {
        const { data } = await api.put(`/products/${editItem._id}`, payload);
        setProducts((prev) =>
          prev.map((p) => (p._id === editItem._id ? data : p)),
        );
        toast.success("Product updated!");
      } else {
        const { data } = await api.post("/products", payload);
        setProducts((prev) => [data, ...prev]);
        toast.success("Product added!");
      }
      closeModal();
      await offlineData.set("products", products);
    } catch (err) {
      if (!navigator.onLine) {
        toast("Saved offline — will sync when connected", { icon: <WifiOff size={16} /> });
        closeModal();
      } else {
        toast.error(err.response?.data?.message || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      toast.success("Product deleted");
      setConfirmDelete(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const profit = (cost, sell) => (sell || 0) - (cost || 0);
  const margin = (cost, sell) =>
    sell > 0 ? ((((sell || 0) - (cost || 0)) / sell) * 100).toFixed(1) : 0;

  // Filtered list based on search and category
  const filtered = products.filter((p) => {
    const matchesSearch = 
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate metrics
  const totalStock = products.reduce((sum, p) => sum + (p.stock || p.quantity || 0), 0);
  const lowStockCount = products.filter((p) => (p.stock || 0) <= (p.lowStockThreshold ?? 10)).length;
  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.stock || p.quantity || 0)), 0);

  const categoryEmoji = (c) =>
    ({
      food: <Utensils size={16} />,
      electronics: <Smartphone size={16} />,
      clothing: <Shirt size={16} />,
      household: <Home size={16} />,
      other: <Package size={16} />,
    })[c] || <Package size={16} />;

  // Modal profit calculations
  const modalCost = parseFloat(form.costPrice || 0);
  const modalSell = parseFloat(form.sellingPrice || 0);
  const modalProfit = modalSell - modalCost;
  const modalMargin = modalSell > 0 ? ((modalProfit / modalSell) * 100).toFixed(1) : 0;

  // Modal currency preview calculations
  const previewRate = parseFloat(currentRate?.rate || form.purchaseExchangeRate || 0);
  const previewBaseCost = parseFloat(form.baseCost || 0);
  const previewRounding = currencySettings?.roundingRule || "none";
  const previewReplacement = calculateReplacementCost(previewBaseCost, previewRate, previewRounding);
  const previewSuggested = calculateSuggestedSellingPrice(previewReplacement, parseFloat(form.targetMargin || 20), previewRounding);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className="page-header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '24px', letterSpacing: '-0.02em' }}>
              <Package size={26} style={{ color: 'var(--green-primary)' }} /> 
              {t("products")}
            </h1>
            <p className="page-subtitle" style={{ fontSize: '13.5px', marginTop: 2 }}>
              Manage your product catalog, pricing margins, stock alerts, and barcodes
            </p>
          </div>
          <button 
            className="btn btn-primary btn-lg" 
            onClick={openAdd} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              boxShadow: 'var(--shadow-green)',
              fontWeight: 700
            }}
          >
            <Plus size={18} /> {t("addProduct")}
          </button>
        </div>
      </div>

      {/* Stats Overview Bar */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--green-50)', color: 'var(--green-primary)' }}>
            <Package size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Products</span>
            <span className={styles.statValue}>{products.length}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <Boxes size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Units in Stock</span>
            <span className={styles.statValue}>{totalStock}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#FFFBEB', color: '#D97706' }}>
            <AlertTriangle size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Low Stock Items</span>
            <span className={styles.statValue} style={{ color: lowStockCount > 0 ? '#D97706' : 'inherit' }}>
              {lowStockCount}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#F5F3FF', color: '#7C3AED' }}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Inventory Value</span>
            <span className={styles.statValue}>{formatCurrency(totalInventoryValue)}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}><Search size={18} /></span>
          <input
            className={styles.searchInput}
            placeholder="Search by product name, barcode, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch("")}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className={styles.categoryPills}>
          <button
            type="button"
            className={`${styles.categoryPill} ${selectedCategory === "all" ? styles.categoryPillActive : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            All Products ({products.length})
          </button>
          {displayCategories.map((c) => {
            const count = products.filter((p) => p.category === c.name).length;
            return (
              <button
                key={c._id || c.name}
                type="button"
                className={`${styles.categoryPill} ${selectedCategory === c.name ? styles.categoryPillActive : ""}`}
                onClick={() => setSelectedCategory(c.name)}
              >
                {categoryEmoji(c.name.toLowerCase())}
                <span style={{ textTransform: 'capitalize' }}>{c.name}</span>
                <span style={{ opacity: 0.7, fontSize: '11px' }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "60px 0",
          }}
        >
          <div className="spinner"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--text-light)'
          }}>
            <Package size={32} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>{t("noProducts")}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: '0 0 16px' }}>
            {search || selectedCategory !== "all" 
              ? "No products match your current search or category filter." 
              : t("addFirstProduct")}
          </p>
          <button className="btn btn-primary" onClick={openAdd}>
            ＋ {t("addProduct")}
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((product, i) => {
            const isOutOfStock = (product.stock ?? 0) === 0;
            const isLowStock = !isOutOfStock && (product.stock ?? 0) <= (product.lowStockThreshold ?? 10);
            const m = margin(product.costPrice, product.sellingPrice);

            return (
              <div
                key={product._id}
                className={styles.productCard}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Header: Avatar + Stock Badge + Actions */}
                <div className={styles.productHeader}>
                  <div className={styles.productAvatar}>
                    {product.productImageUrl ? (
                      <img 
                        src={product.productImageUrl} 
                        alt={product.productName} 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      categoryEmoji(product.category)
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isOutOfStock ? (
                      <span className="badge badge-red" style={{ fontSize: '11px', fontWeight: 800 }}>
                        Out of stock
                      </span>
                    ) : isLowStock ? (
                      <span className="badge badge-yellow" style={{ fontSize: '11px', fontWeight: 800 }}>
                        Low: {product.stock} left
                      </span>
                    ) : (
                      <span className="badge badge-green" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {product.stock} {product.unitType || 'in stock'}
                      </span>
                    )}

                    <div className={styles.productActions}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openEdit(product)}
                        title="Edit product"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setConfirmDelete(product)}
                        title="Delete product"
                        style={{ color: '#EF4444' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product Name */}
                <h3 className={styles.productName} title={product.productName}>
                  {product.productName}
                </h3>

                {/* Below Replacement Cost Alert */}
                {(product.isBelowReplacementCost || (product.currentReplacementCost && product.sellingPrice < product.currentReplacementCost)) && (
                  <div style={{
                    marginTop: 6,
                    marginBottom: 6,
                    padding: '5px 8px',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: 6,
                    color: '#991B1B',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0, color: '#DC2626' }} />
                    <span>⚠️ Below Replacement Cost ({formatCurrency(product.currentReplacementCost)})</span>
                  </div>
                )}

                {/* Meta Row: Category & Unit */}
                <div className={styles.metaRow}>
                  <span className="badge badge-gray" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                    {product.category || "other"}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Unit: <strong>{product.unitType || 'pieces'}</strong>
                  </span>
                  {product.pricingMode && product.pricingMode !== 'fixed' && (
                    <span className="badge badge-yellow" style={{ fontSize: '10.5px' }}>
                      {product.currency || 'USD'} Linked
                    </span>
                  )}
                  {product.barcode && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Barcode size={12} /> {product.barcode}
                    </span>
                  )}
                </div>

                {/* Pricing Box */}
                <div className={styles.priceRow}>
                  <div className={styles.priceItem}>
                    <span className={styles.priceLabel}>
                      {product.pricingMode && product.pricingMode !== 'fixed' ? 'Hist. Cost' : 'Cost'}
                    </span>
                    <span className={styles.priceValue}>{formatCurrency(product.costPrice || 0)}</span>
                  </div>
                  {product.currentReplacementCost && product.pricingMode && product.pricingMode !== 'fixed' && (
                    <>
                      <span className={styles.priceDivider}>/</span>
                      <div className={styles.priceItem}>
                        <span className={styles.priceLabel} style={{ color: '#D97706' }}>Repl. Cost</span>
                        <span className={styles.priceValue} style={{ color: '#D97706' }}>
                          {formatCurrency(product.currentReplacementCost)}
                        </span>
                      </div>
                    </>
                  )}
                  <span className={styles.priceDivider}>/</span>
                  <div className={styles.priceItem}>
                    <span className={styles.priceLabel} style={{ color: 'var(--green-primary)' }}>Selling Price</span>
                    <span className={styles.priceValue} style={{ color: 'var(--green-primary)', fontSize: '15px' }}>
                      {formatCurrency(product.sellingPrice || 0)}
                    </span>
                  </div>
                </div>

                {/* Profit Margin & Stock Footer */}
                <div className={styles.profitRow}>
                  <span>Profit: <strong>+{formatCurrency(profit(product.costPrice, product.sellingPrice))}</strong></span>
                  <span className={styles.marginPill}>
                    +{m}% margin
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="card" style={{ maxWidth: 540, width: '100%', margin: '40px auto', maxHeight: '90vh', overflowY: 'auto' }} role="document" tabIndex="-1">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h2 id="modal-title" style={{ fontSize: 19, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={20} style={{ color: 'var(--green-primary)' }} />
                {editItem ? t("editProduct") : t("addProduct")}
              </h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={closeModal}
                aria-label="Close modal"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {/* Product Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="product-name">
                  {t("productName")} *
                </label>
                <input
                  id="product-name"
                  className={`form-input ${errors.productName ? "error" : ""}`}
                  placeholder="e.g. Inyange Milk 500ml"
                  value={form.productName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      productName: e.target.value,
                    }))
                  }
                  aria-required="true"
                />
                {errors.productName && (
                  <span className="form-error" role="alert">
                    {errors.productName}
                  </span>
                )}
              </div>

              {/* Barcode with Scanner */}
              <div className="form-group">
                <label className="form-label" htmlFor="product-barcode">
                  Barcode (Optional)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="product-barcode"
                    className="form-input"
                    placeholder="Scan or type barcode..."
                    value={form.barcode}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        barcode: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowScanner(!showScanner)}
                    title="Scan with camera"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                  >
                    <Camera size={16} />
                    <span>Scan</span>
                  </button>
                </div>
                {showScanner && (
                  <div style={{ marginTop: 10 }}>
                    <BarcodeScanner
                      onDetected={handleBarcodeDetected}
                      onClose={() => setShowScanner(false)}
                    />
                  </div>
                )}
              </div>

              {/* Category & Unit Type (2 Columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{t("category")}</label>
                  <select
                    className="form-input"
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    {displayCategories.map((c) => (
                      <option key={c._id || c.name} value={c.name}>
                        {c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Unit Type</label>
                  <select
                    className="form-input"
                    value={form.unitType}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        unitType: e.target.value,
                      }))
                    }
                  >
                    {displayUnitTypes.map((u) => (
                      <option key={u._id || u.name} value={u.name}>
                        {u.name.charAt(0).toUpperCase() + u.name.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing (Cost & Selling Price) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="cost-price">
                    Cost Price ({currencySettings?.sellingCurrency || 'Local'})
                  </label>
                  <input
                    id="cost-price"
                    type="number"
                    min="0"
                    step="any"
                    className={`form-input ${errors.costPrice ? "error" : ""}`}
                    placeholder="e.g. 500"
                    value={form.costPrice}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        costPrice: e.target.value,
                      }))
                    }
                  />
                  {errors.costPrice && (
                    <span className="form-error" role="alert">{errors.costPrice}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="selling-price">
                    Selling Price ({currencySettings?.sellingCurrency || 'Local'})
                  </label>
                  <input
                    id="selling-price"
                    type="number"
                    min="0"
                    step="any"
                    className={`form-input ${errors.sellingPrice ? "error" : ""}`}
                    placeholder="e.g. 700"
                    value={form.sellingPrice}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sellingPrice: e.target.value,
                      }))
                    }
                  />
                  {errors.sellingPrice && (
                    <span className="form-error" role="alert">{errors.sellingPrice}</span>
                  )}
                </div>
              </div>

              {/* Currency Protection & Pricing Strategy */}
              <div style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    <ShieldAlert size={16} color="var(--green-primary)" />
                    Pricing Strategy & Currency Protection
                  </label>
                  <span className="badge badge-gray" style={{ fontSize: '10.5px' }}>
                    {currencySettings?.isEnabled ? 'Protection Active' : 'Standard'}
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <select
                    className="form-input"
                    value={form.pricingMode || 'fixed'}
                    onChange={(e) => setForm(prev => ({ ...prev, pricingMode: e.target.value }))}
                  >
                    <option value="fixed">Fixed Price (Manual pricing in {currencySettings?.sellingCurrency || 'Local Currency'})</option>
                    <option value="currency_linked">Currency-Linked (Auto-recalculates cost & suggested price via exchange rate)</option>
                    <option value="replacement_protected">Replacement-Protected (Alerts when price drops below replacement cost)</option>
                  </select>
                </div>

                {form.pricingMode !== 'fixed' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>Purchase Currency</label>
                        <select
                          className="form-input"
                          value={form.currency || 'USD'}
                          onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))}
                        >
                          {SUPPORTED_CURRENCIES.map(curr => (
                            <option key={curr.code} value={curr.code}>{curr.code} - {curr.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>Base Cost ({form.currency || 'USD'})</label>
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
                              const newForm = { ...prev, baseCost: val };
                              const rate = parseFloat(newForm.purchaseExchangeRate || currentRate?.rate || 0);
                              if (rate > 0 && val) {
                                newForm.costPrice = (parseFloat(val) * rate).toFixed(2);
                              }
                              return newForm;
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>
                          Purchase Exchange Rate ({currencySettings?.sellingCurrency || 'Local'}/{form.currency || 'USD'})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="form-input"
                          placeholder={currentRate?.rate ? `Current: ${currentRate.rate}` : "e.g. 3500"}
                          value={form.purchaseExchangeRate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm(prev => {
                              const newForm = { ...prev, purchaseExchangeRate: val };
                              const base = parseFloat(newForm.baseCost || 0);
                              if (base > 0 && val) {
                                newForm.costPrice = (base * parseFloat(val)).toFixed(2);
                              }
                              return newForm;
                            });
                          }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>Target Margin %</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="500"
                          className="form-input"
                          placeholder="e.g. 20"
                          value={form.targetMargin}
                          onChange={(e) => setForm(prev => ({ ...prev, targetMargin: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Live Preview Box */}
                    {parseFloat(form.baseCost || 0) > 0 && (
                      <div style={{
                        background: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: '#4B5563' }}>Current Market Rate:</span>
                          <strong>{currentRate?.rate ? `${currentRate.rate} ${currencySettings?.sellingCurrency || 'Local'}/${form.currency || 'USD'}` : 'Not set'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: '#4B5563' }}>Current Replacement Cost:</span>
                          <strong style={{ color: '#1E40AF' }}>{formatCurrency(previewReplacement)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '1px dashed #C7D2FE' }}>
                          <div>
                            <span style={{ color: '#4B5563', display: 'block' }}>Suggested Selling Price:</span>
                            <span style={{ color: '#047857', fontWeight: 800, fontSize: '14px' }}>{formatCurrency(previewSuggested)}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setForm(prev => ({ ...prev, sellingPrice: previewSuggested.toString() }))}
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            Apply Suggested Price
                          </button>
                        </div>

                        {parseFloat(form.sellingPrice || 0) > 0 && parseFloat(form.sellingPrice) < previewReplacement && (
                          <div style={{
                            marginTop: 8,
                            padding: '6px 8px',
                            background: '#FEE2E2',
                            border: '1px solid #F87171',
                            borderRadius: '6px',
                            color: '#991B1B',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}>
                            <AlertTriangle size={14} color="#DC2626" />
                            Warning: Selling price is below replacement cost!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Real-time Profit Preview */}
              {modalSell > 0 && (
                <div className={styles.marginPreviewBox}>
                  <div>
                    <span style={{ fontSize: '11.5px', color: 'var(--green-dark)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Profit Per Unit
                    </span>
                    <p style={{ margin: '2px 0 0', fontWeight: 800, fontSize: '16px', color: 'var(--green-dark)' }}>
                      +{formatCurrency(modalProfit)}
                    </p>
                  </div>
                  <span className={styles.marginPill} style={{ fontSize: '13px', padding: '4px 12px' }}>
                    +{modalMargin}% Margin
                  </span>
                </div>
              )}

              {/* Stock & Low Stock Threshold (2 Columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="product-quantity">
                    {editItem ? "Stock Quantity" : "Initial Stock"}
                  </label>
                  <input
                    id="product-quantity"
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="e.g. 50"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="low-stock-threshold">
                    Low Stock Alert
                  </label>
                  <input
                    id="low-stock-threshold"
                    type="number"
                    min="0"
                    className={`form-input ${errors.lowStockThreshold ? "error" : ""}`}
                    placeholder="e.g. 10"
                    value={form.lowStockThreshold}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        lowStockThreshold: e.target.value,
                      }))
                    }
                  />
                  {errors.lowStockThreshold && (
                    <span className="form-error" role="alert">
                      {errors.lowStockThreshold}
                    </span>
                  )}
                </div>
              </div>

              {/* Expiration Date (for Food Items) */}
              {form.category === "food" && (
                <div className="form-group">
                  <label className="form-label" htmlFor="expiration-date">
                    Expiration Date *
                  </label>
                  <input
                    id="expiration-date"
                    type="date"
                    className={`form-input ${errors.expirationDate ? "error" : ""}`}
                    value={form.expirationDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        expirationDate: e.target.value,
                      }))
                    }
                  />
                  {errors.expirationDate && (
                    <span className="form-error" role="alert">
                      {errors.expirationDate}
                    </span>
                  )}
                </div>
              )}

              {/* Product Image URL */}
              <div className="form-group">
                <label className="form-label" htmlFor="product-image-url">
                  Product Image URL (Optional)
                </label>
                <input
                  id="product-image-url"
                  className="form-input"
                  placeholder="https://example.com/image.jpg"
                  value={form.productImageUrl || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      productImageUrl: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-full"
                  onClick={closeModal}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={saving}
                  style={{ fontWeight: 800, boxShadow: 'var(--shadow-green)' }}
                >
                  {saving ? "Saving..." : editItem ? "Update Product" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: 400, margin: '40px auto', padding: '24px' }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ 
                width: 56, 
                height: 56, 
                borderRadius: '50%', 
                background: '#FEF2F2', 
                color: '#DC2626', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 14px' 
              }}>
                <Trash2 size={28} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Delete Product?</h3>
              <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: '13.5px' }}>
                Are you sure you want to delete{" "}
                <strong>{confirmDelete.productName}</strong>? This cannot be
                undone.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-ghost btn-full"
                onClick={() => setConfirmDelete(null)}
              >
                {t("cancel")}
              </button>
              <button
                className="btn btn-danger btn-full"
                onClick={() => handleDelete(confirmDelete._id)}
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
