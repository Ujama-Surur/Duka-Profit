import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from './Settings.module.css';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', native: 'English' },
  { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼', native: 'Kinyarwanda' },
  { code: 'sw', label: 'Swahili', flag: '🇹🇿', native: 'Kiswahili' },
  { code: 'fr', label: 'French', flag: '🇫🇷', native: 'Français' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('account');

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('duka_language', code);
    toast.success(`Language changed! 🌍`);
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
      toast.success('Password changed! 🔐');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const SECTIONS = [
    { key: 'account', icon: '👤', label: 'Account' },
    { key: 'language', icon: '🌍', label: t('language') },
    { key: 'security', icon: '🔐', label: 'Security' },
    { key: 'license', icon: '🔑', label: t('license') },
    { key: 'about', icon: 'ℹ️', label: 'About' },
  ];

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1 className="page-title">⚙️ {t('settings')}</h1>
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
              <h2 className={styles.sectionTitle}>👤 Account Details</h2>
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
                  {savingProfile ? '...' : `💾 ${t('saveSettings')}`}
                </button>
              </form>
            </div>
          )}

          {/* Language */}
          {activeSection === 'language' && (
            <div className="card">
              <h2 className={styles.sectionTitle}>🌍 {t('language')}</h2>
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
                      <span className={styles.langCheck}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <div className="card">
              <h2 className={styles.sectionTitle}>🔐 Change Password</h2>
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
                  {savingPassword ? '...' : '🔐 Change Password'}
                </button>
              </form>
            </div>
          )}

          {/* License */}
          {activeSection === 'license' && (
            <div className="card">
              <h2 className={styles.sectionTitle}>🔑 {t('license')}</h2>
              <div className={styles.licenseInfo}>
                <div className={styles.licenseStatus}>
                  <span style={{fontSize:48}}>✅</span>
                  <div>
                    <p style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:20,color:'var(--green-primary)'}}>
                      {t('active')}
                    </p>
                    <p style={{color:'var(--text-muted)',fontSize:14}}>License is valid and active</p>
                  </div>
                </div>
                <div className={styles.licenseDetails}>
                  <LicenseRow label="License Key" value={user?.licenseKey ? `${user.licenseKey.slice(0,12)}****` : 'N/A'} />
                  <LicenseRow label={t('deviceId')} value={localStorage.getItem('duka_device_id') || 'Detecting...'} />
                  <LicenseRow label="Registered Email" value={user?.email} />
                  <LicenseRow label="Plan" value="Standard — Single Device" />
                </div>
              </div>
            </div>
          )}

          {/* About */}
          {activeSection === 'about' && (
            <div className="card">
              <h2 className={styles.sectionTitle}>ℹ️ About Duka Profit</h2>
              <div className={styles.aboutSection}>
                <div style={{textAlign:'center',padding:'20px 0'}}>
                  <div style={{fontSize:64,marginBottom:12}}>💰</div>
                  <h3 style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:800,color:'var(--green-primary)'}}>Duka Profit</h3>
                  <p style={{color:'var(--text-muted)',marginTop:4}}>Profit Tracker for East African Businesses</p>
                </div>
                <div className="divider"/>
                <div className={styles.aboutRows}>
                  <AboutRow label={t('version')} value="1.0.0" />
                  <AboutRow label="Built for" value="🇷🇼 Rwanda, East Africa" />
                  <AboutRow label="Offline Support" value="✅ Full offline mode" />
                  <AboutRow label="Languages" value="English, Kinyarwanda, Swahili, French" />
                </div>
                <div className="divider"/>
                <p style={{textAlign:'center',color:'var(--text-muted)',fontSize:13}}>
                  Made with 💚 for African small business owners
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
