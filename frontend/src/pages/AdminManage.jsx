import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../utils/api';

const AdminManage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [stats, setStats] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({});

  // Fetch data based on active tab
  useEffect(() => {
    fetchData();
  }, [activeTab, searchTerm, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = `/admin/${activeTab}`;
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (filters.status) params.append('status', filters.status);
      if (filters.plan) params.append('plan', filters.plan);
      
      const response = await api.get(`${endpoint}?${params}`);
      setData(response.data[activeTab] || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error(t('admin.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Fetch stats error:', error);
      toast.error(t('admin.statsError'));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleUserAction = async (userId, action) => {
    try {
      const endpoint = `/admin/users/${userId}/${action}`;
      await api.put(endpoint);
      toast.success(t(`admin.${action}Success`));
      fetchData();
    } catch (error) {
      console.error('User action error:', error);
      toast.error(t(`admin.${action}Error`));
    }
  };

  const renderUsers = () => (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>{t('admin.users')}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">{t('admin.allStatus')}</option>
            <option value="active">{t('admin.active')}</option>
            <option value="inactive">{t('admin.inactive')}</option>
          </select>
          <input
            type="text"
            placeholder={t('admin.searchUsers')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                {t('admin.name')}
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                {t('admin.email')}
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                {t('admin.status')}
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                {t('admin.createdAt')}
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                {t('admin.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{user.name}</td>
                <td style={{ padding: '12px' }}>{user.email}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: user.isActive ? '#10b981' : '#ef4444',
                    color: 'white'
                  }}>
                    {user.isActive ? t('admin.active') : t('admin.inactive')}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {user.isActive ? (
                      <button
                        onClick={() => handleUserAction(user.id, 'deactivate')}
                        style={{
                          padding: '4px 8px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {t('admin.deactivate')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUserAction(user.id, 'activate')}
                        style={{
                          padding: '4px 8px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {t('admin.activate')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginTop: '20px'
        }}>
          <button
            disabled={!pagination.hasPrev}
            onClick={() => fetchData(pagination.current - 1)}
            style={{
              padding: '8px 16px',
              background: pagination.hasPrev ? '#3b82f6' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: pagination.hasPrev ? 'pointer' : 'not-allowed'
            }}
          >
            {t('admin.previous')}
          </button>
          <span style={{ padding: '8px' }}>
            {pagination.current} / {pagination.pages}
          </span>
          <button
            disabled={!pagination.hasNext}
            onClick={() => fetchData(pagination.current + 1)}
            style={{
              padding: '8px 16px',
              background: pagination.hasNext ? '#3b82f6' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: pagination.hasNext ? 'pointer' : 'not-allowed'
            }}
          >
            {t('admin.next')}
          </button>
        </div>
      )}
    </div>
  );

  const renderStats = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    }}>
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#3b82f6' }}>
          {t('admin.userStats')}
        </h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('admin.totalUsers')}:</span>
            <strong>{stats.users?.total || 0}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('admin.activeUsers')}:</span>
            <strong style={{ color: '#10b981' }}>{stats.users?.active || 0}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('admin.newThisMonth')}:</span>
            <strong style={{ color: '#3b82f6' }}>{stats.users?.newThisMonth || 0}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
          {t('admin.dashboard')}
        </h1>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '10px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['users', 'stats'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                background: activeTab === tab ? '#3b82f6' : 'transparent',
                color: activeTab === tab ? 'white' : '#3b82f6',
                border: activeTab === tab ? 'none' : '1px solid #3b82f6',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {t(`admin.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          fontSize: '16px'
        }}>
          {t('admin.loading')}
        </div>
      ) : (
        <>
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'users' && renderUsers()}
        </>
      )}


    </div>
  );
};

export default AdminManage;
