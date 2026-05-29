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
  productImageUrl: "",
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
  const [categoriesList, setCategoriesList] = useState([]);
  const [unitTypesList, setUnitTypesList] = useState([]);

  useEffect(() => {
    loadProducts();
    loadCategoriesAndUnits();
  }, []);

  const loadCategoriesAndUnits = async () => {
    try {
      const [catsRes, unitsRes] = await Promise.all([
        api.get("/categories"),
        api.get("/unit-types"),
      ]);
      setCategoriesList(catsRes.data);
      setUnitTypesList(unitsRes.data);
    } catch (err) {
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
      category: product.category || "other",
      unitType: product.unitType || "pieces",
      productImageUrl: product.productImageUrl || "",
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
        productName: form.productName.trim(),
        category: form.category,
        unitType: form.unitType,
        productImageUrl: form.productImageUrl?.trim() || undefined,
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
                {product.productImageUrl ? (
                  <img 
                    src={product.productImageUrl} 
                    alt={product.productName} 
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={styles.productEmoji}>
                    {categoryEmoji(product.category)}
                  </div>
                )}
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

              <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)' }}>
                <span>Unit Type: <strong>{product.unitType || 'pieces'}</strong></span>
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
                      {categoryEmoji(c.name.toLowerCase())} {t(c.name) || c.name}
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
