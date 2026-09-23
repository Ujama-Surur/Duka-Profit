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
  Receipt,
  FileText,
  Layers,
  Archive,
  DollarSign,
  ClipboardList,
  Crown
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'Point of Sale',
    key: 'pos',
    items: [
      { path: '/checkout', icon: <ShoppingCart size={19} />, key: 'checkout', premiumOnly: true, badge: 'POS' },
      { path: '/stock-in', icon: <PlusSquare size={19} />, key: 'stockIn', premiumOnly: true },
      { path: '/sales', icon: <Receipt size={19} />, key: 'sales' },
    ]
  },
  {
    title: 'Inventory',
    key: 'inventory',
    items: [
      { path: '/products', icon: <Package size={19} />, key: 'products' },
      { path: '/stock', icon: <Archive size={19} />, key: 'stock' },
      { path: '/inventory-orders', icon: <FileText size={19} />, key: 'inventoryOrders' },
      { path: '/categories-units', icon: <Layers size={19} />, key: 'categoriesUnits' },
      { path: '/import-products', icon: <Download size={19} />, key: 'importProducts' },
    ]
  },
  {
    title: 'Financials & Reports',
    key: 'analytics',
    items: [
      { path: '/dashboard', icon: <TrendingUp size={19} />, key: 'dashboard' },
      { path: '/finance', icon: <DollarSign size={19} />, key: 'finance' },
      { path: '/reports', icon: <BarChart2 size={19} />, key: 'reports' },
      { path: '/daily-report', icon: <ClipboardList size={19} />, key: 'dailyCashReport' },
    ]
  },
  {
    title: 'Settings & Admin',
    key: 'management',
    items: [
      { path: '/subscription', icon: <Crown size={19} />, key: 'subscription', badge: 'PRO' },
      { path: '/admin', icon: <Lock size={19} />, key: 'admin', adminOnly: true },
      { path: '/settings', icon: <Settings size={19} />, key: 'settings' },
    ]
  }
];

const LayoutEnhanced = () => {
  const { t } = useTranslation();
  const { user, logout, hasEntitlement, isSubscriptionActive } = useAuth();
  const navigate = useNavigate();
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const hasPremiumAccess = user?.role === 'admin' || isSubscriptionActive || hasEntitlement('CHECKOUT');

  // Global F2 keyboard shortcut to open POS checkout
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        navigate('/checkout');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

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

  const sidebarWidth = isMobile ? '280px' : (collapsed ? '76px' : '260px');

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
        boxShadow: '2px 0 12px rgba(0,0,0,0.03)',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
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
          padding: collapsed && !isMobile ? '20px 8px' : '20px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
          gap: '12px',
          height: '72px',
          overflow: 'hidden',
          background: '#FAFAFA'
        }}>
          <Logo size="small" />
          {(!collapsed || isMobile) && (
            <div style={{ transition: 'opacity 0.2s', opacity: 1, whiteSpace: 'nowrap' }}>
              <h1 style={{
                fontSize: '17px',
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
                color: 'var(--green-primary)',
                fontWeight: '700',
                letterSpacing: '0.2px'
              }}>
                Smart Retail POS
              </p>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav style={{
          flex: 1,
          padding: collapsed && !isMobile ? '12px 6px' : '14px 10px',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {NAV_SECTIONS.map((section, sIdx) => {
            const filteredItems = section.items.filter(item => !item.adminOnly || user?.role === 'admin');
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.key} style={{ marginBottom: '14px' }}>
                {(!collapsed || isMobile) && (
                  <p style={{
                    fontSize: '10.5px',
                    fontWeight: '700',
                    color: 'var(--text-light)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    padding: '6px 12px 4px',
                    margin: 0
                  }}>
                    {section.title}
                  </p>
                )}
                {collapsed && !isMobile && sIdx > 0 && (
                  <div style={{ height: '1px', background: 'var(--border)', margin: '8px 8px' }} />
                )}
                {filteredItems.map(item => {
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
                        gap: collapsed && !isMobile ? '0' : '10px',
                        padding: collapsed && !isMobile ? '10px 0' : '10px 12px',
                        borderRadius: '10px',
                        color: isActive ? 'white' : 'var(--text)',
                        background: isActive ? 'linear-gradient(135deg, #10B981, #059669)' : 'transparent',
                        boxShadow: isActive ? '0 4px 12px rgba(16, 185, 129, 0.28)' : 'none',
                        textDecoration: 'none',
                        fontSize: '13.5px',
                        fontWeight: isActive ? '700' : '500',
                        transition: 'all 0.18s ease',
                        marginBottom: '3px',
                        position: 'relative'
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
                            color: '#EF4444', 
                            background: 'white', 
                            borderRadius: '50%', 
                            padding: '1px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
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
                          {item.badge && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              background: '#FEF3C7',
                              color: '#B45309',
                              marginLeft: '8px'
                            }}>
                              {item.badge}
                            </span>
                          )}
                          {isLocked && (
                            <Lock size={12} style={{ opacity: 0.6, color: '#EF4444', marginLeft: 8 }} />
                          )}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer with User Profile */}
        <div style={{
          padding: collapsed && !isMobile ? '14px 6px' : '14px 12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: '#FAFAFA'
        }}>
          {(!collapsed || isMobile) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 8px',
              background: 'white',
              borderRadius: '10px',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '13px',
                flexShrink: 0
              }}>
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text)'
                }}>
                  {user?.name || 'Store Merchant'}
                </p>
                <p style={{
                  fontSize: '11px',
                  margin: 0,
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user?.email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            title={collapsed && !isMobile ? t('logout') : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
              gap: collapsed && !isMobile ? '0' : '10px',
              padding: collapsed && !isMobile ? '10px 0' : '10px 14px',
              background: 'transparent',
              border: '1px solid #FEE2E2',
              borderRadius: '10px',
              color: '#DC2626',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              width: '100%'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#FEE2E2';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '20px', 
              height: '20px' 
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Hamburger Toggle Button */}
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
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              title="Toggle sidebar"
            >
              <Menu size={20} />
            </button>

            {/* Store branding */}
            {isMobile ? (
              <Logo size="small" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.01em'
                }}>
                  {user?.storeName || 'Duka Store'}
                </span>
                <span className="badge badge-green" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  {user?.role === 'admin' ? 'Admin' : 'Store Owner'}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Quick Sale / POS Button */}
            <button
              onClick={() => navigate('/checkout')}
              className="btn btn-primary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '700',
                padding: '8px 14px',
                borderRadius: '8px'
              }}
              title="Quick Sale POS (Press F2 from anywhere)"
            >
              <ShoppingCart size={16} />
              <span style={{ display: isMobile ? 'none' : 'inline' }}>Quick Sale</span>
              <kbd style={{
                fontSize: '10px',
                background: 'rgba(255,255,255,0.22)',
                padding: '2px 5px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontWeight: '600'
              }}>F2</kbd>
            </button>

            {/* Network status indicator */}
            {isOnline ? (
              <span className="badge" style={{
                background: '#ECFDF5',
                color: '#047857',
                border: '1px solid #A7F3D0',
                padding: '6px 10px',
                gap: '6px'
              }}>
                <span className="pulse-green" />
                <span style={{ display: isMobile ? 'none' : 'inline', fontSize: '11.5px' }}>Online</span>
              </span>
            ) : (
              <span className="badge badge-red" style={{ padding: '6px 12px', fontSize: '11px', gap: '6px' }}>
                <WifiOff size={13} />
                <span>Offline</span>
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
