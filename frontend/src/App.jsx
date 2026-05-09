import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import './i18n/index.js';
import './index.css';

import Layout from './components/layout/LayoutEnhanced';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import ResetPassword from './pages/ResetPassword';
import ActivationScreen from './components/ActivationScreen';
import ErrorBoundary from './components/ErrorBoundary';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const ImportProducts = lazy(() => import('./pages/ImportProducts'));
const Sales = lazy(() => import('./pages/Sales'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Admin = lazy(() => import('./pages/Admin'));

console.log('🚀 App.jsx is mounting...');

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || user.role !== 'admin') {
    console.warn('⛔ Access denied: Admin role required');
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      background: 'var(--bg)',
    }}>
      <div style={{fontSize: 56}}>💰</div>
      <div className="spinner" />
      <p style={{color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 600}}>
        Loading Duka Profit...
      </p>
    </div>
  );
}

function ActivationRoute({ onActivated }) {
  const navigate = useNavigate();
  return (
    <ActivationScreen
      onActivated={(payload) => {
        if (onActivated) onActivated(payload);
        navigate('/login', { replace: true });
      }}
    />
  );
}

export default function App() {
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [requiresActivation, setRequiresActivation] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkStartupLicense = async () => {
      try {
        if (window.electronAPI?.getStartupLicenseStatus) {
          const status = await window.electronAPI.getStartupLicenseStatus();
          if (!mounted) return;
          setRequiresActivation(Boolean(status?.requiresActivation));
        }
      } catch (error) {
        console.error('Failed to read startup license status:', error);
      } finally {
        if (mounted) setLicenseLoading(false);
      }
    };
    checkStartupLicense();
    return () => {
      mounted = false;
    };
  }, []);

  if (licenseLoading) return <LoadingScreen />;

  if (requiresActivation) {
    return (
      <ActivationScreen 
        onActivated={() => {
          console.log('Activation successful!');
          setRequiresActivation(false);
        }} 
      />
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />

              {/* Authenticated Layout */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/import-products" element={<ImportProducts />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route index element={<Navigate to="/dashboard" replace />} />
              </Route>

              {/* Fallback to landing */}
              <Route path="/" element={<Landing />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </HashRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#fff',
              color: '#111827',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '14px',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              border: '1px solid #E5E7EB',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#16A34A', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#fff' },
            },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}
