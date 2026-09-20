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
      {/* Header & Quick Action Bar */}
      <div className={`${styles.header} animate-fade-in`}>
        <div>
          <p className={styles.greeting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {getGreeting()}
          </p>
          <h1 className={styles.title} style={{ letterSpacing: '-0.02em', marginTop: '2px' }}>
            {user?.name?.split(' ')[0] || 'Business Owner'}
          </h1>
          <p className={styles.date}>
            {new Date().toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/checkout')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-green)' }}
          >
            <ShoppingCart size={18} />
            <span>New Sale</span>
            <kbd style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 5px', borderRadius: '4px' }}>F2</kbd>
          </button>
          <button
            onClick={() => navigate('/stock-in')}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Package size={17} />
            <span>Stock In</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)' }}
          >
            <TrendingUp size={17} />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <StatCard
          icon={<DollarSign size={22} />}
          label={t('todayProfit')}
          value={formatCurrency(stats?.todayProfit || 0)}
          change={stats?.todayChange}
          color="emerald"
          delay={1}
        />
        <StatCard
          icon={<Calendar size={22} />}
          label={t('weeklyProfit')}
          value={formatCurrency(stats?.weeklyProfit || 0)}
          change={stats?.weeklyChange}
          color="emerald"
          delay={2}
        />
        <StatCard
          icon={<CalendarDays size={22} />}
          label={t('monthlyProfit')}
          value={formatCurrency(stats?.monthlyProfit || 0)}
          change={stats?.monthlyChange}
          color="amber"
          delay={3}
        />
        <StatCard
          icon={<ShoppingCart size={22} />}
          label={t('totalSales')}
          value={stats?.todaySalesCount || 0}
          suffix="orders today"
          color="sky"
          delay={4}
        />
      </div>

      {/* Best Selling Spotlight */}
      {stats?.bestProduct && (
        <div className={`${styles.bestProduct} animate-fade-in animate-delay-4`}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <p className={styles.bestProductLabel}>{t('bestSelling')} Top Performer</p>
            <p className={styles.bestProductName}>{stats.bestProduct.name}</p>
          </div>
          <div className={styles.bestProductStats}>
            <span className="profit-pill" style={{ fontSize: '14px', padding: '6px 14px' }}>
              +{formatCurrency(stats.bestProduct.profit)}
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className={`card animate-fade-in animate-delay-5 ${styles.chartCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>{t('profitTrend')}</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Daily net profit over the past 7 days</p>
          </div>
          <span className="badge badge-green">Last 7 days</span>
        </div>
        {chartData.length > 0 ? (
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{top:10, right:10, left:0, bottom:0}}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{fontSize:12, fontFamily:'var(--font-display)', fill:'var(--text-muted)'}} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(value) => {
                    if (window.innerWidth < 500) {
                      return value.slice(0, 3);
                    }
                    return value;
                  }}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="profit" stroke="#059669" strokeWidth={2.5} fill="url(#profitGradient)" dot={{r:4, fill:'#059669', strokeWidth:2, stroke:'white'}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<TrendingUp size={48} />}
            title={t('noSalesData')}
            description={t('noSalesDataDesc')}
            action={t('recordFirstSale')}
            onAction={() => navigate('/checkout')}
          />
        )}
      </div>

      {/* Recent Sales */}
      <div className={`card animate-fade-in animate-delay-5`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>{t('recentSales')}</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Latest recorded transactions</p>
          </div>
          <button
            onClick={() => navigate('/sales')}
            className="btn btn-ghost btn-sm"
            style={{ fontWeight: '600' }}
          >
            View all sales →
          </button>
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
                  <p className={styles.saleName}>{sale.product?.productName || 'Sale'}</p>
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
            <div className="empty-icon" style={{width:56,height:56,fontSize:24}}><ShoppingCart size={28} /></div>
            <p style={{color:'var(--text-muted)',fontSize:14}}>{t('noSalesToday')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, change, color = 'emerald', delay, suffix }) {
  const colorMap = {
    emerald: {
      bg: '#FFFFFF',
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      border: '1px solid #E2E8F0',
      badgeBg: '#DCFCE7',
      badgeColor: '#047857'
    },
    amber: {
      bg: '#FFFFFF',
      iconBg: '#FFFBEB',
      iconColor: '#D97706',
      border: '1px solid #E2E8F0',
      badgeBg: '#FEF3C7',
      badgeColor: '#B45309'
    },
    sky: {
      bg: '#FFFFFF',
      iconBg: '#F0F9FF',
      iconColor: '#0284C7',
      border: '1px solid #E2E8F0',
      badgeBg: '#E0F2FE',
      badgeColor: '#0369A1'
    },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div
      className={`card-interactive animate-fade-in animate-delay-${delay}`}
      style={{
        background: c.bg,
        border: c.border,
        borderRadius: 'var(--radius-lg)',
        padding: '22px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44,
          background: c.iconBg,
          color: c.iconColor,
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          {icon}
        </div>
        {change !== undefined && (
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: change >= 0 ? '#047857' : '#B91C1C',
            background: change >= 0 ? '#DCFCE7' : '#FEE2E2',
            padding: '3px 8px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>

      <div>
        <p style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 4
        }}>
          {label}
        </p>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '24px',
          color: 'var(--text)',
          lineHeight: 1.15,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em'
        }}>
          {value}
        </p>
        {suffix && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>{suffix}</p>}
      </div>
    </div>
  );
}
