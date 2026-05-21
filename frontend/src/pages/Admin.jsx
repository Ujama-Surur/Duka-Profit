import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { formatCurrency, formatDate } from '../utils/api';
import styles from './Admin.module.css';
import { Lock, BarChart3, Key, Users, TrendingUp, Coins } from 'lucide-react';

export default function Admin() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [licenses, setLicenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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
      const [statsRes, licensesRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/licenses'),
        api.get('/admin/users')
      ]);
      
      setStats(statsRes.data);
      setLicenses(licensesRes.data.licenses || []);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
      </div>
    </div>
  );
}
