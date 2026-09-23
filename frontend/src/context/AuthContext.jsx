import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { offlineData } from '../utils/api-enhanced';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronize authoritative user data, subscription, and entitlements from backend
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('duka_token');
    if (!token) return null;

    try {
      const { data } = await api.get('/auth/me');
      if (data) {
        localStorage.setItem('duka_user', JSON.stringify(data));
        setUser(data);
        return data;
      }
    } catch (err) {
      console.warn('Failed to refresh user profile from server:', err?.response?.data?.message || err.message);
    }
    return null;
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('duka_user');
      const token = localStorage.getItem('duka_token');

      if (savedUser && token) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // ignore json parse error
        }
      }

      if (token) {
        await refreshUser();
      }

      setLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('duka_token', data.token);
    localStorage.setItem('duka_user', JSON.stringify(data.user));
    setUser(data.user);
    // Fetch latest subscription & entitlements
    try {
      const meRes = await api.get('/auth/me');
      if (meRes.data) {
        localStorage.setItem('duka_user', JSON.stringify(meRes.data));
        setUser(meRes.data);
      }
    } catch {}
    return data;
  }, []);

  const register = useCallback(async (name, email, password, licenseKey) => {
    const { data } = await api.post('/auth/register', { name, email, password, licenseKey });
    localStorage.setItem('duka_token', data.token);
    localStorage.setItem('duka_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('duka_token');
    localStorage.removeItem('duka_user');
    offlineData.clearAll();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('duka_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Helper: check if authenticated user possesses a given entitlement
  const hasEntitlement = useCallback(
    (featureName) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.licenseStatus === 'active') return true; // legacy compatibility
      if (user.subscription?.entitlements) {
        return user.subscription.entitlements.includes(featureName);
      }
      if (user.entitlements) {
        return user.entitlements.includes(featureName);
      }
      return false;
    },
    [user]
  );

  const isSubscriptionActive = Boolean(
    user?.role === 'admin' ||
      user?.licenseStatus === 'active' ||
      user?.subscription?.isEntitled ||
      user?.subscriptionStatus === 'ACTIVE'
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
        hasEntitlement,
        isSubscriptionActive,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
