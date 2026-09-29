import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate } from '../utils/api';
import styles from './Admin.module.css';
import { Lock, BarChart3, Key, Users, TrendingUp, Coins, CreditCard, Crown, Sparkles, Clock, Eye, Check, Copy } from 'lucide-react';

export default function Admin() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [licenses, setLicenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // SaaS Billing State
  const [billingOverview, setBillingOverview] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [extendingId, setExtendingId] = useState(null);

  // Manual Payments State
  const [manualPayments, setManualPayments] = useState([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [manualStatusFilter, setManualStatusFilter] = useState('pending');
  const [confirmApproveModal, setConfirmApproveModal] = useState(null);
  const [confirmRejectModal, setConfirmRejectModal] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [previewScreenshot, setPreviewScreenshot] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // License generation state
  const [licenseForm, setLicenseForm] = useState({
    type: 'standard',
    expiresInDays: 365
  });
  const [generatingLicense, setGeneratingLicense] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, licensesRes, usersRes, billingRes, subsRes, paymentsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/licenses'),
        api.get('/admin/users'),
        api.get('/admin/billing/overview').catch(() => ({ data: null })),
        api.get('/admin/subscriptions').catch(() => ({ data: { subscriptions: [] } })),
        api.get(`/admin/payments?status=${manualStatusFilter}`).catch(() => ({ data: { payments: [], requests: [], pendingCount: 0 } })),
      ]);
      
      setStats(statsRes.data);
      setLicenses(licensesRes.data.licenses || []);
      setUsers(usersRes.data.users || []);
      if (billingRes.data) setBillingOverview(billingRes.data);
      if (subsRes.data?.subscriptions) setSubscriptions(subsRes.data.subscriptions);
      if (paymentsRes.data?.payments) setPayments(paymentsRes.data.payments);
      if (Array.isArray(paymentsRes.data?.requests)) {
        setManualPayments(paymentsRes.data.requests);
      }
      if (typeof paymentsRes.data?.pendingCount === 'number') {
        setPendingPaymentsCount(paymentsRes.data.pendingCount);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadManualPayments = async (status = manualStatusFilter) => {
    try {
      const { data } = await api.get(`/admin/payments?status=${status}`);
      if (Array.isArray(data?.requests)) {
        setManualPayments(data.requests);
      }
      if (typeof data?.pendingCount === 'number') {
        setPendingPaymentsCount(data.pendingCount);
      }
    } catch (err) {
      console.error('Failed to load manual payments:', err);
    }
  };

  const handleApprove = async () => {
    if (!confirmApproveModal) return;
    setActionLoading(true);
    try {
      const { data } = await api.patch(`/admin/payments/${confirmApproveModal._id}/approve`);
      toast.success(data.message || 'Payment approved and license key issued! 🎉');
      setConfirmApproveModal(null);
      await loadManualPayments(manualStatusFilter);
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirmRejectModal) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/payments/${confirmRejectModal._id}/reject`, {
        reason: rejectReasonInput,
      });
      toast.success('Payment request marked as rejected.');
      setConfirmRejectModal(null);
      setRejectReasonInput('');
      await loadManualPayments(manualStatusFilter);
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject payment');
    } finally {
      setActionLoading(false);
    }
  };
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { isActive: !currentStatus });
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u));
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will also delete all their products and sales data.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted successfully');
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const generateLicense = async () => {
    setGeneratingLicense(true);
    try {
      const { data } = await api.post('/license/create', licenseForm);
      toast.success(`License key generated: ${data.key}`);
      setLicenses(prev => [data, ...prev]);
      
      // Reset form
      setLicenseForm({ type: 'standard', expiresInDays: 365 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate license');
    } finally {
      setGeneratingLicense(false);
    }
  };
  const updateLicenseStatus = async (licenseId, newStatus) => {
    try {
      await api.put(`/admin/licenses/${licenseId}/status`, { status: newStatus });
      toast.success(`License status updated to ${newStatus}`);
      setLicenses(prev => prev.map(l => l._id === licenseId ? { ...l, status: newStatus } : l));
    } catch (err) {
      toast.error('Failed to update license status');
    }
  };

  const filteredLicenses = licenses.filter(license => {
    const matchesSearch = license.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || license.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleExtendSubscription = async (subscriptionId, days = 30) => {
    setExtendingId(subscriptionId);
    try {
      const { data } = await api.post(`/admin/subscriptions/${subscriptionId}/extend`, { days });
      toast.success(data.message || `Extended subscription by ${days} days`);
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to extend subscription');
    } finally {
      setExtendingId(null);
    }
  };

  const handleSuspendSubscription = async (subscriptionId) => {
    if (!window.confirm('Are you sure you want to suspend this subscription? The user will immediately lose access.')) return;
    try {
      const { data } = await api.post(`/admin/subscriptions/${subscriptionId}/suspend`);
      toast.success(data.message || 'Subscription suspended');
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to suspend subscription');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.adminHeader}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Lock size={28} /> Admin Dashboard</h1>
        <div className={styles.headerStats}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{stats.totalUsers || 0}</span>
            <span className={styles.statLabel}>Total Users</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{stats.totalLicenses || 0}</span>
            <span className={styles.statLabel}>Total Licenses</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{stats.activeLicenses || 0}</span>
            <span className={styles.statLabel}>Active Licenses</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber} style={{ color: pendingPaymentsCount > 0 ? '#EF4444' : 'inherit' }}>
              {pendingPaymentsCount}
            </span>
            <span className={styles.statLabel}>Pending MoMo</span>
          </div>
        </div>
      </div>

      <div className={styles.adminTabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><BarChart3 size={16} /> Overview</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'manualPayments' ? styles.active : ''}`}
          onClick={() => {
            setActiveTab('manualPayments');
            loadManualPayments(manualStatusFilter);
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CreditCard size={16} /> Manual Payments
            {pendingPaymentsCount > 0 && (
              <span
                style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {pendingPaymentsCount}
              </span>
            )}
          </span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'licenses' ? styles.active : ''}`}
          onClick={() => setActiveTab('licenses')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Key size={16} /> License Management</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Users size={16} /> User Management</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'billing' ? styles.active : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Coins size={16} /> SaaS Billing</span>
        </button>
      </div>

      <div className={styles.adminContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewSection}>
            <h2>System Overview</h2>
            <div className={styles.grid}>
              <div className={styles.card}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={18} /> Recent Activity</h3>
                <div className={styles.activityList}>
                  {stats.recentActivity?.map((activity, i) => (
                    <div key={i} className={styles.activityItem}>
                      <span>{activity.type}</span>
                      <span>{formatDate(activity.date)}</span>
                    </div>
                  )) || <p>No recent activity</p>}
                </div>
              </div>
              
              <div className={styles.card}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Coins size={18} /> Revenue Overview</h3>
                <div className={styles.revenueStats}>
                  <div className={styles.revenueItem}>
                    <span className={styles.revenueLabel}>Today</span>
                    <span className={styles.revenueAmount}>{formatCurrency(stats.revenue?.today || 0)}</span>
                  </div>
                  <div className={styles.revenueItem}>
                    <span className={styles.revenueLabel}>This Week</span>
                    <span className={styles.revenueAmount}>{formatCurrency(stats.revenue?.week || 0)}</span>
                  </div>
                  <div className={styles.revenueItem}>
                    <span className={styles.revenueLabel}>This Month</span>
                    <span className={styles.revenueAmount}>{formatCurrency(stats.revenue?.month || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'licenses' && (
          <div className={styles.licenseSection}>
            <div className={styles.licenseHeader}>
              <h2>License Management</h2>
              <div className={styles.licenseGenerator}>
                <h3>Generate New License</h3>
                <div className={styles.generatorForm}>
                  <select
                    value={licenseForm.type}
                    onChange={(e) => setLicenseForm(prev => ({...prev, type: e.target.value}))}
                    className="form-input"
                  >
                    <option value="trial">Trial</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Expires in days"
                    value={licenseForm.expiresInDays}
                    onChange={(e) => setLicenseForm(prev => ({...prev, expiresInDays: e.target.value}))}
                    className="form-input"
                    min="1"
                  />
                  <button
                    onClick={generateLicense}
                    disabled={generatingLicense}
                    className="btn btn-primary"
                  >
                    {generatingLicense ? 'Generating...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Key size={16} /> Generate License</span>}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.licenseFilters}>
              <input
                type="text"
                placeholder="Search licenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-input"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="used">Used</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className={styles.licenseTable}>
              <table>
                <thead>
                  <tr>
                    <th>License Key</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Expires</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLicenses.map((license) => (
                    <tr key={license._id}>
                      <td className={styles.licenseKey}>{license.key}</td>
                      <td>
                        <span className={`${styles.licenseType} ${styles[license.type]}`}>
                          {license.type}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.status} ${styles[license.status]}`}>
                          {license.status}
                        </span>
                      </td>
                      <td>{license.assignedTo?.email || 'Unassigned'}</td>
                      <td>{formatDate(license.expiresAt)}</td>
                      <td>{formatDate(license.createdAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => updateLicenseStatus(license._id, license.status === 'suspended' ? 'active' : 'suspended')}
                          >
                            {license.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLicenses.length === 0 && (
                <div className={styles.noResults}>
                  <p>No licenses found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className={styles.userSection}>
            <h2>User Management</h2>
            <div className={styles.userTable}>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>License</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.licenseKey || 'No License'}</td>
                      <td>
                        <span className={`${styles.status} ${styles[user.isActive ? 'active' : 'inactive']}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button 
                            className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-primary'}`}
                            onClick={() => toggleUserStatus(user._id, user.isActive)}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            style={{ background: '#EF4444', borderColor: '#EF4444' }}
                            onClick={() => deleteUser(user._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className={styles.billingSection}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>
                  {billingOverview?.revenue?.total ? `${billingOverview.revenue.total.toLocaleString()} RWF` : '0 RWF'}
                </span>
                <span className={styles.statLabel}>Total SaaS Revenue</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>
                  {billingOverview?.revenue?.monthly ? `${billingOverview.revenue.monthly.toLocaleString()} RWF` : '0 RWF'}
                </span>
                <span className={styles.statLabel}>30-Day Revenue</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{billingOverview?.subscriptions?.active ?? 0}</span>
                <span className={styles.statLabel}>Active Subscriptions</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{billingOverview?.subscriptions?.expired ?? 0}</span>
                <span className={styles.statLabel}>Expired / In Grace</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{billingOverview?.payments?.success ?? 0}</span>
                <span className={styles.statLabel}>Completed Payments</span>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={20} style={{ color: '#F59E0B' }} /> Customer Subscriptions
              </h2>
              <div className={styles.licenseTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Current Plan</th>
                      <th>Status</th>
                      <th>Valid Until</th>
                      <th>Source</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.length > 0 ? (
                      subscriptions.map((sub) => {
                        const isExpired = new Date(sub.endDate) < new Date();
                        const statusClass = sub.status === 'ACTIVE' && !isExpired
                          ? styles.active
                          : sub.status === 'ACTIVE' && isExpired
                          ? styles.suspended
                          : sub.status === 'SUSPENDED'
                          ? styles.expired
                          : styles.inactive;

                        return (
                          <tr key={sub._id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{sub.userId?.name || 'Customer'}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sub.userId?.email || 'N/A'}</div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{sub.planId?.name || 'Starter Plan'}</span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {sub.planId?.price ? `${sub.planId.price.toLocaleString()} RWF` : 'Free'}
                              </div>
                            </td>
                            <td>
                              <span className={`${styles.status} ${statusClass}`}>
                                {isExpired && sub.status === 'ACTIVE' ? 'GRACE PERIOD' : sub.status}
                              </span>
                            </td>
                            <td>
                              <div>{formatDate(sub.endDate)}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {isExpired ? 'Expired' : `${Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} days left`}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                {sub.source || 'GATEWAY'}
                              </span>
                            </td>
                            <td>
                              <div className={styles.actions}>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleExtendSubscription(sub._id, 30)}
                                  disabled={extendingId === sub._id}
                                  title="Add 30 days to this customer subscription"
                                >
                                  {extendingId === sub._id ? 'Extending...' : '+30 Days'}
                                </button>
                                {sub.status !== 'SUSPENDED' && (
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleSuspendSubscription(sub._id)}
                                    title="Suspend customer access immediately"
                                  >
                                    Suspend
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No customer subscriptions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments & Transactions Log */}
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} style={{ color: '#10B981' }} /> SaaS Payment Transactions
              </h2>
              <div className={styles.licenseTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Provider / Method</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length > 0 ? (
                      payments.map((p) => {
                        const statusClass = p.status === 'SUCCESS'
                          ? styles.active
                          : p.status === 'PENDING'
                          ? styles.trial
                          : styles.expired;

                        return (
                          <tr key={p._id}>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>
                              {p.transactionReference}
                            </td>
                            <td>
                              <div>{p.userId?.name || p.customerEmail || 'Anonymous'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.userId?.email || p.customerEmail}</div>
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                              {p.amount ? p.amount.toLocaleString() : 0} {p.currency || 'RWF'}
                            </td>
                            <td>
                              <span>{p.provider}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                ({p.paymentMethod || 'MoMo / Card'})
                              </span>
                            </td>
                            <td>
                              <span className={`${styles.status} ${statusClass}`}>
                                {p.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>
                              {formatDate(p.createdAt)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No payments recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Manual Mobile Money Payments Section */}
        {activeTab === 'manualPayments' && (
          <div className={styles.licenseSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Manual Mobile Money Payments</h2>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '13.5px' }}>
                  Verify customer MTN MoMo and Airtel Money payments against your statement and issue licenses.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div style={{ display: 'flex', gap: 8 }}>
                {['all', 'pending', 'approved', 'rejected'].map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm ${manualStatusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => {
                      setManualStatusFilter(s);
                      loadManualPayments(s);
                    }}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {s} {s === 'pending' && pendingPaymentsCount > 0 ? `(${pendingPaymentsCount})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.licenseTable}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th>Network</th>
                    <th>Transaction ID</th>
                    <th>Ref</th>
                    <th>Amount Paid</th>
                    <th>Receipt</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {manualPayments.length > 0 ? (
                    manualPayments.map((p) => {
                      const isPending = p.status === 'pending';
                      const isApproved = p.status === 'approved';
                      const isRejected = p.status === 'rejected';

                      const statusClass = isApproved
                        ? styles.active
                        : isPending
                        ? styles.trial
                        : styles.expired;

                      return (
                        <tr key={p._id}>
                          <td style={{ fontSize: '0.85rem' }}>{formatDate(p.createdAt)}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.customerName || p.user?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {p.customerPhone || p.user?.phone}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {p.user?.email}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{p.plan}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Exp: {p.amountExpected ? p.amountExpected.toLocaleString() : 0} RWF
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: p.network === 'MTN' ? '#FEF3C7' : '#EFF6FF',
                                color: p.network === 'MTN' ? '#92400E' : '#1E40AF',
                              }}
                            >
                              {p.network}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
                              {p.transactionId}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {p.reference}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: p.amountPaid >= p.amountExpected ? 'var(--green-primary)' : '#DC2626' }}>
                              {p.amountPaid ? p.amountPaid.toLocaleString() : 0} RWF
                            </strong>
                          </td>
                          <td>
                            {p.screenshotUrl ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => setPreviewScreenshot(p.screenshotUrl)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}
                              >
                                <Eye size={13} /> View
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None</span>
                            )}
                          </td>
                          <td>
                            <span className={`${styles.status} ${statusClass}`}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            {isPending ? (
                              <div className={styles.actions}>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => setConfirmApproveModal(p)}
                                  title="Approve and generate license key"
                                  style={{ padding: '4px 8px' }}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => {
                                    setConfirmRejectModal(p);
                                    setRejectReasonInput('');
                                  }}
                                  title="Reject request"
                                  style={{ padding: '4px 8px' }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : isApproved ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#047857' }}>
                                  {p.licenseKey || p.licenseId?.key}
                                </span>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  onClick={() => {
                                    navigator.clipboard.writeText(p.licenseKey || p.licenseId?.key || '');
                                    setCopiedKey(p._id);
                                    setTimeout(() => setCopiedKey(null), 2000);
                                  }}
                                  title="Copy license key"
                                  style={{ padding: '2px 4px' }}
                                >
                                  {copiedKey === p._id ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#EF4444' }} title={p.rejectReason}>
                                {p.rejectReason ? p.rejectReason.slice(0, 18) + '...' : 'Rejected'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No manual payment requests found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      {confirmApproveModal && (
        <div className="modal-overlay" onClick={() => setConfirmApproveModal(null)} role="dialog" aria-modal="true">
          <div className="card" style={{ maxWidth: 460, margin: '40px auto', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>
              Confirm Payment Approval
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Are you sure you verified payment for <strong>{confirmApproveModal.customerName}</strong>?
            </p>
            <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <div>Plan: <strong>{confirmApproveModal.plan} Pro</strong></div>
              <div>Amount: <strong>{confirmApproveModal.amountPaid ? confirmApproveModal.amountPaid.toLocaleString() : 0} RWF</strong> ({confirmApproveModal.network})</div>
              <div>Transaction ID: <strong style={{ fontFamily: 'monospace' }}>{confirmApproveModal.transactionId}</strong></div>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Clicking <strong>Approve & Issue Key</strong> will automatically generate a new cryptographic license key, bind it to this user, and send an email notification.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost btn-full" onClick={() => setConfirmApproveModal(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button className="btn btn-primary btn-full" onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? 'Approving...' : 'Approve & Issue Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {confirmRejectModal && (
        <div className="modal-overlay" onClick={() => setConfirmRejectModal(null)} role="dialog" aria-modal="true">
          <div className="card" style={{ maxWidth: 460, margin: '40px auto', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px', color: '#DC2626' }}>
              Reject Payment Request
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Rejecting request for <strong>{confirmRejectModal.customerName}</strong> (Transaction ID: {confirmRejectModal.transactionId}).
            </p>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Reason for Rejection *</label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="e.g. Transaction ID was not found on our MoMo statement, or amount is incorrect."
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost btn-full" onClick={() => setConfirmRejectModal(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button className="btn btn-danger btn-full" onClick={handleReject} disabled={actionLoading}>
                {actionLoading ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Preview Modal */}
      {previewScreenshot && (
        <div className="modal-overlay" onClick={() => setPreviewScreenshot(null)} role="dialog" aria-modal="true">
          <div className="card" style={{ maxWidth: 600, width: '90%', margin: '40px auto', padding: '16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>Receipt Screenshot</h3>
            <img src={previewScreenshot} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '6px', objectFit: 'contain' }} />
            <div style={{ marginTop: '14px' }}>
              <button className="btn btn-ghost" onClick={() => setPreviewScreenshot(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

