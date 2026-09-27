import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate, offlineData } from '../utils/api';
import styles from './Reports.module.css';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, BarChart3, FileText, Download, Trophy, CreditCard, Banknote, Smartphone, Package, Ruler, ClipboardList, FileSpreadsheet, Building, User, Info, AlertTriangle } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{background:'white',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'10px 14px',boxShadow:'var(--shadow-md)'}}>
        <p style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,color:'var(--text-muted)',marginBottom:4}}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{fontFamily:'var(--font-display)',fontWeight:800,color:p.color,fontSize:14}}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [reportType, setReportType] = useState('sales'); // 'sales' or 'currency'
  const [currencyData, setCurrencyData] = useState(null);
  const [currencyLoading, setCurrencyLoading] = useState(false);

  useEffect(() => { 
    if (reportType === 'sales') {
      loadReport(); 
    } else {
      loadCurrencyReport();
    }
  }, [period, reportType]);

  const loadCurrencyReport = async () => {
    setCurrencyLoading(true);
    try {
      const { data: res } = await api.get('/currency/impact-report');
      setCurrencyData(res);
      await offlineData.set('currency_impact_report', res);
    } catch {
      const cached = await offlineData.get('currency_impact_report');
      if (cached) setCurrencyData(cached);
    } finally {
      setCurrencyLoading(false);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data: report } = await api.get(`/reports?period=${period}`);
      setData(report);
      await offlineData.set(`report_${period}`, report);
    } catch {
      const cached = await offlineData.get(`report_${period}`);
      if (cached) setData(cached);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      // Header
      doc.setFillColor(22, 163, 74);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Duka Profit Report', 14, 22);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

      // Summary stats
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, 48);

      const summaryData = [
        ['Total Revenue', formatCurrency(data?.summary?.totalRevenue || 0)],
        ['Total Cost', formatCurrency(data?.summary?.totalCost || 0)],
        ['Total Profit', formatCurrency(data?.summary?.totalProfit || 0)],
        ['Total Sales', String(data?.summary?.salesCount || 0)],
        ['Profit Margin', `${data?.summary?.profitMargin || 0}%`],
      ];

      autoTable(doc, {
        startY: 52,
        head: [['Metric', 'Value']],
        body: summaryData,
        headStyles: { fillColor: [22, 163, 74] },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        margin: { left: 14, right: 14 },
      });

      // Sales table
      if (data?.sales?.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Sales Details', 14, doc.lastAutoTable.finalY + 14);

        const salesRows = data.sales.map(s => [
          formatDate(s.createdAt),
          s.product?.productName || 'Unknown',
          String(s.quantity),
          formatCurrency(s.quantity * (s.product?.sellingPrice || 0)),
          formatCurrency(s.profit),
        ]);

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 18,
          head: [['Date', 'Product', 'Qty', 'Revenue', 'Profit']],
          body: salesRows,
          headStyles: { fillColor: [22, 163, 74] },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Duka Profit — Page ${i} of ${pageCount}`, 14, 285);
        doc.text('www.dukaprofit.rw', 160, 285);
      }

      doc.save(`duka-report-${period}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exported!');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = () => {
    if (!data?.sales?.length) {
      toast.error('No data to export');
      return;
    }
    const headers = ['Date', 'Product', 'Category', 'Quantity', 'Cost Price', 'Selling Price', 'Revenue', 'Profit'];
    const rows = data.sales.map(s => [
      formatDate(s.createdAt),
      s.product?.productName || 'Unknown',
      s.product?.category || 'other',
      s.quantity,
      s.product?.costPrice || 0,
      s.product?.sellingPrice || 0,
      s.quantity * (s.product?.sellingPrice || 0),
      s.profit,
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duka-report-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  const exportCurrencyPDF = async () => {
    if (!currencyData) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      doc.setFillColor(22, 163, 74);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Duka Profit — Currency Impact & Valuation', 14, 22);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Active Rate: 1 ${currencyData.baseCurrency} = ${currencyData.activeRate ? Number(currencyData.activeRate).toLocaleString() : 'N/A'} ${currencyData.sellingCurrency}`, 14, 30);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Valuation Summary', 14, 46);

      const summaryData = [
        ['Base Currency / Selling Currency', `${currencyData.baseCurrency} / ${currencyData.sellingCurrency}`],
        ['Market Exchange Rate', `1 ${currencyData.baseCurrency} = ${Number(currencyData.activeRate || 0).toLocaleString()} ${currencyData.sellingCurrency}`],
        ['Historical Inventory Cost Valuation', formatCurrency(currencyData.valuation?.historicalCostValue || 0, currencyData.sellingCurrency)],
        ['Current Replacement Inventory Valuation', formatCurrency(currencyData.valuation?.replacementCostValue || 0, currencyData.sellingCurrency)],
        ['Inventory Valuation Gap (Restock Growth)', `+${formatCurrency(currencyData.valuation?.valueGap || 0, currencyData.sellingCurrency)}`],
        ['Products Below Replacement Cost', String(currencyData.belowReplacementCount || 0)],
        ['Total Replacement Deficit (Sales Shortfall)', `-${formatCurrency(currencyData.valuation?.replacementDeficit || 0, currencyData.sellingCurrency)}`],
      ];

      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Valuation']],
        body: summaryData,
        headStyles: { fillColor: [22, 163, 74] },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        margin: { left: 14, right: 14 },
      });

      if (currencyData.belowReplacementProducts?.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Products Below Replacement Cost', 14, doc.lastAutoTable.finalY + 14);

        const rows = currencyData.belowReplacementProducts.map(p => [
          p.productName,
          String(p.stock),
          formatCurrency(p.costPrice, currencyData.sellingCurrency),
          formatCurrency(p.sellingPrice, currencyData.sellingCurrency),
          formatCurrency(p.replacementCost, currencyData.sellingCurrency),
          `-${formatCurrency(p.gapPerUnit, currencyData.sellingCurrency)}`,
          `-${formatCurrency(p.totalGap, currencyData.sellingCurrency)}`,
          formatCurrency(p.suggestedSellingPrice || 0, currencyData.sellingCurrency),
        ]);

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 18,
          head: [['Product', 'Stock', 'Hist. Cost', 'Sell Price', 'Replacement', 'Gap/Unit', 'Total Deficit', 'Suggested']],
          body: rows,
          headStyles: { fillColor: [220, 38, 38] },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8 },
        });
      }

      doc.save(`duka-currency-impact-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Currency Impact PDF exported!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportCurrencyCSV = () => {
    if (!currencyData?.belowReplacementProducts?.length) {
      toast('No products below replacement cost to export.', { icon: <Info size={16} /> });
      return;
    }
    const headers = ['Product', 'Stock', 'Historical Cost', 'Current Selling Price', 'Replacement Cost', 'Gap Per Unit', 'Total Deficit', 'Suggested Price'];
    const rows = currencyData.belowReplacementProducts.map(p => [
      p.productName,
      p.stock,
      p.costPrice,
      p.sellingPrice,
      p.replacementCost,
      p.gapPerUnit,
      p.totalGap,
      p.suggestedSellingPrice || 0,
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duka-currency-deficit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Currency Impact CSV exported!');
  };

  const exportPriceAuditCSV = async () => {
    try {
      const { data: res } = await api.get('/currency/price-history?limit=200');
      if (!res?.items?.length) {
        toast('No price change audit logs found yet.', { icon: <Info size={16} /> });
        return;
      }
      const headers = ['Date', 'Product', 'Old Price', 'New Price', 'Historical Cost', 'Replacement Cost', 'Exchange Rate', 'Reason', 'User'];
      const rows = res.items.map(i => [
        formatDate(i.changedAt),
        i.productName,
        i.previousSellingPrice,
        i.newSellingPrice,
        i.costPrice || 0,
        i.replacementCost || 0,
        i.exchangeRate || 1,
        i.reason,
        i.changedBy?.name || 'User',
      ]);
      const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duka-price-change-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Price Audit Log exported!');
    } catch (err) {
      toast.error('Failed to export audit history');
    }
  };

  const PERIODS = [
    { key: 'day', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
  ];



  return (
    <div className={styles.page}>
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 className="page-title" style={{display:'flex',alignItems:'center',gap:8}}><TrendingUp size={24} /> {t('reports')}</h1>
            <p className="page-subtitle">Analyze business performance, cash flow, and replacement inventory valuation</p>
          </div>

          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {reportType === 'sales' ? (
              <>
                <button className="btn btn-outline btn-sm" onClick={exportCSV} disabled={exporting}>
                  <FileSpreadsheet size={16} style={{marginRight:6}} /> {t('exportCSV')}
                </button>
                <button className="btn btn-primary btn-sm" onClick={exportPDF} disabled={exporting}>
                  {exporting ? '...' : <><FileText size={16} style={{marginRight:6}} /> {t('exportPDF')}</>}
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-outline btn-sm" onClick={exportPriceAuditCSV} disabled={exporting} title="Export audit trail of all price changes">
                  <FileSpreadsheet size={16} style={{marginRight:6}} /> Price Audit CSV
                </button>
                <button className="btn btn-outline btn-sm" onClick={exportCurrencyCSV} disabled={exporting}>
                  <FileSpreadsheet size={16} style={{marginRight:6}} /> Deficit CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={exportCurrencyPDF} disabled={exporting}>
                  {exporting ? '...' : <><FileText size={16} style={{marginRight:6}} /> Currency PDF</>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Report Category Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <button
          type="button"
          className={`btn btn-sm ${reportType === 'sales' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setReportType('sales')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <BarChart3 size={16} />
          <span>Sales & Cash Flow</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${reportType === 'currency' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setReportType('currency')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <DollarSign size={16} />
          <span>Currency Impact & Valuation</span>
        </button>
      </div>

      {reportType === 'currency' ? (
        /* Currency Impact & Valuation View */
        currencyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : !currencyData ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            Failed to load currency impact data. Please ensure Currency Protection is enabled in Settings.
          </div>
        ) : (
          <div>
            {/* Valuation Metric Cards */}
            <div className={styles.summaryGrid} style={{ marginBottom: '24px' }}>
              <SummaryCard
                icon={<DollarSign size={22} />}
                label="Exchange Rate"
                value={`1 ${currencyData.baseCurrency} = ${currencyData.activeRate ? Number(currencyData.activeRate).toLocaleString() : '—'} ${currencyData.sellingCurrency}`}
                color="blue"
              />
              <SummaryCard
                icon={<TrendingDown size={22} />}
                label="Historical Valuation (Cost)"
                value={formatCurrency(currencyData.valuation?.historicalCostValue || 0, currencyData.sellingCurrency)}
                color="yellow"
              />
              <SummaryCard
                icon={<TrendingUp size={22} />}
                label="Replacement Valuation"
                value={formatCurrency(currencyData.valuation?.replacementCostValue || 0, currencyData.sellingCurrency)}
                color="green"
                highlight
              />
              <SummaryCard
                icon={<BarChart3 size={22} />}
                label="Valuation Growth Gap"
                value={`+${formatCurrency(currencyData.valuation?.valueGap || 0, currencyData.sellingCurrency)}`}
                color="green"
              />
              <SummaryCard
                icon={<AlertTriangle size={22} />}
                label="Below Replacement"
                value={currencyData.belowReplacementCount || 0}
                suffix="products"
                color={currencyData.belowReplacementCount > 0 ? "red" : "green"}
              />
            </div>

            {/* Replacement Deficit Banner */}
            {currencyData.valuation?.replacementDeficit > 0 && (
              <div
                className="card"
                style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  padding: '16px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                    ⚠️ Potential Replacement Deficit: -{formatCurrency(currencyData.valuation?.replacementDeficit, currencyData.sellingCurrency)}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#B91C1C', margin: '4px 0 0' }}>
                    If current inventory is sold at today's selling prices without adjustment, you will face this total cash shortfall when restocking at current exchange rates.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => window.location.hash = '#/pricing/review'}
                  style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}
                >
                  Review Price Changes
                </button>
              </div>
            )}

            {/* Below Replacement Products Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Products Below Replacement Cost ({currencyData.belowReplacementProducts?.length || 0})
                </h3>
              </div>

              {(!currencyData.belowReplacementProducts || currencyData.belowReplacementProducts.length === 0) ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  ✅ Excellent! No products are currently priced below replacement cost.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Product</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Units in Stock</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Historical Cost</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Selling Price</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Replacement Cost</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Deficit / Unit</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Total Deficit</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Suggested Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currencyData.belowReplacementProducts.map((p, idx) => (
                        <tr key={p._id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700 }}>{p.productName}</td>
                          <td style={{ padding: '12px 16px' }}>{p.stock}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{formatCurrency(p.costPrice, currencyData.sellingCurrency)}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{formatCurrency(p.sellingPrice, currencyData.sellingCurrency)}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 800, color: '#DC2626', fontFamily: 'var(--font-mono)' }}>
                            {formatCurrency(p.replacementCost, currencyData.sellingCurrency)}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#DC2626', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            -{formatCurrency(p.gapPerUnit, currencyData.sellingCurrency)}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#DC2626', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                            -{formatCurrency(p.totalGap, currencyData.sellingCurrency)}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--green-primary)', fontFamily: 'var(--font-mono)' }}>
                            {formatCurrency(p.suggestedSellingPrice || 0, currencyData.sellingCurrency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        /* Standard Sales Period Report View */
        <>
          {/* Period Tabs */}
          <div className={styles.periodTabs}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                className={`${styles.periodTab} ${period === p.key ? styles.periodTabActive : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

      {loading ? (
        <div style={{display:'flex',justifyContent:'center',padding:'60px 0'}}>
          <div className="spinner"/>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className={styles.summaryGrid}>
            <SummaryCard icon={<DollarSign size={22} />} label={t('totalRevenue')} value={formatCurrency(data?.summary?.totalRevenue || 0)} color="blue" />
            <SummaryCard icon={<TrendingDown size={22} />} label="Total Cost" value={formatCurrency(data?.summary?.totalCost || 0)} color="red" />
            <SummaryCard icon={<TrendingUp size={22} />} label={t('totalProfit')} value={formatCurrency(data?.summary?.totalProfit || 0)} color="green" highlight />
            <SummaryCard icon={<ShoppingCart size={22} />} label={t('salesCount')} value={data?.summary?.salesCount || 0} suffix="sales" color="yellow" />
            <SummaryCard icon={<BarChart3 size={22} />} label={t('profitMargin')} value={`${data?.summary?.profitMargin || 0}%`} color="green" />
          </div>

          {/* Chart */}
          {data?.chartData?.length > 0 && (
            <div className="card">
              <h2 style={{fontSize:18,fontWeight:700,marginBottom:20}}>Revenue vs Profit</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.chartData} margin={{top:5,right:10,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                  <XAxis dataKey="label" tick={{fontSize:11,fontFamily:'var(--font-display)',fill:'var(--text-muted)'}} axisLine={false} tickLine={false}/>
                  <YAxis hide/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend wrapperStyle={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:13}}/>
                  <Bar dataKey="revenue" name="Revenue" fill="#86EFAC" radius={[4,4,0,0]}/>
                  <Bar dataKey="profit" name="Profit" fill="#16A34A" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Products */}
          {data?.topProducts?.length > 0 && (
            <div className="card">
              <h2 style={{fontSize:18,fontWeight:700,marginBottom:20,display:'flex',alignItems:'center',gap:8}}><Trophy size={20} /> Top Products</h2>
              <div className={styles.topProductsList}>
                {data.topProducts.map((p, i) => (
                  <div key={i} className={styles.topProductItem}>
                    <span className={styles.topProductRank}>{i+1}</span>
                    <div className={styles.topProductInfo}>
                      <p className={styles.topProductName}>{p.productName}</p>
                      <p className={styles.topProductMeta}>{p.totalSold} units sold</p>
                    </div>
                    <span className="profit-pill">+{formatCurrency(p.totalProfit)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method Breakdown */}
          {data?.paymentMethodBreakdown?.length > 0 && (
            <div className="card">
              <h2 style={{fontSize:18,fontWeight:700,marginBottom:20,display:'flex',alignItems:'center',gap:8}}><CreditCard size={20} /> Payment Methods</h2>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {data.paymentMethodBreakdown.map((pm, i) => (
                  <div key={i} style={{
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'space-between',
                    padding:'12px 16px',
                    background:'var(--bg-muted)',
                    borderRadius:'var(--radius-md)'
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontSize:20, display:'flex', alignItems:'center'}}>
                        {pm.method === 'cash' && <Banknote size={20} />}
                        {(pm.method === 'momo' || pm.method === 'mobile_money') && <Smartphone size={20} />}
                        {pm.method === 'card' && <CreditCard size={20} />}
                        {pm.method === 'bank' && <Building size={20} />}
                        {pm.method === 'credit' && <User size={20} />}
                      </span>
                      <div>
                        <p style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:14}}>
                          {pm.method === 'cash' && 'Cash'}
                          {(pm.method === 'momo' || pm.method === 'mobile_money') && 'Mobile Money (MoMo)'}
                          {pm.method === 'card' && 'Credit Card'}
                          {pm.method === 'bank' && 'Bank Transfer'}
                          {pm.method === 'credit' && 'Credit Sale'}
                          {!['cash', 'momo', 'mobile_money', 'card', 'bank', 'credit'].includes(pm.method) && pm.method.toUpperCase()}
                        </p>
                        <p style={{fontSize:12,color:'var(--text-muted)'}}>{pm.count} transaction{pm.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16}}>
                        {formatCurrency(pm.revenue)}
                      </p>
                      <p style={{fontSize:12,color:'var(--green-primary)',fontWeight:600}}>
                        +{formatCurrency(pm.profit)} profit
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unit Type Breakdown */}
          {data?.unitTypeBreakdown?.length > 0 && (
            <div className="card">
              <h2 style={{fontSize:18,fontWeight:700,marginBottom:20,display:'flex',alignItems:'center',gap:8}}><Package size={20} /> Unit Types</h2>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {data.unitTypeBreakdown.map((ut, i) => (
                  <div key={i} style={{
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'space-between',
                    padding:'12px 16px',
                    background:'var(--bg-muted)',
                    borderRadius:'var(--radius-md)'
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontSize:20}}><Ruler size={20} /></span>
                      <div>
                        <p style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:14}}>
                          {ut.unitType.charAt(0).toUpperCase() + ut.unitType.slice(1)}
                        </p>
                        <p style={{fontSize:12,color:'var(--text-muted)'}}>{ut.count} sale{ut.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16}}>
                        {formatCurrency(ut.revenue)}
                      </p>
                      <p style={{fontSize:12,color:'var(--green-primary)',fontWeight:600}}>
                        +{formatCurrency(ut.profit)} profit
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales Table */}
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:700,display:'flex',alignItems:'center',gap:8}}><ClipboardList size={20} /> Sales History</h2>
              <span className="badge badge-gray">{data?.sales?.length || 0} records</span>
            </div>
            {data?.sales?.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>{t('date')}</th>
                      <th>{t('productName')}</th>
                      <th>{t('quantity')}</th>
                      <th>Revenue</th>
                      <th>{t('profit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sales.map((sale, i) => (
                      <tr key={i}>
                        <td style={{color:'var(--text-muted)',fontSize:13}}>{formatDate(sale.createdAt)}</td>
                        <td style={{fontFamily:'var(--font-display)',fontWeight:600}}>{sale.product?.productName || 'Unknown'}</td>
                        <td><span className="badge badge-gray">{sale.quantity}</span></td>
                        <td style={{fontFamily:'var(--font-display)',fontWeight:600}}>{formatCurrency(sale.quantity * (sale.product?.sellingPrice || 0))}</td>
                        <td><span className="profit-pill">+{formatCurrency(sale.profit)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{padding:'40px'}}>
                <div className="empty-icon"><BarChart3 size={48} /></div>
                <p style={{color:'var(--text-muted)'}}>No sales data for this period</p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )}
</div>
  );
}

function SummaryCard({ icon, label, value, color, highlight, suffix }) {
  const colors = {
    green: { bg: 'var(--green-50)', border: 'var(--green-200)', text: 'var(--green-primary)' },
    yellow: { bg: 'var(--yellow-50)', border: '#FDE68A', text: 'var(--yellow-dark)' },
    blue: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
    red: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  };
  const c = colors[color] || colors.green;

  return (
    <div style={{
      background: highlight ? c.bg : 'white',
      border: `1px solid ${highlight ? c.border : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      transition: 'all var(--transition)',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
        <span style={{fontSize:22,color:highlight ? c.text : 'var(--text-muted)'}}>{icon}</span>
        <p style={{fontSize:13,color:'var(--text-muted)',fontWeight:600}}>{label}</p>
      </div>
      <p style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:22,color: highlight ? c.text : 'var(--text)'}}>
        {value}
      </p>
      {suffix && <p style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{suffix}</p>}
    </div>
  );
}
