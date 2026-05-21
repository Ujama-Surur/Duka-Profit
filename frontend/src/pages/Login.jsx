import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from "../context/AuthContext";
import Logo from '../components/common/Logo';
import api from '../utils/api-enhanced';
import styles from './Auth.module.css';

export default function Login() {
  console.log('🔑 Login page is rendering...');
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Forgot Password State
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Sign-in error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        stack: err.stack
      });
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setResetLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
      toast.success('Password reset link sent to your email!');
      setForgotPasswordMode(false);
      setResetEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <Logo size="large" />

        <div className={styles.authHeader}>
          <h1>{forgotPasswordMode ? 'Reset Password' : t('welcomeBack')}</h1>
          <p>{forgotPasswordMode ? 'Enter your email to receive a password reset link' : 'Sign in to manage your business profits'}</p>
        </div>

        {forgotPasswordMode ? (
          <form onSubmit={handleForgotPassword} className={styles.form}>
            <div className="form-group">
              <label className="form-label">{t('email')}</label>
              <input
                type="email"
                className="form-input form-input-lg"
                placeholder="your@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={resetLoading}
            >
              {resetLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
            
            <button
              type="button"
              className="btn btn-ghost btn-lg btn-full"
              style={{ marginTop: '10px' }}
              onClick={() => setForgotPasswordMode(false)}
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="form-group">
              <label className="form-label">{t('email')}</label>
              <input
                type="email"
                className={`form-input form-input-lg ${errors.email ? 'error' : ''}`}
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setForm(prev => ({ ...prev, email: newValue }));
                  if (errors.email) {
                    setErrors(prev => ({ ...prev, email: '' }));
                  }
                }}
                autoComplete="email"
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>{t('password')}</label>
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: 'var(--green-primary)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setForgotPasswordMode(true)}
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                className={`form-input form-input-lg ${errors.password ? 'error' : ''}`}
                placeholder="•••••••"
                value={form.password}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setForm(prev => ({ ...prev, password: newValue }));
                  if (errors.password) {
                    setErrors(prev => ({ ...prev, password: '' }));
                  }
                }}
                autoComplete="current-password"
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
            >
              {loading ? (
                <><div className="spinner" style={{width:20,height:20,borderWidth:2}} />&nbsp;Signing in...</>
              ) : (
                t('signIn')
              )}
            </button>
          </form>
        )}

        {!forgotPasswordMode && (
          <div className={styles.authFooter}>
            <p>{t('noAccount')} <Link to="/register" className={styles.authLink}>{t('signUp')}</Link></p>
          </div>
        )}

      </div>

      <div className={styles.authDecor}>
        <div className={styles.decorCard}>
          <div className={styles.decorStat}>
            <span className={styles.decorAmount}>Simplify Sales</span>
            <span className={styles.decorLabel}>Track Daily Profit</span>
          </div>
          <div className={styles.decorDots}></div>
        </div>
        <div className={styles.decorBg}></div>
      </div>
    </div>
  );
}
