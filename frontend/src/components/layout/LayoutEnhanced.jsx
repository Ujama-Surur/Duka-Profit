import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { syncPendingOperations } from '../../utils/api';
import Logo from '../common/Logo';
import NotificationsSimple from '../NotificationsSimple';
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
  PlusSquare,
  Receipt
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', icon: <TrendingUp size={20} />, key: 'dashboard' },
  { path: '/stock-in', icon: <PlusSquare size={20} />, key: 'stockIn', premiumOnly: true },
  { path: '/checkout', icon: <ShoppingCart size={20} />, key: 'checkout', premiumOnly: true },
  { path: '/sales', icon: <Receipt size={20} />, key: 'sales' },
  { path: '/products', icon: <Package size={20} />, key: 'products' },
  { path: '/import-products', icon: <Download size={20} />, key: 'importProducts' },
  { path: '/reports', icon: <BarChart2 size={20} />, key: 'reports' },
  { path: '/admin', icon: <Lock size={20} />, key: 'admin', adminOnly: true },
  { path: '/settings', icon: <Settings size={20} />, key: 'settings' },
];

const LayoutEnhanced = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const hasPremiumAccess = user?.role === 'admin' || user?.licenseStatus === 'active';

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false); // Close mobile drawer when resizing up
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    console.log('👤 Current User Data:', {
      name: user?.name,
      email: user?.email,
      role: user?.role,
    });
  }, [user]);

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

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const sidebarWidth = isMobile ? '280px' : (collapsed ? '72px' : '260px');

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg)',
      fontFamily: 'var(--font-display)',
      overflow: 'hidden'
    }}>
      {/* Sidebar Drawer / Collapsible Sidebar */}
      <aside style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: 'var(--bg-card)',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 20px rgba(0,0,0,0.05)',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (sidebarOpen ? '0' : '-280px') : '0',
        top: 0,
        height: '100vh',
        zIndex: 1000,
        borderRight: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: collapsed && !isMobile ? '24px 8px' : '24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
          gap: '12px',
          height: '72px',
          overflow: 'hidden'
        }}>
          <Logo size="small" />
          {(!collapsed || isMobile) && (
            <div style={{ transition: 'opacity 0.2s', opacity: 1, whiteSpace: 'nowrap' }}>
              <h1 style={{
                fontSize: '18px',
                fontWeight: '800',
                margin: '0',
                color: 'var(--text)',
                letterSpacing: '-0.5px',
                lineHeight: '1.2'
              }}>
                Duka Profit
              </h1>
              <p style={{
                fontSize: '11px',
                margin: '0',
                color: 'var(--text-muted)',
                fontWeight: '500',
                letterSpacing: '0.2px'
              }}>
                Management System
              </p>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav style={{
          flex: 1,
          padding: collapsed && !isMobile ? '16px 8px' : '16px 12px',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {NAV_ITEMS
            .filter(item => !item.adminOnly || user?.role === 'admin')
            .map(item => {
              const isLocked = item.premiumOnly && !hasPremiumAccess;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed && !isMobile ? t(item.key) : undefined}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                    gap: collapsed && !isMobile ? '0' : '12px',
                    padding: collapsed && !isMobile ? '12px 0' : '12px 14px',
                    borderRadius: '10px',
                    color: isActive ? 'white' : 'var(--text)',
                    background: isActive ? 'var(--green-primary)' : 'transparent',
                    border: isActive ? '1px solid var(--green-primary)' : '1px solid transparent',
                    textDecoration: 'none',
                    fontSize: '13.5px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    marginBottom: '4px',
                  })}
                  onClick={() => isMobile && setSidebarOpen(false)}
                >
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '24px', 
                    height: '24px',
                    position: 'relative'
                  }}>
                    {item.icon}
                    {isLocked && (
                      <Lock size={10} style={{ 
                        position: 'absolute', 
                        bottom: -2, 
                        right: -2, 
                        color: 'var(--red)', 
                        background: 'var(--bg-card)', 
                        borderRadius: '50%', 
                        padding: '1px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }} />
                    )}
                  </span>
                  {(!collapsed || isMobile) && (
                    <span style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      transition: 'opacity 0.2s',
                      opacity: 1
                    }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{t(item.key)}</span>
                      {isLocked && (
                        <Lock size={13} style={{ opacity: 0.6, color: 'var(--red)', marginLeft: 8 }} />
                      )}
                    </span>
                  )}
                </NavLink>
              );
            })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          padding: collapsed && !isMobile ? '16px 8px' : '16px 12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <button
            onClick={handleLogout}
            title={collapsed && !isMobile ? t('logout') : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
              gap: collapsed && !isMobile ? '0' : '12px',
              padding: collapsed && !isMobile ? '12px 0' : '12px 14px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '13.5px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#dc2626';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#ef4444';
            }}
          >
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '24px', 
              height: '24px' 
            }}>
              <LogOut size={16} />
            </span>
            {(!collapsed || isMobile) && (
              <span style={{ whiteSpace: 'nowrap' }}>{t('logout')}</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)',
        width: '100%'
      }}>
        {/* Header Bar */}
        <header style={{
          height: '72px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Mobile-only Branding (Logo on left) */}
            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Logo size="small" />
                <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text)' }}>Duka Profit</span>
              </div>
            )}

            {/* Hamburger Toggle Button (Next to it) */}
            <button
              onClick={toggleSidebar}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Menu size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!isOnline && (
              <span className="badge badge-red" style={{ padding: '6px 12px', fontSize: '11px' }}>
                Offline Mode
              </span>
            )}
            <NotificationsSimple />
          </div>
        </header>

        {/* Page Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: isMobile ? '16px' : '24px',
          background: 'var(--bg)'
        }}>
          <Outlet />
        </div>
      </main>

      {/* Backdrop Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
            transition: 'opacity 0.3s ease'
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default LayoutEnhanced;
