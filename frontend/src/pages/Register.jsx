import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';
import styles from './Auth.module.css';

const FormField = ({ id, label, type = 'text', placeholder, autoComplete, form, setForm, errors, setErrors }) => {
  const fieldValue = form[id] || '';
  
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        type={type}
        className={`form-input ${errors[id] ? 'error' : ''}`}
        placeholder={placeholder}
        value={fieldValue}
        onChange={(e) => {
          const newValue = e.target.value;
          setForm(prev => ({ ...prev, [id]: newValue }));
          // Clear error for this field when user starts typing
          if (errors[id]) {
            setErrors(prev => ({ ...prev, [id]: '' }));
          }
        }}
        autoComplete={autoComplete}
      />
      {errors[id] && <span className="form-error">{errors[id]}</span>}
    </div>
  );
};

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    licenseKey: '' 
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.licenseKey);
      toast.success('Account created! Welcome to Duka Profit 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <Logo size="large" />

        <div className={styles.authHeader}>
          <h1>{t('createAccount')}</h1>
          <p>Start tracking your profits today</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <FormField id="name" label={t('name')} placeholder="Jane Uwimana" autoComplete="name" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
          <FormField id="email" label={t('email')} type="email" placeholder="your@email.com" autoComplete="email" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
          <FormField id="password" label={t('password')} type="password" placeholder="••••••••" autoComplete="new-password" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
          <FormField id="confirmPassword" label={t('confirmPassword')} type="password" placeholder="••••••••" autoComplete="new-password" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />

          <div className="form-group">
            <label className="form-label">{t('licenseKey')} (Optional)</label>
            <input
              type="text"
              className={`form-input ${errors.licenseKey ? 'error' : ''}`}
              placeholder="DUKA-XXXX-XXXX-XXXX"
              value={form.licenseKey || ''}
              onChange={(e) => {
                const newValue = e.target.value.toUpperCase();
                setForm(prev => ({ ...prev, licenseKey: newValue }));
                // Clear error for this field when user starts typing
                if (errors.licenseKey) {
                  setErrors(prev => ({ ...prev, licenseKey: '' }));
                }
              }}
            />
            {errors.licenseKey && <span className="form-error">{errors.licenseKey}</span>}

          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
          >
            {loading ? (
              <><div className="spinner" style={{width:20,height:20,borderWidth:2}} />&nbsp;Creating account...</>
            ) : (
              `✨ ${t('signUp')}`
            )}
          </button>
        </form>

        <div className={styles.authFooter}>
          <p>{t('haveAccount')} <Link to="/login" className={styles.authLink}>{t('signIn')}</Link></p>
        </div>
      </div>

      <div className={styles.authDecor}>
        <div className={styles.decorCard}>
          <div style={{fontSize:48, marginBottom:12}}>🏪</div>
          <div className={styles.decorAmount} style={{fontSize:28}}>Track. Grow.</div>
          <div className={styles.decorLabel}>Know your profits every day</div>
        </div>
        <div className={styles.decorBg}></div>
      </div>
    </div>
  );
}
