import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { offlineData } from '../utils/api-enhanced';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('duka_user');
    const token = localStorage.getItem('duka_token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('duka_token', data.token);
    localStorage.setItem('duka_user', JSON.stringify(data.user));
    setUser(data.user);
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
    const updated = { ...user, ...updates };
    localStorage.setItem('duka_user', JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
