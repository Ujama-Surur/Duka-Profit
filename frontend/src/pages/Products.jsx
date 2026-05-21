import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import BarcodeScanner from "../components/BarcodeScanner";
import api, { formatCurrency, offlineData } from "../utils/api";
import styles from "./Products.module.css";
import { Package, Search, Trash2, Save, Utensils, Smartphone, Shirt, Home, DollarSign, WifiOff, Plus, Pencil, X, Info, AlertTriangle } from 'lucide-react';

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
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [autoSaveActive, setAutoSaveActive] = useState(false);
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, []);

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
      } catch (e) {
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
    setForm(defaultForm);
    setErrors({});
    setAutoSaveActive(true);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditItem(product);
    setForm({
      productName: product.productName,
      barcode: product.barcode || "",
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      quantity: product.stock || "",
      expirationDate: product.expirationDate
        ? new Date(product.expirationDate).toISOString().split("T")[0]
        : "",
      lowStockThreshold: product.lowStockThreshold?.toString() || "10",
      category: product.category || "other",
      unitType: product.unitType || "pieces",
    });
    setErrors({});
    setAutoSaveActive(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setAutoSaveActive(false);
    setForm(defaultForm);
    setErrors({});
    localStorage.removeItem("duka_product_draft");
  };

  const validate = () => {
    const errs = {};

    // Product name validation
    if (!form.productName || form.productName.trim() === "") {
      errs.productName = "Product name required";
    }
    if (form.barcode && !form.barcode.trim()) {
      errs.barcode = "Barcode is invalid";
    }

    // Price validations
    const costPriceNum = parseFloat(form.costPrice);
    const sellingPriceNum = parseFloat(form.sellingPrice);

    if (!form.costPrice || isNaN(costPriceNum) || costPriceNum <= 0) {
      errs.costPrice = "Enter valid cost price";
    }

    if (!form.sellingPrice || isNaN(sellingPriceNum) || sellingPriceNum <= 0) {
      errs.sellingPrice = "Enter valid selling price";
    }

    if (sellingPriceNum <= costPriceNum) {
      errs.sellingPrice = "Selling price must be higher than cost price";
    }

    // Quantity validation
    const quantityNum = parseInt(form.quantity);
    if (!form.quantity || isNaN(quantityNum) || quantityNum < 0) {
      errs.quantity = "Quantity must be a non-negative number";
    }

    // Expiration date validation (only for food)
    if (form.category === "food" && !form.expirationDate) {
      errs.expirationDate = "Expiration date required for food items";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateBarcodeFormat = (barcode) => {
    // Check if barcode is empty
    if (!barcode || barcode.trim().length === 0) {
      return { valid: false, message: "Barcode cannot be empty" };
    }

    // Check barcode length (typical barcodes are 6-20 characters)
    if (barcode.length < 6 || barcode.length > 20) {
      return {
        valid: false,
        message: "Barcode must be between 6-20 characters",
      };
    }

    // Check for invalid characters (should only contain alphanumeric and common barcode chars)
    if (!/^[0-9A-Z-]*$/.test(barcode)) {
      return { valid: false, message: "Barcode contains invalid characters" };
    }

    return { valid: true };
  };

  const handleBarcodeDetected = async (barcodeValue) => {
    const barcode = String(barcodeValue || "")
      .trim()
      .toUpperCase();

    // Validate barcode format
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
      } else if (err.code === "ECONNABORTED") {
        toast.error("Barcode lookup timed out. Please try again.");
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
        ...form,
        stock: form.quantity,
        barcode: form.barcode?.trim() || undefined,
        expirationDate:
          form.category === "food" ? form.expirationDate : undefined,
        unitType: form.unitType,
      };

      if (editItem) {
        const { data } = await api.put(`/products/${editItem._id}`, payload);
        setProducts((prev) =>
          prev.map((p) => (p._id === editItem._id ? data : p)),
        );
        toast.success("Product updated!");
      } else {
        const { data } = await api.post("/products", payload);
        setProducts((prev) => [...prev, data]);
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

  const profit = (cost, sell) => sell - cost;
  const margin = (cost, sell) =>
    sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : 0;

  const filtered = products.filter(
    (p) =>
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase()),
  );

  const categoryEmoji = (c) =>
    ({
      food: <Utensils size={16} />,
      electronics: <Smartphone size={16} />,
      clothing: <Shirt size={16} />,
      household: <Home size={16} />,
      other: <Package size={16} />,
    })[c] || <Package size={16} />;

  return (
    <div className={styles.page}>
      <div className="page-header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 className="page-title" style={{display:'flex',alignItems:'center',gap:8}}><Package size={24} /> {t("products")}</h1>
            <p className="page-subtitle">
              {products.length} products in your library
            </p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={18} /> {t("addProduct")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <span className={styles.searchIcon}><Search size={18} /></span>
        <input
          className={styles.searchInput}
          placeholder={`${t("search")} products...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.clearSearch} onClick={() => setSearch("")}>
            ✕
          </button>
        )}
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
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Package size={48} /></div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>{t("noProducts")}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {t("addFirstProduct")}
            </p>
            <button className="btn btn-primary" onClick={openAdd}>
              ＋ {t("addProduct")}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((product, i) => (
            <div
              key={product._id}
              className={`${styles.productCard} animate-fade-in`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={styles.productHeader}>
                <div className={styles.productEmoji}>
                  {categoryEmoji(product.category)}
                </div>
                <div className={styles.productActions}>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => openEdit(product)}
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => setConfirmDelete(product)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className={styles.productName}>{product.productName}</h3>
              <span className={`badge badge-gray`} style={{ marginBottom: 12 }}>
                {t(product.category || "other")}
              </span>

              <div className={styles.priceRow}>
                <div className={styles.priceItem}>
                  <span className={styles.priceLabel}>Cost</span>
                  <span
                    className={styles.priceValue}
                    style={{ color: "var(--text-muted)" }}
                  >
                    {formatCurrency(product.costPrice)}
                  </span>
                </div>
                <div className={styles.priceDivider}>→</div>
                <div className={styles.priceItem}>
                  <span className={styles.priceLabel}>Sell</span>
                  <span className={styles.priceValue}>
                    {formatCurrency(product.sellingPrice)}
                  </span>
                </div>
              </div>

              <div className={styles.profitRow}>
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    PROFIT/UNIT
                  </p>
                  <p
                    className="profit-text"
                    style={{ fontSize: 18, fontWeight: 800 }}
                  >
                    +
                    {formatCurrency(
                      profit(product.costPrice, product.sellingPrice),
                    )}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    MARGIN
                  </p>
                  <p
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "var(--green-primary)",
                    }}
                  >
                    {margin(product.costPrice, product.sellingPrice)}%
                  </p>
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span
                      style={{ color: "var(--text-muted)", fontWeight: 600 }}
                    >
                      Stock:
                    </span>
                    <span
                      style={{
                        marginLeft: 4,
                        color:
                          product.stock <= product.lowStockThreshold
                            ? "var(--red)"
                            : "var(--text)",
                      }}
                    >
                      {product.stock || 0}
                    </span>
                    {product.stock <= product.lowStockThreshold && (
                      <span
                        style={{
                          marginLeft: 4,
                          color: "var(--red)",
                          fontSize: "11px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 2
                        }}
                      >
                        <AlertTriangle size={12} /> Low
                      </span>
                    )}
                  </div>
                  <div>
                    <span
                      style={{ color: "var(--text-muted)", fontWeight: 600 }}
                    >
                      Expires:
                    </span>
                    <span style={{ marginLeft: 4 }}>
                      {product.expirationDate
                        ? new Date(product.expirationDate).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
          <div className="modal" role="document" tabIndex="-1">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <h2 id="modal-title" style={{ fontSize: 20, fontWeight: 800 }}>
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
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {!editItem && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowScanner(true)}
                  >
                    Scan Product
                  </button>
                  {form.barcode && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setShowScanner(true)}
                    >
                      Scan Again
                    </button>
                  )}
                  {lookupLoading && (
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      Looking up product...
                    </span>
                  )}
                </div>
              )}

              {showScanner && (
                <BarcodeScanner
                  onDetected={handleBarcodeDetected}
                  onClose={() => setShowScanner(false)}
                />
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="product-name">
                  {t("productName")}
                </label>
                <input
                  id="product-name"
                  className={`form-input form-input-lg ${errors.productName ? "error" : ""}`}
                  placeholder="e.g. Coca Cola 500ml"
                  value={form.productName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      productName: e.target.value,
                    }))
                  }
                  aria-required="true"
                  aria-describedby={
                    errors.productName ? "product-name-error" : undefined
                  }
                />
                {errors.productName && (
                  <span
                    id="product-name-error"
                    className="form-error"
                    role="alert"
                  >
                    {errors.productName}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="barcode">
                  Barcode
                </label>
                <input
                  id="barcode"
                  className={`form-input ${errors.barcode ? "error" : ""}`}
                  placeholder="Scan or enter barcode"
                  value={form.barcode}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, barcode: e.target.value }))
                  }
                  aria-describedby={
                    errors.barcode ? "barcode-error" : undefined
                  }
                />
                {errors.barcode && (
                  <span id="barcode-error" className="form-error" role="alert">
                    {errors.barcode}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t("category")}</label>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                      expirationDate:
                        e.target.value === "food" ? prev.expirationDate : "",
                    }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryEmoji(c)} {t(c)}
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
                  {UNIT_TYPES.map((u) => (
                    <option key={u} value={u}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div className="form-group">
                  <label className="form-label">{t("costPrice")} (RWF)</label>
                  <input
                    className={`form-input ${errors.costPrice ? "error" : ""}`}
                    type="number"
                    placeholder="0"
                    min="0"
                    value={form.costPrice}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        costPrice: e.target.value,
                      }))
                    }
                  />
                  {errors.costPrice && (
                    <span className="form-error">{errors.costPrice}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {t("sellingPrice")} (RWF)
                  </label>
                  <input
                    className={`form-input ${errors.sellingPrice ? "error" : ""}`}
                    type="number"
                    placeholder="0"
                    min="0"
                    value={form.sellingPrice}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sellingPrice: e.target.value,
                      }))
                    }
                  />
                  {errors.sellingPrice && (
                    <span className="form-error">{errors.sellingPrice}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Stock</label>
                  <input
                    className={`form-input ${errors.quantity ? "error" : ""}`}
                    type="number"
                    placeholder="0"
                    min="0"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                  />
                  {errors.quantity && (
                    <span className="form-error">{errors.quantity}</span>
                  )}
                </div>
                {form.category === "food" && (
                  <div className="form-group">
                    <label className="form-label">
                      Expiration Date{" "}
                      <span style={{ color: "var(--red)" }}>*</span>
                    </label>
                    <input
                      className={`form-input ${errors.expirationDate ? "error" : ""}`}
                      type="date"
                      value={form.expirationDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          expirationDate: e.target.value,
                        }))
                      }
                    />
                    {errors.expirationDate && (
                      <span className="form-error">
                        {errors.expirationDate}
                      </span>
                    )}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Low Stock Threshold</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="10"
                    min="0"
                    value={form.lowStockThreshold || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        lowStockThreshold: e.target.value,
                      }))
                    }
                  />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Alert when stock reaches this level
                  </span>
                </div>
              </div>

              {/* Live profit preview */}
              {form.costPrice &&
                form.sellingPrice &&
                Number(form.sellingPrice) > Number(form.costPrice) && (
                  <div
                    style={{
                      padding: "14px 16px",
                      background: "var(--green-50)",
                      border: "1px solid var(--green-200)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 20 }}><DollarSign size={20} /></span>
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--green-dark)",
                          fontWeight: 600,
                        }}
                      >
                        PROFIT PER UNIT
                      </p>
                      <p className="profit-text" style={{ fontSize: 20 }}>
                        +{formatCurrency(form.sellingPrice - form.costPrice)}
                      </p>
                    </div>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--green-dark)",
                          fontWeight: 600,
                        }}
                      >
                        MARGIN
                      </p>
                      <p className="profit-text" style={{ fontSize: 20 }}>
                        {margin(form.costPrice, form.sellingPrice)}%
                      </p>
                    </div>
                  </div>
                )}

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
                >
                  {saving ? "..." : `${t("save")}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 12, color:'var(--red)' }}><Trash2 size={48} /></div>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>Delete Product?</h3>
              <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
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
