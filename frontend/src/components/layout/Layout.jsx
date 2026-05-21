import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { syncPendingOperations } from '../../utils/api';
import Logo from '../common/Logo';
import NotificationsSimple from '../NotificationsSimple';
import styles from './Layout.module.css';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Download, 
  BarChart2, 
  Lock, 
  Settings,
  LogOut,
  Menu,
  ShoppingCartCheckout,
  ArrowDownToLine
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', icon: <TrendingUp size={20} />, key: 'dashboard' },
  { path: '/sales', icon: <ShoppingCart size={20} />, key: 'sales' },
  { path: '/checkout', icon: <ShoppingCartCheckout size={20} />, key: 'checkout', premiumOnly: true },
  { path: '/stock-in', icon: <ArrowDownToLine size={20} />, key: 'stockIn', premiumOnly: true },
  { path: '/products', icon: <Package size={20} />, key: 'products' },
  { path: '/import-products', icon: <Download size={20} />, key: 'importProducts' },
  { path: '/reports', icon: <BarChart2 size={20} />, key: 'reports' },
  { path: '/admin', icon: <Lock size={20} />, key: 'admin', adminOnly: true },
  { path: '/settings', icon: <Settings size={20} />, key: 'settings' },
];

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log('👤 Current User Data:', {
      name: user?.name,
      email: user?.email,
      role: user?.role,
      licenseStatus: user?.licenseStatus,
    });
  }, [user]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await syncPendingOperations();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning') || 'Good Morning';
    if (hour < 17) return t('goodAfternoon') || 'Good Afternoon';
    return t('goodEvening') || 'Good Evening';
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Logo size="medium" />
        </div>

        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className={styles.userName}>{user?.name}</p>
            <p className={styles.userGreeting}>{getGreeting()}</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS
            .filter(item => {
              if (item.adminOnly && user?.role !== 'admin') return false;
              if (item.premiumOnly && user?.role !== 'admin' && user?.licenseStatus !== 'active') return false;
              return true;
            })
            .map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{t(item.key)}</span>
              </NavLink>
            ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarNotifications}>
            <NotificationsSimple />
          </div>
          <div className={`${styles.statusBadge} ${isOnline ? styles.online : styles.offline}`}>
            <span className={styles.statusDot}></span>
            <span>{isOnline ? t('online') : t('offline')}</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <span><LogOut size={16} /></span>
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className={styles.main}>
        {/* Top bar (mobile) */}
        <div className={styles.topBar}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <Logo size="small" className={styles.topBarLogo} />
          <div className={styles.topBarRight}>
            <NotificationsSimple />
            <div className={`${styles.statusBadgeSm} ${isOnline ? styles.online : styles.offline}`}>
              <span className={styles.statusDot}></span>
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className={styles.bottomNav}>
        {NAV_ITEMS
          .filter(item => {
            if (item.adminOnly && user?.role !== 'admin') return false;
            if (item.premiumOnly && user?.role !== 'admin' && user?.licenseStatus !== 'active') return false;
            return true;
          })
          .slice(0, 5)
          .map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles.bottomNavItem} ${isActive ? styles.bottomNavItemActive : ''}`
              }
            >
              <span className={styles.bottomNavIcon}>{item.icon}</span>
              <span className={styles.bottomNavLabel}>{t(item.key)}</span>
            </NavLink>
          ))}
      </nav>
    </div>
  );
}
