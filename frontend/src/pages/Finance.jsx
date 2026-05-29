import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate } from '../utils/api';
import styles from './Finance.module.css';
import { 
  DollarSign, SlidersHorizontal, Search, X, Plus, Trash2, 
  ArrowUpRight, ArrowDownRight, Scale, Calendar, HelpCircle,
  Briefcase, Sparkles, RefreshCw
} from 'lucide-react';

const TRANSACTION_CATEGORIES = {
  income: [
    { value: 'sales', label: 'Automated Store Sales' },
    { value: 'investment', label: 'Owner Investment' },
    { value: 'loan_received', label: 'Business Loan Received' },
    { value: 'gifts', label: 'Grants & Gifts' },
    { value: 'other_income', label: 'Other Miscellaneous Income' }
  ],
  expense: [
    { value: 'replenishment', label: 'Automated Replenishment Cost' },
    { value: 'rent', label: 'Store / Office Rent' },
    { value: 'salary', label: 'Employee Salaries & Wages' },
    { value: 'utilities', label: 'Utilities (Electricity, Water, Web)' },
    { value: 'tax', label: 'Taxes & Licensing Fees' },
    { value: 'loan_repayment', label: 'Business Loan Repayment' },
    { value: 'other_expense', label: 'Other Miscellaneous Expense' }
  ]
};

export default function Finance() {
  const { t } = useTranslation();

  // Data States
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netCashFlow: 0 });
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(''); // '', 'income', 'expense', 'debit_waiting'
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Manual Transaction Modal State
  const [showModal, setShowModal] = useState(false);
  const [formType, setFormType] = useState('income'); // 'income' or 'expense'
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [savingTransaction, setSavingTransaction] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [filterType, filterCategory, search, dateFrom, dateTo, minAmount, maxAmount, sortBy, page, limit]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      let url = `/transactions?limit=${limit}&page=${page}&sortBy=${sortBy}`;
      if (filterType) url += `&type=${filterType}`;
      if (filterCategory) url += `&category=${filterCategory}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (minAmount) url += `&minAmount=${minAmount}`;
      if (maxAmount) url += `&maxAmount=${maxAmount}`;
      if (dateFrom) url += `&from=${encodeURIComponent(new Date(dateFrom).toISOString())}`;
      if (dateTo) {
        const toD = new Date(dateTo);
        toD.setHours(23, 59, 59, 999);
        url += `&to=${encodeURIComponent(toD.toISOString())}`;
      }

      const { data } = await api.get(url);
      setTransactions(data.transactions || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
      setSummary(data.summary || { totalIncome: 0, totalExpense: 0, netCashFlow: 0 });
    } catch (err) {
      toast.error('Failed to load financial records.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilterType('');
    setFilterCategory('');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('date_desc');
    setPage(1);
  };

  // Expand Form Categories dropdown options dynamically depending on toggle choice
  useEffect(() => {
    const list = TRANSACTION_CATEGORIES[formType];
    if (list && list.length > 0) {
      setFormCategory(list[0].value);
    }
  }, [formType]);

  const handleOpenAddModal = () => {
    setFormType('income');
    setFormAmount('');
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  // Submit manual transaction
  const handleSubmitManual = async (e) => {
    e.preventDefault();
    if (!formAmount || parseFloat(formAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!formCategory) {
      toast.error('Please select a category');
      return;
    }

    setSavingTransaction(true);
    try {
      const payload = {
        type: formType,
        amount: parseFloat(formAmount),
        category: formCategory,
        description: formDescription.trim() || `Manual ${formType} entry`,
        date: formDate ? new Date(formDate).toISOString() : new Date().toISOString()
      };

      await api.post('/transactions', payload);
      toast.success('Financial ledger transaction saved successfully.');
      setShowModal(false);
      await loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post financial entry.');
    } finally {
      setSavingTransaction(false);
    }
  };

  // Void manual transaction log
  const handleVoidTransaction = async (id, description) => {
    if (!window.confirm(`Are you sure you want to void this transaction entry: "${description}"?`)) return;

    try {
      await api.delete(`/transactions/${id}`);
      toast.success('Financial ledger record voided successfully.');
      await loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to void manual record.');
    }
  };

  // Mark credit transaction as paid
  const handleMarkAsPaid = async (id) => {
    if (!window.confirm('Are you sure you want to mark this credit sale as paid? This will convert the record to fully received operational cash income.')) return;

    try {
      await api.patch(`/transactions/${id}/pay`);
      toast.success('Outstanding credit payment recorded successfully.');
      await loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update credit payment.');
    }
  };

  // Filter client-side based on more granular inputs (amount boundaries & text search)
  const getFilteredTransactions = () => {
    return transactions;
  };

  const filteredItems = getFilteredTransactions();
  const isFiltersActive = search || filterType || filterCategory || dateFrom || dateTo || minAmount || maxAmount;

  return (
    <div className={styles.page}>
      
      {/* Page Header Row */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerTitle}>
            <Scale size={24} style={{ color: 'var(--green-primary)' }} />
            Financial Ledger Ledger
          </h1>
          <p className={styles.headerSubtitle}>
            Monitor cash inflows, operational outflow expenses, post manual debits/credits, and audit store performance.
          </p>
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={handleOpenAddModal}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} /> Record Transaction
        </button>
      </div>

      {/* KPI Stats Cards Panel */}
      <div className={styles.statsGrid}>
        
        {/* Metric Card 1: Total Credits / Income */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--green-primary)' }}>
            <ArrowUpRight size={22} />
          </div>
          <div>
            <p className={styles.statLabel}>Total Income (Credits)</p>
            <p className={styles.statValue} style={{ color: 'var(--green-primary)' }}>+{formatCurrency(summary.totalIncome)}</p>
          </div>
        </div>

        {/* Metric Card 2: Total Debits / Expenses */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <ArrowDownRight size={22} />
          </div>
          <div>
            <p className={styles.statLabel}>Total Expenses (Debits)</p>
            <p className={styles.statValue} style={{ color: '#ef4444' }}>-{formatCurrency(summary.totalExpense)}</p>
          </div>
        </div>

        {/* Metric Card 3: Net Cash Balance */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Scale size={22} />
          </div>
          <div>
            <p className={styles.statLabel}>Net Operational Balance</p>
            <p className={styles.statValue} style={summary.netCashFlow >= 0 ? { color: 'var(--green-primary)' } : { color: '#ef4444' }}>
              {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow)}
            </p>
          </div>
        </div>

        {/* Metric Card 4: Receivables / Debits Waiting for Payment */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Calendar size={22} />
          </div>
          <div>
            <p className={styles.statLabel}>Pending Credit Sales</p>
            <p className={styles.statValue} style={{ color: '#f59e0b' }}>{formatCurrency(summary.totalReceivables || 0)}</p>
          </div>
        </div>

      </div>

      {/* Detailed Filters Panel */}
      <div className={styles.filtersContainer}>
        <div className={styles.filtersMainRow}>
          
          {/* Text search on memo */}
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}><Search size={16} /></span>
            <input
              className={styles.searchInput}
              placeholder="Search memo description or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <select
            className={styles.filterSelect}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">All Types (debits & credits)</option>
            <option value="income">Income (+ Credit)</option>
            <option value="expense">Expenses (- Debit)</option>
            <option value="debit_waiting">Debits Waiting for Payment</option>
          </select>

          {/* Category Filter */}
          <select
            className={styles.filterSelect}
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="sales">Sales Revenue</option>
            <option value="replenishment">Stock Replenishment</option>
            <option value="rent">Rent Costs</option>
            <option value="salary">Employee Wages</option>
            <option value="utilities">Utilities Bills</option>
            <option value="tax">Taxes / Fees</option>
            <option value="loans">Business Loans</option>
            <option value="other">Other Misc</option>
          </select>

          {/* Sort By */}
          <select
            className={styles.filterSelect}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="date_desc">Newest Recorded</option>
            <option value="date_asc">Oldest Recorded</option>
            <option value="amount_desc">Amount: High to Low</option>
            <option value="amount_asc">Amount: Low to High</option>
          </select>

          {/* Advanced expander */}
          <button
            type="button"
            className={`btn btn-secondary ${showAdvanced ? 'btn-active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px' }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <SlidersHorizontal size={15} />
            Filters
          </button>

          {/* Clear Filters */}
          {isFiltersActive && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleClearFilters}
            >
              <X size={15} /> Clear
            </button>
          )}

          <button 
            className="btn btn-secondary" 
            onClick={loadTransactions}
            title="Refresh Data"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>

        </div>

        {/* Expandable Advanced Date / Amount Ranges */}
        {showAdvanced && (
          <div className={styles.advancedFiltersGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Date From</label>
              <input
                type="date"
                className={styles.filterInput}
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Date To</label>
              <input
                type="date"
                className={styles.filterInput}
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Min Amount (RWF)</label>
              <input
                type="number"
                min="0"
                placeholder="Minimum amount..."
                className={styles.filterInput}
                value={minAmount}
                onChange={e => setMinAmount(e.target.value)}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Max Amount (RWF)</label>
              <input
                type="number"
                min="0"
                placeholder="Maximum amount..."
                className={styles.filterInput}
                value={maxAmount}
                onChange={e => setMaxAmount(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Double-Entry Ledger List Panel */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : filteredItems.length === 0 ? (
        
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <DollarSign size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {isFiltersActive ? 'No Matching Financial Records' : 'No Transactions Found'}
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto 20px auto', fontSize: 14 }}>
            {isFiltersActive 
              ? 'No ledger transactions match your search filters or range parameters.'
              : 'There are currently no transactions recorded. Sales income and approved replenishment expenses are synced automatically.'}
          </p>
          {isFiltersActive && (
            <button className="btn btn-secondary" onClick={handleClearFilters}>
              Clear Filters
            </button>
          )}
        </div>

      ) : (
        
        <div className={styles.ledgerContainer}>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.responsiveTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Memo Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right', width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isIncome = item.type === 'income';
                  
                  return (
                    <tr key={item._id}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(item.date || item.createdAt)}
                      </td>
                      <td>
                        <span className={styles.categoryBadge}>
                          {item.category || 'other'}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.sourceBadge} ${
                          item.source === 'sale' ? styles.sourceSale :
                          item.source === 'order' ? styles.sourceOrder :
                          styles.sourceManual
                        }`}>
                          {item.source}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {item.description}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          color: item.type === 'income' ? 'var(--green-primary)' : item.type === 'expense' ? '#ef4444' : '#f59e0b'
                        }}>
                          {item.type === 'income' ? '+' : item.type === 'expense' ? '-' : '⌛ '}{formatCurrency(item.amount || 0)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {item.type === 'debit_waiting' ? (
                          <button
                            className="btn btn-primary btn-xs"
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              background: 'var(--green-primary)',
                              border: 'none',
                              color: 'white',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                            onClick={() => handleMarkAsPaid(item._id)}
                            title="Mark this credit sale as paid"
                          >
                            Mark Paid
                          </button>
                        ) : item.source === 'manual' ? (
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: 'var(--red)' }}
                            onClick={() => handleVoidTransaction(item._id, item.description)}
                            title="Void manual entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 11, cursor: 'default' }} title="Automated system transaction cannot be modified.">
                            System
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination UI Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-card)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total entries)
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => {
                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <div key={p} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {showEllipsis && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>...</span>}
                        <button
                          className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setPage(p)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            minWidth: '32px',
                            justifyContent: 'center',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })
                }
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      )}

      {/* Manual Credits/Debits Post Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalWindow} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Record Financial Transaction</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitManual} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Type Toggle Selector */}
              <div className="form-group">
                <label className="form-label">Flow Direction</label>
                <div className={styles.typeSelector}>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${formType === 'income' ? styles.typeBtnActiveIncome : ''}`}
                    onClick={() => setFormType('income')}
                  >
                    <ArrowUpRight size={16} />
                    Income (+ Credit)
                  </button>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${formType === 'expense' ? styles.typeBtnActiveExpense : ''}`}
                    onClick={() => setFormType('expense')}
                  >
                    <ArrowDownRight size={16} />
                    Expense (- Debit)
                  </button>
                </div>
              </div>

              {/* Amount Row */}
              <div className="form-group">
                <label className="form-label">Transaction Amount (RWF)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>
                    RWF
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    className="form-input"
                    style={{ paddingLeft: 56 }}
                    placeholder="Enter total amount..."
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Category selector depending on type selection */}
              <div className="form-group">
                <label className="form-label">Accounting Category</label>
                <select
                  className={styles.filterSelect}
                  style={{ width: '100%', minWidth: '100%' }}
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  required
                >
                  {TRANSACTION_CATEGORIES[formType]?.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Date Input */}
              <div className="form-group">
                <label className="form-label">Transaction Date (Optional)</label>
                <input
                  type="date"
                  className="form-input"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                />
              </div>

              {/* Description memo */}
              <div className="form-group">
                <label className="form-label">Memo Description</label>
                <textarea
                  className={styles.textareaField}
                  placeholder="Explain transaction details (e.g. Supplier name, rent period, utility bill month...)"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-full ${formType === 'income' ? 'btn-primary' : 'btn-danger'}`}
                  disabled={savingTransaction || !formAmount}
                  style={formType === 'income' ? {} : { background: '#ef4444', border: 'none' }}
                >
                  {savingTransaction ? 'Posting...' : 'Record Transaction'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
