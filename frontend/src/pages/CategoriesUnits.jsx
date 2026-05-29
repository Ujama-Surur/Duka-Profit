import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Layers, Plus, Pencil, Trash2, X, Check, Eye, Tag, Ruler } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { name: 'Food & Drinks', description: 'Groceries, beverages, and snacks' },
  { name: 'Electronics', description: 'Gadgets, appliances, and accessories' },
  { name: 'Clothing', description: 'Apparel, shoes, and fabrics' },
  { name: 'Household', description: 'Cleaning items, kitchenware, and furniture' },
  { name: 'Other', description: 'Miscellaneous products' }
];

const DEFAULT_UNITS = [
  { name: 'Pieces', abbreviation: 'pcs' },
  { name: 'Box', abbreviation: 'box' },
  { name: 'Kilogram', abbreviation: 'kg' },
  { name: 'Whole Sack', abbreviation: 'sack' },
  { name: 'Liter', abbreviation: 'L' },
  { name: 'Meter', abbreviation: 'm' },
  { name: 'Pack', abbreviation: 'pack' }
];

export default function CategoriesUnits() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [unitTypes, setUnitTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals / Form state
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catsRes, unitsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/unit-types')
      ]);
      setCategories(catsRes.data);
      setUnitTypes(unitsRes.data);
    } catch (err) {
      toast.error('Failed to load categories or unit types');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditItem(null);
    setName('');
    setDescription('');
    setAbbreviation('');
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setName(item.name);
    if (activeTab === 'categories') {
      setDescription(item.description || '');
    } else {
      setAbbreviation(item.abbreviation || '');
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      if (activeTab === 'categories') {
        const payload = { name: name.trim(), description: description.trim() };
        if (editItem) {
          const { data } = await api.put(`/categories/${editItem._id}`, payload);
          setCategories(prev => prev.map(c => c._id === editItem._id ? data : c));
          toast.success('Category updated successfully');
        } else {
          const { data } = await api.post('/categories', payload);
          setCategories(prev => [...prev, data]);
          toast.success('Category added successfully');
        }
      } else {
        const payload = { name: name.trim(), abbreviation: abbreviation.trim() };
        if (editItem) {
          const { data } = await api.put(`/unit-types/${editItem._id}`, payload);
          setUnitTypes(prev => prev.map(u => u._id === editItem._id ? data : u));
          toast.success('Unit type updated successfully');
        } else {
          const { data } = await api.post('/unit-types', payload);
          setUnitTypes(prev => [...prev, data]);
          toast.success('Unit type added successfully');
        }
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      if (activeTab === 'categories') {
        await api.delete(`/categories/${id}`);
        setCategories(prev => prev.filter(c => c._id !== id));
        toast.success('Category deleted');
      } else {
        await api.delete(`/unit-types/${id}`);
        setUnitTypes(prev => prev.filter(u => u._id !== id));
        toast.success('Unit type deleted');
      }
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const handleSeedDefaults = async () => {
    setLoading(true);
    try {
      if (activeTab === 'categories') {
        let addedCount = 0;
        for (const cat of DEFAULT_CATEGORIES) {
          const exists = categories.some(c => c.name.toLowerCase() === cat.name.toLowerCase());
          if (!exists) {
            await api.post('/categories', cat);
            addedCount++;
          }
        }
        toast.success(`Seeded ${addedCount} default categories`);
      } else {
        let addedCount = 0;
        for (const unit of DEFAULT_UNITS) {
          const exists = unitTypes.some(u => u.name.toLowerCase() === unit.name.toLowerCase());
          if (!exists) {
            await api.post('/unit-types', unit);
            addedCount++;
          }
        }
        toast.success(`Seeded ${addedCount} default unit types`);
      }
      await loadData();
    } catch (err) {
      toast.error('Failed to seed defaults');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={24} /> Categories & Units
            </h1>
            <p className="page-subtitle">Configure custom categories and measurement units for your inventory</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={handleSeedDefaults}>
              Seed Default {activeTab === 'categories' ? 'Categories' : 'Units'}
            </button>
            <button className="btn btn-primary" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={18} /> Add {activeTab === 'categories' ? 'Category' : 'Unit Type'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div style={{
        display: 'flex',
        gap: '8px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '6px',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setActiveTab('categories')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeTab === 'categories' ? 'var(--green-primary)' : 'transparent',
            color: activeTab === 'categories' ? 'white' : 'var(--text-muted)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <Tag size={16} /> Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('unit-types')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeTab === 'unit-types' ? 'var(--green-primary)' : 'transparent',
            color: activeTab === 'unit-types' ? 'white' : 'var(--text-muted)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <Ruler size={16} /> Unit Types ({unitTypes.length})
        </button>
      </div>

      {/* Data display */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : activeTab === 'categories' ? (
        categories.length === 0 ? (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Tag size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Categories Yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Create custom product categories or seed defaults to start.</p>
            <button className="btn btn-primary" onClick={handleSeedDefaults}>Seed Defaults</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {categories.map(cat => (
              <div key={cat._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{cat.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', minHeight: 40 }}>{cat.description || 'No description provided.'}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEdit(cat)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(cat._id)} style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        unitTypes.length === 0 ? (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Ruler size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Unit Types Yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Define your custom measurements (e.g. Kg, Box, Bottle) or seed defaults.</p>
            <button className="btn btn-primary" onClick={handleSeedDefaults}>Seed Defaults</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {unitTypes.map(unit => (
              <div key={unit._id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                    {unit.name}
                  </h3>
                  {unit.abbreviation && (
                    <span className="badge badge-gray" style={{ marginTop: 4, display: 'inline-block' }}>
                      {unit.abbreviation}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleOpenEdit(unit)} title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(unit._id)} style={{ color: 'var(--red)' }} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Edit/Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>
                {editItem ? 'Edit' : 'Add'} {activeTab === 'categories' ? 'Category' : 'Unit Type'}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={activeTab === 'categories' ? 'e.g. Beverages' : 'e.g. Kilogram'}
                  required
                />
              </div>

              {activeTab === 'categories' ? (
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe products in this category..."
                    style={{ minHeight: 80, resize: 'vertical' }}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Abbreviation (Optional)</label>
                  <input
                    className="form-input"
                    value={abbreviation}
                    onChange={e => setAbbreviation(e.target.value)}
                    placeholder="e.g. kg, L, pcs"
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
