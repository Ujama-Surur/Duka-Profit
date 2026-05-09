import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate, offlineData } from '../utils/api';
import styles from './Reports.module.css';

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

  useEffect(() => { loadReport(); }, [period]);

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
      toast.success('PDF exported! 📄');
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
    toast.success('CSV exported! 📊');
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
            <h1 className="page-title">📈 {t('reports')}</h1>
            <p className="page-subtitle">Analyze your business performance</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-outline btn-sm" onClick={exportCSV} disabled={exporting}>
              📊 {t('exportCSV')}
            </button>
            <button className="btn btn-primary btn-sm" onClick={exportPDF} disabled={exporting}>
              {exporting ? '...' : `📄 ${t('exportPDF')}`}
            </button>
          </div>
        </div>
      </div>

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
            <SummaryCard icon="💰" label={t('totalRevenue')} value={formatCurrency(data?.summary?.totalRevenue || 0)} color="blue" />
            <SummaryCard icon="📉" label="Total Cost" value={formatCurrency(data?.summary?.totalCost || 0)} color="red" />
            <SummaryCard icon="📈" label={t('totalProfit')} value={formatCurrency(data?.summary?.totalProfit || 0)} color="green" highlight />
            <SummaryCard icon="🛒" label={t('salesCount')} value={data?.summary?.salesCount || 0} suffix="sales" color="yellow" />
            <SummaryCard icon="📊" label={t('profitMargin')} value={`${data?.summary?.profitMargin || 0}%`} color="green" />
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
              <h2 style={{fontSize:18,fontWeight:700,marginBottom:20}}>🏆 Top Products</h2>
              <div className={styles.topProductsList}>
                {data.topProducts.map((p, i) => (
                  <div key={i} className={styles.topProductItem}>
                    <span className={styles.topProductRank}>{['🥇','🥈','🥉','4️⃣','5️⃣'][i] || `${i+1}.`}</span>
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

          {/* Sales Table */}
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:700}}>📋 Sales History</h2>
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
                <div className="empty-icon">📊</div>
                <p style={{color:'var(--text-muted)'}}>No sales data for this period</p>
              </div>
            )}
          </div>
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
        <span style={{fontSize:22}}>{icon}</span>
        <p style={{fontSize:13,color:'var(--text-muted)',fontWeight:600}}>{label}</p>
      </div>
      <p style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:22,color: highlight ? c.text : 'var(--text)'}}>
        {value}
      </p>
      {suffix && <p style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{suffix}</p>}
    </div>
  );
}
