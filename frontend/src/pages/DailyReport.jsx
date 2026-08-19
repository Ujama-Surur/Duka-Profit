import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate } from '../utils/api';
import styles from './DailyReport.module.css';
import {
  ClipboardList, Banknote, Smartphone, Receipt, Plus, Trash2,
  Save, Calendar, Coins, Calculator, RefreshCw, History
} from 'lucide-react';

const emptyCash = () => ({
  notes5000: '',
  notes2000: '',
  notes1000: '',
  notes500: '',
  coins: '',
});

const NOTE_FIELDS = [
  { key: 'notes5000', label: '5,000 FRW', value: 5000 },
  { key: 'notes2000', label: '2,000 FRW', value: 2000 },
  { key: 'notes1000', label: '1,000 FRW', value: 1000 },
  { key: 'notes500', label: '500 FRW', value: 500 },
];

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function todayISO() {
  return toLocalISO(new Date());
}

function toLocalISO(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return todayISO();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DailyReport() {
  const { t } = useTranslation();

  const [reportDate, setReportDate] = useState(todayISO());
  const [openingAmount, setOpeningAmount] = useState('');
  const [cash, setCash] = useState(emptyCash());
  const [momoAmounts, setMomoAmounts] = useState(['']);
  const [expenses, setExpenses] = useState([{ reason: '', amount: '' }]);
  const [notes, setNotes] = useState('');
  const [existingId, setExistingId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const currentCash = useMemo(() => {
    return (
      toNum(cash.notes5000) * 5000 +
      toNum(cash.notes2000) * 2000 +
      toNum(cash.notes1000) * 1000 +
      toNum(cash.notes500) * 500 +
      toNum(cash.coins)
    );
  }, [cash]);

  const momoTotal = useMemo(
    () => momoAmounts.reduce((sum, a) => sum + toNum(a), 0),
    [momoAmounts]
  );

  const expensesTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + toNum(e.amount), 0),
    [expenses]
  );

  // current cash + momo + expenses - opening
  const dayTotal = currentCash + momoTotal + expensesTotal - toNum(openingAmount);

  useEffect(() => {
    loadForDate(reportDate);
  }, [reportDate]);

  useEffect(() => {
    loadHistory();
  }, []);

  const resetForm = () => {
    setOpeningAmount('');
    setCash(emptyCash());
    setMomoAmounts(['']);
    setExpenses([{ reason: '', amount: '' }]);
    setNotes('');
    setExistingId(null);
  };

  const applyReport = (report) => {
    if (!report) {
      resetForm();
      return;
    }
    setExistingId(report._id);
    setOpeningAmount(String(report.openingAmount ?? ''));
    setCash({
      notes5000: String(report.cash?.notes5000 ?? ''),
      notes2000: String(report.cash?.notes2000 ?? ''),
      notes1000: String(report.cash?.notes1000 ?? ''),
      notes500: String(report.cash?.notes500 ?? ''),
      coins: String(report.cash?.coins ?? ''),
    });
    setMomoAmounts(
      report.momoAmounts?.length ? report.momoAmounts.map(String) : ['']
    );
    setExpenses(
      report.expenses?.length
        ? report.expenses.map((e) => ({ reason: e.reason || '', amount: String(e.amount ?? '') }))
        : [{ reason: '', amount: '' }]
    );
    setNotes(report.notes || '');
  };

  const loadForDate = async (date) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/daily-reports/by-date?date=${date}`);
      applyReport(data.report);
    } catch {
      resetForm();
      toast.error(t('dailyCashLoadError') || 'Failed to load daily report');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get('/daily-reports?limit=14');
      setHistory(data.reports || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCashChange = (key, value) => {
    setCash((prev) => ({ ...prev, [key]: value }));
  };

  const handleMomoChange = (index, value) => {
    setMomoAmounts((prev) => prev.map((a, i) => (i === index ? value : a)));
  };

  const addMomoRow = () => setMomoAmounts((prev) => [...prev, '']);

  const removeMomoRow = (index) => {
    setMomoAmounts((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)));
  };

  const handleExpenseChange = (index, field, value) => {
    setExpenses((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  };

  const addExpenseRow = () =>
    setExpenses((prev) => [...prev, { reason: '', amount: '' }]);

  const removeExpenseRow = (index) => {
    setExpenses((prev) =>
      prev.length <= 1 ? [{ reason: '', amount: '' }] : prev.filter((_, i) => i !== index)
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (toNum(openingAmount) < 0) {
      toast.error('Opening amount cannot be negative');
      return;
    }

    const cleanMomo = momoAmounts
      .map((a) => toNum(a))
      .filter((a) => a > 0);

    const cleanExpenses = expenses
      .filter((ex) => ex.reason.trim() && toNum(ex.amount) > 0)
      .map((ex) => ({ reason: ex.reason.trim(), amount: toNum(ex.amount) }));

    const incompleteExpense = expenses.some(
      (ex) => (ex.reason.trim() && !toNum(ex.amount)) || (!ex.reason.trim() && toNum(ex.amount))
    );
    if (incompleteExpense) {
      toast.error('Each expense needs both a reason and an amount');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date: reportDate,
        openingAmount: toNum(openingAmount),
        cash: {
          notes5000: Math.floor(toNum(cash.notes5000)),
          notes2000: Math.floor(toNum(cash.notes2000)),
          notes1000: Math.floor(toNum(cash.notes1000)),
          notes500: Math.floor(toNum(cash.notes500)),
          coins: toNum(cash.coins),
        },
        momoAmounts: cleanMomo,
        expenses: cleanExpenses,
        notes: notes.trim(),
      };

      const { data } = await api.post('/daily-reports', payload);
      applyReport(data.report);
      toast.success(existingId ? 'Daily report updated' : 'Daily report saved');
      await loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save daily report');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingId) return;
    if (!window.confirm('Delete this daily report?')) return;
    try {
      await api.delete(`/daily-reports/${existingId}`);
      toast.success('Daily report deleted');
      resetForm();
      await loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete report');
    }
  };

  const openHistoryItem = (report) => {
    setReportDate(toLocalISO(report.date));
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerTitle}>
            <ClipboardList size={24} style={{ color: 'var(--green-primary)' }} />
            {t('dailyCashReport') || 'Daily Cash Report'}
          </h1>
          <p className={styles.headerSubtitle}>
            Record opening cash, count notes & coins, MoMo receipts, and expenses.
            Total = cash + MoMo + expenses − opening.
          </p>
        </div>
        <div className={styles.datePicker}>
          <Calendar size={18} />
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>
      </div>

      {/* Live totals */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--green-50)', color: 'var(--green-primary)' }}>
            <Banknote size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>Current Cash</div>
            <div className={styles.statValue}>{formatCurrency(currentCash)}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#EEF2FF', color: '#4F46E5' }}>
            <Smartphone size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>MoMo Total</div>
            <div className={styles.statValue}>{formatCurrency(momoTotal)}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#FEF2F2', color: '#DC2626' }}>
            <Receipt size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>Expenses</div>
            <div className={styles.statValue}>{formatCurrency(expensesTotal)}</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
          <div className={styles.statIcon} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            <Calculator size={22} />
          </div>
          <div>
            <div className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.85)' }}>Day Total</div>
            <div className={styles.statValue} style={{ color: '#fff' }}>{formatCurrency(dayTotal)}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>
          <div className="spinner" />
          <p>{t('loading') || 'Loading...'}</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className={styles.formLayout}>
          <div className={styles.mainCol}>
            {/* Opening */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Coins size={18} /> Opening Amount
              </h2>
              <label className={styles.label}>Opening cash (FRW)</label>
              <input
                type="number"
                min="0"
                step="1"
                className={styles.input}
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0"
              />
            </section>

            {/* Cash count */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Banknote size={18} /> Current Cash
              </h2>
              <div className={styles.notesGrid}>
                {NOTE_FIELDS.map((f) => (
                  <div key={f.key} className={styles.noteField}>
                    <label className={styles.label}>{f.label} notes</label>
                    <div className={styles.noteRow}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className={styles.input}
                        value={cash[f.key]}
                        onChange={(e) => handleCashChange(f.key, e.target.value)}
                        placeholder="0"
                      />
                      <span className={styles.noteSubtotal}>
                        = {formatCurrency(toNum(cash[f.key]) * f.value)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className={styles.noteField}>
                  <label className={styles.label}>Total coins (FRW)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={styles.input}
                    value={cash.coins}
                    onChange={(e) => handleCashChange('coins', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className={styles.sectionFooter}>
                Cash total: <strong>{formatCurrency(currentCash)}</strong>
              </div>
            </section>

            {/* MoMo */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <Smartphone size={18} /> MoMo Amounts
                </h2>
                <button type="button" className={styles.addBtn} onClick={addMomoRow}>
                  <Plus size={16} /> Add
                </button>
              </div>
              <p className={styles.hint}>Enter each MoMo receipt (e.g. 1000, 8000, 100…) — they are summed automatically.</p>
              <div className={styles.listRows}>
                {momoAmounts.map((amount, i) => (
                  <div key={i} className={styles.listRow}>
                    <span className={styles.rowIndex}>{i + 1}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={styles.input}
                      value={amount}
                      onChange={(e) => handleMomoChange(i, e.target.value)}
                      placeholder="Amount FRW"
                    />
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => removeMomoRow(i)}
                      aria-label="Remove MoMo entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className={styles.sectionFooter}>
                MoMo total: <strong>{formatCurrency(momoTotal)}</strong>
              </div>
            </section>

            {/* Expenses */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <Receipt size={18} /> Expenses
                </h2>
                <button type="button" className={styles.addBtn} onClick={addExpenseRow}>
                  <Plus size={16} /> Add
                </button>
              </div>
              <div className={styles.listRows}>
                {expenses.map((ex, i) => (
                  <div key={i} className={styles.expenseRow}>
                    <input
                      type="text"
                      className={styles.input}
                      value={ex.reason}
                      onChange={(e) => handleExpenseChange(i, 'reason', e.target.value)}
                      placeholder="Reason"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={styles.input}
                      value={ex.amount}
                      onChange={(e) => handleExpenseChange(i, 'amount', e.target.value)}
                      placeholder="Amount"
                    />
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => removeExpenseRow(i)}
                      aria-label="Remove expense"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className={styles.sectionFooter}>
                Expenses total: <strong>{formatCurrency(expensesTotal)}</strong>
              </div>
            </section>

            {/* Notes */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Notes (optional)</h2>
              <textarea
                className={styles.textarea}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra details for this day…"
              />
            </section>

            {/* Formula summary */}
            <section className={styles.formulaCard}>
              <div className={styles.formulaLine}>
                <span>Current cash</span>
                <span>{formatCurrency(currentCash)}</span>
              </div>
              <div className={styles.formulaLine}>
                <span>+ MoMo</span>
                <span>{formatCurrency(momoTotal)}</span>
              </div>
              <div className={styles.formulaLine}>
                <span>+ Expenses</span>
                <span>{formatCurrency(expensesTotal)}</span>
              </div>
              <div className={styles.formulaLine}>
                <span>− Opening</span>
                <span>{formatCurrency(toNum(openingAmount))}</span>
              </div>
              <div className={`${styles.formulaLine} ${styles.formulaTotal}`}>
                <span>Day total</span>
                <span>{formatCurrency(dayTotal)}</span>
              </div>
            </section>

            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={18} />
                {saving ? 'Saving…' : existingId ? 'Update Report' : 'Save Report'}
              </button>
              {existingId && (
                <button type="button" className="btn btn-outline" onClick={handleDelete}>
                  <Trash2 size={18} /> Delete
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => loadForDate(reportDate)}
              >
                <RefreshCw size={18} /> Reset
              </button>
            </div>
          </div>

          {/* History sidebar */}
          <aside className={styles.historyCol}>
            <div className={styles.historyHeader}>
              <History size={18} />
              <h3>Recent reports</h3>
            </div>
            {loadingHistory ? (
              <p className={styles.muted}>Loading…</p>
            ) : history.length === 0 ? (
              <p className={styles.muted}>No saved reports yet.</p>
            ) : (
              <ul className={styles.historyList}>
                {history.map((r) => {
                  const iso = toLocalISO(r.date);
                  const active = iso === reportDate;
                  return (
                    <li key={r._id}>
                      <button
                        type="button"
                        className={`${styles.historyItem} ${active ? styles.historyItemActive : ''}`}
                        onClick={() => openHistoryItem(r)}
                      >
                        <span className={styles.historyDate}>{formatDate(r.date)}</span>
                        <span className={styles.historyTotal}>{formatCurrency(r.dayTotal)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </form>
      )}
    </div>
  );
}
