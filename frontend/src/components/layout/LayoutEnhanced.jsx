import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { syncPendingOperations } from '../../utils/api';
import Logo from '../common/Logo';
import NotificationsSimple from '../NotificationsSimple';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '📈', key: 'dashboard' },
  { path: '/sales', icon: '🛒', key: 'sales' },
  { path: '/products', icon: '📦', key: 'products' },
  { path: '/import-products', icon: '📥', key: 'importProducts' },
  { path: '/reports', icon: '📊', key: 'reports' },
  { path: '/admin', icon: '🔐', key: 'admin', adminOnly: true },
  { path: '/settings', icon: '⚙️', key: 'settings' },
];

const LayoutEnhanced = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log('👤 Current User Data:', {
      name: user?.name,
      email: user?.email,
      role: user?.role,
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
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg)',
      fontFamily: 'var(--font-display)',
      overflow: 'hidden'
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '280px' : '280px',
        background: 'var(--bg-card)',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
        position: 'relative',
        zIndex: 100,
        borderRight: '1px solid var(--border)'
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '32px 24px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <Logo size="small" />
            <div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '800',
                margin: '0',
                color: 'var(--text)',
                letterSpacing: '-0.5px',
                lineHeight: '1.2'
              }}>
                Duka Profit
              </h1>
              <p style={{
                fontSize: '13px',
                margin: '0',
                color: 'var(--text-muted)',
                fontWeight: '500',
                letterSpacing: '0.5px'
              }}>
                Business Management System
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1,
          padding: '24px 16px',
          overflowY: 'auto'
        }}>
          {NAV_ITEMS
            .filter(item => !item.adminOnly || user?.role === 'admin')
            .map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  color: 'var(--text)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  marginBottom: '4px',
                  border: '1px solid transparent'
                }}
                className={({ isActive }) =>
                  isActive ? {
                    background: 'var(--green-primary)',
                    color: 'white',
                    border: '1px solid var(--green-primary)'
                  } : {}
                }
                onClick={() => setSidebarOpen(false)}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <span>{t(item.key)}</span>
              </NavLink>
            ))}
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          padding: '24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#dc2626';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#ef4444';
            }}
          >
            <span>🚪</span>
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)'
      }}>
        {/* Top Bar */}
        <header style={{
          height: '72px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                display: 'none',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ☰
            </button>
            
            <NotificationsSimple />
          </div>
        </header>

        {/* Page Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px',
          background: 'var(--bg)'
        }}>
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
            display: 'none'
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          aside {
            position: fixed;
            left: ${sidebarOpen ? '0' : '-280px'};
            top: 0;
            height: 100vh;
            z-index: 1000;
            transition: left 0.3s ease;
          }

          main {
            margin-left: 0;
          }

          header button {
            display: flex !important;
          }

          header > div > h1 {
            font-size: 20px;
          }

          header > div > p {
            display: none;
          }

          .overlay {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LayoutEnhanced;
