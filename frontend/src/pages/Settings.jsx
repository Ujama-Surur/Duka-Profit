import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from './Settings.module.css';
import { User, Receipt, Globe, Lock, Key, Info, Save, CheckCircle, DollarSign, Check, AlertTriangle } from 'lucide-react';

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
    { key: 'receipts', icon: <Receipt size={20} />, label: 'Receipts' },
    { key: 'language', icon: <Globe size={20} />, label: t('language') },
    { key: 'security', icon: <Lock size={20} />, label: 'Security' },
    { key: 'license', icon: <Key size={20} />, label: t('license') },
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
    if (tab && SECTIONS.some(s => s.key === tab)) {
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

          {/* License */}
          {activeSection === 'license' && (() => {
            const isLicenseActive = user?.role === 'admin' || user?.licenseStatus === 'active';
            return (
              <div className="card">
                <h2 className={styles.sectionTitle} style={{display:'flex',alignItems:'center',gap:8}}><Key size={20} /> {t('license')}</h2>
                {isLicenseActive ? (
                  <div className={styles.licenseInfo}>
                    <div className={styles.licenseStatus}>
                      <span style={{fontSize:48,color:'var(--green-primary)'}}><CheckCircle size={48} /></span>
                      <div>
                        <p style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:20,color:'var(--green-primary)'}}>
                          {user?.role === 'admin' ? 'Admin Access' : t('active')}
                        </p>
                        <p style={{color:'var(--text-muted)',fontSize:14}}>
                          {user?.role === 'admin' ? 'All features unlocked under Administrator role' : 'Premium license is valid and active'}
                        </p>
                      </div>
                    </div>
                    <div className={styles.licenseDetails}>
                      <LicenseRow label="License Key" value={user?.licenseKey ? `${user.licenseKey.slice(0,12)}****` : 'N/A'} />
                      <LicenseRow label={t('deviceId')} value={localStorage.getItem('duka_device_id') || 'Detecting...'} />
                      <LicenseRow label="Registered Email" value={user?.email} />
                      <LicenseRow label="Plan" value={user?.role === 'admin' ? 'Administrator' : 'Premium — Single Device'} />
                    </div>
                  </div>
                ) : (
                  <div className={styles.licenseInfo}>
                    <div className={styles.licenseStatus} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '20px' }}>
                      <span style={{fontSize:48,color:'#EAB308'}}><AlertTriangle size={48} /></span>
                      <div>
                        <p style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:20,color:'#EAB308'}}>
                          Standard License
                        </p>
                        <p style={{color:'var(--text-muted)',fontSize:14}}>Premium features (POS Checkout & Stock-In Scanner) are locked.</p>
                      </div>
                    </div>

                    <form onSubmit={handleActivateUserLicense} style={{ display: 'grid', gap: '12px', maxWidth: '400px', width: '100%' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: '600', color: 'var(--text)' }}>Enter Premium License Key</label>
                        <input
                          className="form-input"
                          type="text"
                          value={newLicenseKey}
                          onChange={(e) => setNewLicenseKey(e.target.value)}
                          placeholder="DUKA-XXXX-XXXX-XXXX"
                          autoComplete="off"
                          disabled={activatingLicense}
                          style={{ textTransform: 'uppercase' }}
                        />
                        <span className="form-hint">Paste your generated premium key to unlock all POS and scanning features.</span>
                      </div>

                      <button type="submit" className="btn btn-primary" disabled={activatingLicense} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', marginTop: '6px' }}>
                        {activatingLicense ? 'Activating...' : <><Key size={16} /> Activate License</>}
                      </button>
                    </form>

                    <div className="divider" style={{ margin: '24px 0' }} />

                    <div className={styles.licenseDetails}>
                      <LicenseRow label={t('deviceId')} value={localStorage.getItem('duka_device_id') || 'Detecting...'} />
                      <LicenseRow label="Registered Email" value={user?.email} />
                      <LicenseRow label="Plan" value="Standard (Free Trial / Standard)" />
                    </div>
                  </div>
                )}
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
