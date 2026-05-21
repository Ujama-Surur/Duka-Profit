import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency, formatDate, formatTime } from '../utils/api-enhanced';
import { useAuth } from '../context/AuthContext';
import api, { offlineData } from '../utils/api-enhanced';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import Onboarding from '../components/Onboarding';
import styles from './Dashboard.module.css';
import { DollarSign, Calendar, CalendarDays, ShoppingCart, ShoppingBag, TrendingUp, WifiOff, Sun, Cloud, Moon, Utensils, Smartphone, Shirt, Package } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{background:'white',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'10px 14px',boxShadow:'var(--shadow-md)'}}>
        <p style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:'var(--text-muted)'}}>{label}</p>
        <p style={{fontFamily:'var(--font-display)',fontWeight:800,color:'var(--green-primary)',fontSize:15}}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();

    const handleFocus = () => {
      // Small delay to ensure network is active after sleep
      setTimeout(loadDashboard, 500);
    };

    window.addEventListener('focus', handleFocus);
    // Also refresh every 15 minutes to keep stats fresh
    const interval = setInterval(loadDashboard, 15 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const loadDashboard = async () => {
    try {
      // Fetch dashboard data
      const dashboardResponse = await api.get('/dashboard');
      
      setStats(dashboardResponse.data.stats);
      setChartData(dashboardResponse.data.chartData);
      setRecentSales(dashboardResponse.data.recentSales);
      
      // Cache for offline
      await offlineData.set('dashboard', dashboardResponse.data);
    } catch (error) {
      console.error('Dashboard load failed:', error);
      // Try offline cache
      const cached = await offlineData.get('dashboard');
      if (cached) {
        setStats(cached.stats);
        setChartData(cached.chartData);
        setRecentSales(cached.recentSales);
        toast('Using offline data', { icon: <WifiOff size={16} /> });
      } else {
        toast.error('Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return <>Good Morning <Sun size={20} /></>;
    if (h < 17) return <>Good Afternoon <Cloud size={20} /></>;
    return <>Good Evening <Moon size={20} /></>;
  };

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:16}}>
        <div className="spinner"></div>
        <p style={{color:'var(--text-muted)'}}>Loading your dashboard...</p>
      </div>
    );
  }

  // Check if onboarding should be shown
  const hasCompletedOnboarding = localStorage.getItem('duka_onboarding_completed');
  const hasProducts = stats?.totalProducts > 0;
  const hasSales = stats?.totalSales > 0;
  
  const showOnboarding = !hasCompletedOnboarding && (!hasProducts || !hasSales);

  if (showOnboarding) {
    return (
      <Onboarding 
        user={user}
        onComplete={() => {
          console.log('Onboarding completed');
        }}
      />
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={`${styles.header} animate-fade-in`}>
        <div>
          <p className={styles.greeting}>{getGreeting()}</p>
          <h1 className={styles.title}>{user?.name?.split(' ')[0] || 'Business Owner'}</h1>
          <p className={styles.date}>{new Date().toLocaleDateString('en-RW', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
        </div>
        <div className={styles.headerBadge}>
          <span>Shop</span>
          <span>Duka Profit</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <StatCard
          icon={<DollarSign size={24} />}
          label={t('todayProfit')}
          value={formatCurrency(stats?.todayProfit || 0)}
          change={stats?.todayChange}
          delay={1}
        />
        <StatCard
          icon={<Calendar size={24} />}
          label={t('weeklyProfit')}
          value={formatCurrency(stats?.weeklyProfit || 0)}
          change={stats?.weeklyChange}
          delay={2}
        />
        <StatCard
          icon={<CalendarDays size={24} />}
          label={t('monthlyProfit')}
          value={formatCurrency(stats?.monthlyProfit || 0)}
          change={stats?.monthlyChange}
          delay={3}
        />
        <StatCard
          icon={<ShoppingCart size={24} />}
          label={t('totalSales')}
          value={stats?.todaySalesCount || 0}
          suffix="sales today"
          delay={4}
        />
      </div>

      {/* Best Selling */}
      {stats?.bestProduct && (
        <div className={`${styles.bestProduct} animate-fade-in animate-delay-4`}>
          <span className={styles.headerBadge}><ShoppingBag size={20} /></span>
          <div>
            <p className={styles.bestProductLabel}>{t('bestSelling')}</p>
            <p className={styles.bestProductName}>{stats.bestProduct.name}</p>
          </div>
          <div className={styles.bestProductStats}>
            <span className="profit-pill">+{formatCurrency(stats.bestProduct.profit)}</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className={`card animate-fade-in animate-delay-5 ${styles.chartCard}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('profitTrend')}</h2>
          <span className="badge badge-green">Last 7 days</span>
        </div>
        {chartData.length > 0 ? (
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{top:10, right:10, left:0, bottom:0}}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{fontSize:12, fontFamily:'var(--font-display)', fill:'var(--text-muted)'}} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(value) => {
                    // Shorten day names on mobile
                    if (window.innerWidth < 500) {
                      return value.slice(0, 3);
                    }
                    return value;
                  }}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="profit" stroke="#16A34A" strokeWidth={2.5} fill="url(#profitGradient)" dot={{r:4, fill:'#16A34A', strokeWidth:2, stroke:'white'}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<TrendingUp size={48} />}
            title={t('noSalesData')}
            description={t('noSalesDataDesc')}
            action={t('recordFirstSale')}
            onAction={() => navigate('/sales')}
          />
        )}
      </div>

      {/* Recent Sales */}
      <div className={`card animate-fade-in animate-delay-5`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('recentSales')}</h2>
          <a href="/sales" className="btn btn-ghost btn-sm">View all →</a>
        </div>
        {recentSales.length > 0 ? (
          <div className={styles.salesList}>
            {recentSales.map((sale, i) => (
              <div key={i} className={styles.saleItem}>
                <div className={styles.saleIcon}>
                  {sale.product?.category === 'food' ? <Utensils size={20} /> :
                   sale.product?.category === 'electronics' ? <Smartphone size={20} /> :
                   sale.product?.category === 'clothing' ? <Shirt size={20} /> : <Package size={20} />}
                </div>
                <div className={styles.saleInfo}>
                  <p className={styles.saleName}>{sale.product?.productName || 'Unknown'}</p>
                  <p className={styles.saleMeta}>Qty: {sale.quantity} · {formatTime(sale.createdAt)}</p>
                </div>
                <div className={styles.saleProfit}>
                  <span className="profit-pill">+{formatCurrency(sale.profit)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{padding:'32px'}}>
            <div className="empty-icon" style={{width:56,height:56,fontSize:24}}><ShoppingCart size={32} /></div>
            <p style={{color:'var(--text-muted)',fontSize:14}}>{t('noSalesToday')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, change, color, delay, suffix }) {
  const colorMap = {
    green: { bg: 'var(--green-50)', iconBg: 'var(--green-100)', border: 'var(--green-200)' },
    yellow: { bg: 'var(--yellow-50)', iconBg: 'var(--yellow-light)', border: '#FDE68A' },
    blue: { bg: '#EFF6FF', iconBg: '#DBEAFE', border: '#BFDBFE' },
  };
  const c = colorMap[color] || colorMap.green;

  return (
    <div
      className={`animate-fade-in animate-delay-${delay}`}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        transition: 'all var(--transition)',
      }}
    >
      <div style={{
        width: 44, height: 44,
        background: c.iconBg,
        borderRadius: 'var(--radius-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, marginBottom: 14
      }}>
        {icon}
      </div>
      <p style={{fontSize:13, color:'var(--text-muted)', fontWeight:600, fontFamily:'var(--font-display)', marginBottom:6}}>
        {label}
      </p>
      <p style={{fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--text)', lineHeight:1.2}}>
        {value}
      </p>
      {suffix && <p style={{fontSize:12, color:'var(--text-muted)', marginTop:4}}>{suffix}</p>}
      {change !== undefined && (
        <p style={{fontSize:12, fontWeight:600, color: change >= 0 ? 'var(--green-primary)' : '#EF4444', marginTop:6, display:'flex', alignItems:'center', gap:4}}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs yesterday
        </p>
      )}
    </div>
  );
}
