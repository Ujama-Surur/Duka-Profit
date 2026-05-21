import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Bell, AlertTriangle, Zap, Package, Clock, Ban, Megaphone, PartyPopper } from 'lucide-react';

const NotificationsSimple = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.log('🔔 Simple Notifications component mounted');
    loadNotifications();
    // Check notifications every 5 minutes
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      console.log('🔔 Loading notifications...');
      const { data } = await api.get('/notifications/alerts');
      console.log('🔔 Notifications data:', data);
      setAlerts(data.alerts || []);
      
      // Show toast notifications for critical alerts
      if (data.alerts) {
        data.alerts.forEach(alert => {
          if (alert.severity === 'critical') {
            toast.error(alert.message, {
              duration: 5000,
              icon: <AlertTriangle size={18} color="#EF4444" />
            });
          } else if (alert.severity === 'warning') {
            toast(alert.message, {
              duration: 4000,
              icon: <Zap size={18} color="#FACC15" />
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (type) => {
    switch (type) {
      case 'low_stock': return <Package size={18} />;
      case 'expiring': return <Clock size={18} />;
      case 'expired': return <Ban size={18} style={{ color: 'var(--red)' }} />;
      default: return <Megaphone size={18} />;
    }
  };

  const handleBellClick = () => {
    console.log('🔔 Bell clicked, current state:', showDetails);
    setShowDetails(!showDetails);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowDetails(false);
    }
  };

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div 
          style={{
            position: 'relative',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: showDetails ? 'var(--bg)' : 'transparent',
            border: showDetails ? '1px solid var(--border)' : 'none'
          }}
          onClick={handleBellClick}
          title="Notifications"
        >
          <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}><Bell size={20} /></span>
          {alerts.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'var(--red)',
              color: 'white',
              fontSize: '10px',
              fontWeight: '600',
              padding: '2px 5px',
              borderRadius: '50%',
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '1'
            }}>
              {alerts.length}
            </span>
          )}
        </div>
      </div>

      {showDetails && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              zIndex: 999
            }}
            onClick={handleBackdropClick}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            width: '90%',
            maxWidth: '400px',
            maxHeight: '70vh',
            overflow: 'hidden',
            zIndex: 1000
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
                Notifications
              </h3>
              <button 
                onClick={() => setShowDetails(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'var(--border)'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                ×
              </button>
            </div>

            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {alerts.length === 0 ? (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}>
                  <div style={{ color: 'var(--green-primary)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><PartyPopper size={48} /></div>
                  <p style={{ margin: 0, fontSize: '14px' }}>No notifications</p>
                </div>
              ) : (
                alerts.map((alert, index) => (
                  <div 
                    key={index} 
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border)',
                      transition: 'all 0.2s',
                      borderLeft: `4px solid ${alert.severity === 'critical' ? 'var(--red)' : 'var(--yellow-primary)'}`,
                      backgroundColor: index % 2 === 0 ? 'var(--bg)' : 'transparent'
                    }}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>
                          {getSeverityIcon(alert.type)}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            color: 'var(--text)', 
                            lineHeight: '1.4',
                            margin: '0 0 8px 0'
                          }}>
                            {alert.message}
                          </p>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            fontWeight: '500',
                            padding: '4px 8px',
                            background: alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {alert.severity === 'critical' ? 'Critical' : 'Warning'}
                          </span>
                        </div>
                      </div>
                      
                      {alert.products && alert.products.length > 0 && (
                        <div style={{ marginTop: '12px', paddingLeft: '32px' }}>
                          {alert.products.slice(0, 3).map((product, pIndex) => (
                            <div key={pIndex} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '6px 0', 
                              fontSize: '12px',
                              borderBottom: pIndex < Math.min(2, alert.products.length - 1) ? '1px solid var(--border)' : 'none'
                            }}>
                              <span style={{ 
                                color: 'var(--text)', 
                                fontWeight: '500', 
                                flex: 1, 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis' 
                              }}>
                                {product.name}
                              </span>
                              <span style={{ 
                                color: 'var(--text-muted)', 
                                fontWeight: '600', 
                                flexShrink: 0,
                                marginLeft: '8px'
                              }}>
                                {alert.type === 'low_stock' 
                                  ? `${product.currentStock}/${product.threshold} left`
                                  : alert.type === 'expiring'
                                  ? `${product.daysUntil} days left`
                                  : 'Expired'
                                }
                              </span>
                            </div>
                          ))}
                          {alert.products.length > 3 && (
                            <div style={{ 
                              fontSize: '12px', 
                              color: 'var(--text-muted)', 
                              fontStyle: 'italic', 
                              padding: '8px 0 0 0',
                              textAlign: 'center'
                            }}>
                              +{alert.products.length - 3} more items
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {alerts.length > 0 && (
              <div style={{ 
                padding: '12px 20px', 
                borderTop: '1px solid var(--border)', 
                background: 'var(--bg)',
                textAlign: 'center'
              }}>
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    navigate('/products');
                    setShowDetails(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}
                >
                  View Products →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default NotificationsSimple;
