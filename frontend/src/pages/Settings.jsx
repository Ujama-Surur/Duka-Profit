import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { formatCurrency, formatDate } from '../utils/api';
import styles from './Settings.module.css';
import { User, Receipt, Globe, Lock, Key, Info, Save, CheckCircle, DollarSign, Check, AlertTriangle, Crown, Sparkles, RefreshCw } from 'lucide-react';

import { SUPPORTED_CURRENCIES, ROUNDING_OPTIONS } from '../utils/currencyUtils';

const UkFlag = () => (
  <svg width="24" height="16" viewBox="0 0 60 30" style={{ borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
    <rect width="60" height="30" fill="#012169"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" strokeWidth="4"/>
    <path d="M30,0 L30,30 M0,15 L60,15" stroke="#fff" strokeWidth="10"/>
    <path d="M30,0 L30,30 M0,15 L60,15" stroke="#c8102e" strokeWidth="6"/>
  </svg>
);

const RwandaFlag = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" style={{ borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
    <rect width="24" height="8" fill="#00A3E0"/>
    <rect y="8" width="24" height="4" fill="#FCD116"/>
    <rect y="12" width="24" height="4" fill="#20603D"/>
    <circle cx="18" cy="4" r="1.5" fill="#FCD116"/>
  </svg>
);

const TanzaniaFlag = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" style={{ borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
    <rect width="24" height="16" fill="#1EB53A"/>
    <path d="M0,16 L24,0 L24,16 Z" fill="#00A3E0"/>
    <path d="M0,16 L24,0" stroke="#FCD116" strokeWidth="4.5"/>
    <path d="M0,16 L24,0" stroke="#000000" strokeWidth="3"/>
  </svg>
);

const FranceFlag = () => (
  <svg width="24" height="16" viewBox="0 0 3 2" style={{ borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
    <rect width="1" height="2" fill="#002395"/>
    <rect x="1" width="1" height="2" fill="#FFFFFF"/>
    <rect x="2" width="1" height="2" fill="#ED2939"/>
  </svg>
);

const LANGUAGES = [
  { code: 'en', label: 'English', flag: <UkFlag />, native: 'English' },
  { code: 'rw', label: 'Kinyarwanda', flag: <RwandaFlag />, native: 'Kinyarwanda' },
  { code: 'sw', label: 'Swahili', flag: <TanzaniaFlag />, native: 'Kiswahili' },
  { code: 'fr', label: 'French', flag: <FranceFlag />, native: 'Français' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, updateUser, logout } = useAuth();

  const SECTIONS = [
    { key: 'account', icon: <User size={20} />, label: 'Account' },
    { key: 'currency', icon: <DollarSign size={20} />, label: 'Currency & Pricing' },
    { key: 'receipts', icon: <Receipt size={20} />, label: 'Receipts' },
    { key: 'language', icon: <Globe size={20} />, label: t('language') },
    { key: 'security', icon: <Lock size={20} />, label: 'Security' },
    { key: 'subscription', icon: <Crown size={20} />, label: 'Subscription' },
    { key: 'about', icon: <Info size={20} />, label: 'About' },
  ];

  const [profile, setProfile] = useState({ 
    name: user?.name || '', 
    email: user?.email || '',
    storeName: user?.storeName || '',
    receiptHeader: user?.receiptHeader || '',
    receiptFooter: user?.receiptFooter || 'Thank you for your business!'
  });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('account');
  const [newLicenseKey, setNewLicenseKey] = useState('');
  const [activatingLicense, setActivatingLicense] = useState(false);
  const location = useLocation();

  // Currency & Pricing Settings State
  const [currencySettings, setCurrencySettings] = useState({
    isEnabled: false,
    baseCurrency: 'USD',
    sellingCurrency: 'SSP',
    exchangeRateMode: 'manual',
    rateSource: 'manual',
    minProtectionMargin: 0,
    roundingRule: '100',
  });
  const [loadingCurrency, setLoadingCurrency] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);

  useEffect(() => {
    if (activeSection === 'currency') {
      loadCurrencySettings();
    }
  }, [activeSection]);

  const loadCurrencySettings = async () => {
    setLoadingCurrency(true);
    try {
      const { data } = await api.get('/currency/settings');
      if (data) {
        setCurrencySettings(data);
        if (data.sellingCurrency) {
          localStorage.setItem('duka_selling_currency', data.sellingCurrency);
        }
      }
    } catch (err) {
      console.error('Failed to load currency settings:', err);
    } finally {
      setLoadingCurrency(false);
    }
  };

  const handleSaveCurrencySettings = async (e) => {
    e.preventDefault();
    setSavingCurrency(true);
    try {
      const { data } = await api.put('/currency/settings', currencySettings);
      setCurrencySettings(data);
      if (data.sellingCurrency) {
        localStorage.setItem('duka_selling_currency', data.sellingCurrency);
      }
      toast.success('Currency & Pricing settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save currency settings.');
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleActivateUserLicense = async (e) => {
    e.preventDefault();
    if (!newLicenseKey.trim()) {
      toast.error('Please enter a license key.');
      return;
    }
    setActivatingLicense(true);
    try {
      const { data } = await api.put('/auth/activate-license', { licenseKey: newLicenseKey.trim() });
      updateUser(data.user);
      toast.success('Premium License Activated! POS and Stock In are now unlocked.');
      setNewLicenseKey('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Activation failed. Please check the key.');
    } finally {
      setActivatingLicense(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'license' || tab === 'subscription') {
      setActiveSection('subscription');
    } else if (tab && SECTIONS.some(s => s.key === tab)) {
      setActiveSection(tab);
    }
  }, [location.search]);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('duka_language', code);
    toast.success('Language changed!');
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) { toast.error('Name is required'); return; }
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', profile);
      updateUser(data.user);
      toast.success(t('profileUpdated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (passwords.newPass !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.newPass,
      });
      toast.success('Password changed!');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1 className="page-title" style={{display:'flex',alignItems:'center',gap:8}}><Lock size={24} /> {t('settings')}</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      <div className={styles.layout}>
        {/* Sidebar nav */}
        <div className={styles.sideNav}>
          {SECTIONS.map(s => (
            <button
              key={s.key}
              className={`${styles.sideNavItem} ${activeSection === s.key ? styles.sideNavItemActive : ''}`}
              onClick={() => setActiveSection(s.key)}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Account */}
          {activeSection === 'account' && (
            <div className="card">
              <h2 className={styles.sectionTitle} style={{display:'flex',alignItems:'center',gap:8}}><User size={20} /> Account Details</h2>
              <div className={styles.avatarSection}>
                <div className={styles.avatarLarge}>
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:18}}>{user?.name}</p>
                  <p style={{color:'var(--text-muted)',fontSize:14}}>{user?.email}</p>
                  <span className="badge badge-green" style={{marginTop:8}}>Active Account</span>
                </div>
              </div>
              <div className="divider" />
              <form onSubmit={saveProfile} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">{t('name')}</label>
                  <input
                    className="form-input"
                    value={profile.name}
                    onChange={e => setProfile(prev => ({...prev, name: e.target.value}))}
                    placeholder="Your full name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('email')}</label>
                  <input
                    className="form-input"
                    type="email"
                    value={profile.email}
                    onChange={e => setProfile(prev => ({...prev, email: e.target.value}))}
                    placeholder="your@email.com"
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? '...' : <><Save size={16} style={{marginRight:6}} /> {t('saveSettings')}</>}
                </button>
              </form>
            </div>
          )}

          {/* Currency & Pricing */}
          {activeSection === 'currency' && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: 20 }}>
                <div>
                  <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <DollarSign size={20} /> Currency Protection & Dynamic Pricing
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0' }}>
                    Protect your store from currency depreciation by tracking replacement costs and suggested selling prices.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link to="/pricing/rates" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={14} />
                    <span>Manage Rates</span>
                  </Link>
                  <Link to="/pricing/review" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>Price Review</span>
                  </Link>
                </div>
              </div>

              {loadingCurrency ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <div className="spinner" />
                </div>
              ) : (
                <form onSubmit={handleSaveCurrencySettings} className={styles.form}>
                  
                  {/* Enable Switch */}
                  <div
                    style={{
                      background: currencySettings.isEnabled ? '#F0FDF4' : '#F9FAFB',
                      border: currencySettings.isEnabled ? '1.5px solid #86EFAC' : '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '20px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                        Enable Currency Protection
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Tracks replacement cost against active exchange rates and flags products sold below restocking value.
                      </div>
                    </div>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                      <input
                        type="checkbox"
                        checked={currencySettings.isEnabled}
                        onChange={(e) => setCurrencySettings(prev => ({ ...prev, isEnabled: e.target.checked }))}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: currencySettings.isEnabled ? 'var(--green-primary)' : '#CBD5E1',
                          borderRadius: '26px',
                          transition: '0.3s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            content: '""',
                            height: '20px',
                            width: '20px',
                            left: currencySettings.isEnabled ? '24px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s',
                          }}
                        />
                      </span>
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    {/* Base Currency */}
                    <div className="form-group">
                      <label className="form-label">
                        Base / Purchase Reference Currency
                      </label>
                      <select
                        className="form-input"
                        value={currencySettings.baseCurrency}
                        onChange={(e) => setCurrencySettings(prev => ({ ...prev, baseCurrency: e.target.value }))}
                      >
                        {SUPPORTED_CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name} ({c.symbol})
                          </option>
                        ))}
                      </select>
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        The reference currency used when purchasing wholesale inventory (e.g. USD).
                      </small>
                    </div>

                    {/* Selling Currency */}
                    <div className="form-group">
                      <label className="form-label">
                        Local / Selling Currency
                      </label>
                      <select
                        className="form-input"
                        value={currencySettings.sellingCurrency}
                        onChange={(e) => setCurrencySettings(prev => ({ ...prev, sellingCurrency: e.target.value }))}
                      >
                        {SUPPORTED_CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name} ({c.symbol})
                          </option>
                        ))}
                      </select>
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        The local currency your shop charges customers at the counter (e.g. SSP, RWF).
                      </small>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    {/* Exchange Rate Mode */}
                    <div className="form-group">
                      <label className="form-label">Exchange Rate Mode</label>
                      <select
                        className="form-input"
                        value={currencySettings.exchangeRateMode}
                        onChange={(e) => setCurrencySettings(prev => ({ ...prev, exchangeRateMode: e.target.value }))}
                      >
                        <option value="manual">Manual Rate Entry (Business Controlled)</option>
                        <option value="automatic">Automatic Reference Rate</option>
                      </select>
                    </div>

                    {/* Rate Source */}
                    <div className="form-group">
                      <label className="form-label">Default Rate Source</label>
                      <select
                        className="form-input"
                        value={currencySettings.rateSource}
                        onChange={(e) => setCurrencySettings(prev => ({ ...prev, rateSource: e.target.value }))}
                      >
                        <option value="manual">Manual Entry / Bureau</option>
                        <option value="supplier">Supplier Invoiced Rate</option>
                        <option value="api">Bank / Reference API Rate</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    {/* Rounding Rule */}
                    <div className="form-group">
                      <label className="form-label">Suggested Price Rounding Rule</label>
                      <select
                        className="form-input"
                        value={currencySettings.roundingRule}
                        onChange={(e) => setCurrencySettings(prev => ({ ...prev, roundingRule: e.target.value }))}
                      >
                        {ROUNDING_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Min Protection Margin */}
                    <div className="form-group">
                      <label className="form-label">
                        Minimum Safety Buffer Margin (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-input"
                        placeholder="e.g. 10"
                        value={currencySettings.minProtectionMargin}
                        onChange={(e) => setCurrencySettings(prev => ({ ...prev, minProtectionMargin: parseFloat(e.target.value) || 0 }))}
                      />
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        Triggers price review alert if selling price drops below replacement cost + this safety margin.
                      </small>
                    </div>
                  </div>

                  <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    🛡️ <strong>Safety Guarantee:</strong> Duka Profit will never update customer-facing selling prices automatically. Suggested prices generated from exchange rate changes must always be reviewed and approved by you.
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={savingCurrency}>
                    {savingCurrency ? 'Saving...' : <><Save size={16} style={{ marginRight: 6 }} /> Save Currency Settings</>}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Receipts */}
          {activeSection === 'receipts' && (
            <div className="card">
              <h2 className={styles.sectionTitle} style={{display:'flex',alignItems:'center',gap:8}}><Receipt size={20} /> Receipt Customization</h2>
              <p style={{color:'var(--text-muted)',fontSize:14,marginBottom:20}}>
                Customize your receipt header, footer, and store name. These will appear on all printed receipts.
              </p>
              <form onSubmit={saveProfile} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">Store Name</label>
                  <input
                    className="form-input"
                    value={profile.storeName}
                    onChange={e => setProfile(prev => ({...prev, storeName: e.target.value}))}
                    placeholder="Your Store Name"
                    maxLength={100}
                  />
                  <span className="form-hint">Maximum 100 characters</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Receipt Header</label>
                  <textarea
                    className="form-input"
                    value={profile.receiptHeader}
                    onChange={e => setProfile(prev => ({...prev, receiptHeader: e.target.value}))}
                    placeholder="Thank you for shopping with us!"
                    rows={3}
                    maxLength={500}
                    style={{resize: 'vertical'}}
                  />
                  <span className="form-hint">Maximum 500 characters</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Receipt Footer</label>
                  <textarea
                    className="form-input"
                    value={profile.receiptFooter}
                    onChange={e => setProfile(prev => ({...prev, receiptFooter: e.target.value}))}
                    placeholder="Thank you for your business!"
                    rows={3}
                    maxLength={500}
                    style={{resize: 'vertical'}}
                  />
                  <span className="form-hint">Maximum 500 characters</span>
                </div>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? '...' : <><Save size={16} style={{marginRight:6}} /> Save Receipt Settings</>}
                </button>
              </form>
            </div>
          )}

          {/* Language */}
          {activeSection === 'language' && (
            <div className="card">
              <h2 className={styles.sectionTitle} style={{display:'flex',alignItems:'center',gap:8}}><Globe size={20} /> {t('language')}</h2>
              <p style={{color:'var(--text-muted)',fontSize:14,marginBottom:20}}>
                Choose your preferred language. The app will update immediately.
              </p>
              <div className={styles.languageGrid}>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    className={`${styles.langCard} ${i18n.language === lang.code ? styles.langCardActive : ''}`}
                    onClick={() => changeLanguage(lang.code)}
                  >
                    <span className={styles.langFlag}>{lang.flag}</span>
                    <span className={styles.langName}>{lang.native}</span>
                    <span className={styles.langLabel}>{lang.label}</span>
                    {i18n.language === lang.code && (
                      <span className={styles.langCheck} style={{ display: 'flex', alignItems: 'center' }}><Check size={16} /></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <div className="card">
              <h2 className={styles.sectionTitle} style={{display:'flex',alignItems:'center',gap:8}}><Lock size={20} /> Change Password</h2>
              <form onSubmit={savePassword} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwords.current}
                    onChange={e => setPasswords(prev => ({...prev, current: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwords.newPass}
                    onChange={e => setPasswords(prev => ({...prev, newPass: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <span className="form-hint">At least 6 characters</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwords.confirm}
                    onChange={e => setPasswords(prev => ({...prev, confirm: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  {savingPassword ? '...' : <><Lock size={16} style={{marginRight:6}} /> Change Password</>}
                </button>
              </form>
            </div>
          )}

          {/* Subscription & Billing */}
          {(activeSection === 'subscription' || activeSection === 'license') && (() => {
            const isLicenseActive = user?.role === 'admin' || user?.licenseStatus === 'active' || user?.subscription?.isEntitled || user?.subscriptionStatus === 'ACTIVE';
            const daysRemaining = user?.subscription?.daysRemaining ?? (isLicenseActive ? 30 : 0);
            const planName = user?.role === 'admin' ? 'Administrator' : user?.subscription?.plan?.name || (isLicenseActive ? 'Pro Plan' : 'Free Starter');

            return (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <Crown size={22} color="var(--green-primary)" /> Subscription & Billing
                  </h2>
                  <Link to="/pricing" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <Sparkles size={14} /> Upgrade / Change Plan
                  </Link>
                </div>

                <div className={styles.licenseInfo}>
                  <div className={styles.licenseStatus}>
                    <span style={{ fontSize: 48, color: isLicenseActive ? 'var(--green-primary)' : '#EAB308' }}>
                      {isLicenseActive ? <CheckCircle size={48} /> : <AlertTriangle size={48} />}
                    </span>
                    <div>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: isLicenseActive ? 'var(--green-primary)' : '#EAB308', margin: '0 0 4px 0' }}>
                        {user?.role === 'admin' ? 'Administrator Access' : isLicenseActive ? 'Active Subscription' : 'Free Starter Tier'}
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                        {user?.role === 'admin'
                          ? 'All features unlocked under Administrator role'
                          : isLicenseActive
                          ? `Full access active. ${daysRemaining > 0 ? `${daysRemaining} day(s) remaining.` : ''}`
                          : 'POS Checkout and Stock-In Scanner are locked. Upgrade to unlock.'}
                      </p>
                    </div>
                  </div>

                  <div className={styles.licenseDetails}>
                    <LicenseRow label="Current Plan" value={planName} />
                    <LicenseRow label="Registered Email" value={user?.email} />
                    {user?.phone && <LicenseRow label="Mobile Money Phone" value={user?.phone} />}
                    {user?.subscription?.endDate && (
                      <LicenseRow label="Renews / Expires" value={formatDate(user.subscription.endDate)} />
                    )}
                  </div>

                  <div className="divider" style={{ margin: '24px 0' }} />

                  {/* Legacy license card redemption */}
                  <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Key size={16} /> Have a physical scratch card or license key?
                    </h4>
                    <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                      Enter your legacy card key to instantly link and activate your Duka Profit Pro subscription.
                    </p>

                    <form onSubmit={handleActivateUserLicense} style={{ display: 'flex', gap: '10px', maxWidth: '500px', width: '100%' }}>
                      <input
                        className="form-input"
                        type="text"
                        value={newLicenseKey}
                        onChange={(e) => setNewLicenseKey(e.target.value)}
                        placeholder="DUKA-XXXX-XXXX-XXXX"
                        autoComplete="off"
                        disabled={activatingLicense}
                        style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      />
                      <button type="submit" className="btn btn-secondary" disabled={activatingLicense} style={{ flexShrink: 0 }}>
                        {activatingLicense ? 'Activating...' : 'Redeem Key'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* About */}
          {activeSection === 'about' && (
            <div className="card">
              <h2 className={styles.sectionTitle} style={{display:'flex',alignItems:'center',gap:8}}><Info size={20} /> About Duka Profit</h2>
              <div className={styles.aboutSection}>
                <div style={{textAlign:'center',padding:'20px 0'}}>
                  <div style={{fontSize:64,marginBottom:12,color:'var(--green-primary)'}}><DollarSign size={64} /></div>
                  <h3 style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:800,color:'var(--green-primary)'}}>Duka Profit</h3>
                  <p style={{color:'var(--text-muted)',marginTop:4}}>Profit Tracker for East African Businesses</p>
                </div>
                <div className="divider"/>
                <div className={styles.aboutRows}>
                  <AboutRow label={t('version')} value="1.0.0" />
                  <AboutRow label="Built for" value="Rwanda, East Africa" />
                  <AboutRow label="Offline Support" value="Full offline mode" />
                  <AboutRow label="Languages" value="English, Kinyarwanda, Swahili, French" />
                </div>
                <div className="divider"/>
                <p style={{textAlign:'center',color:'var(--text-muted)',fontSize:13}}>
                  Made with love for African small business owners
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LicenseRow({ label, value }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
      <span style={{fontSize:14,color:'var(--text-muted)',fontWeight:600}}>{label}</span>
      <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14,color:'var(--text)'}}>{value}</span>
    </div>
  );
}

function AboutRow({ label, value }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
      <span style={{fontSize:14,color:'var(--text-muted)'}}>{label}</span>
      <span style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:14}}>{value}</span>
    </div>
  );
}
