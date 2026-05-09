import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../utils/api';
import styles from './Notifications.module.css';

const Notifications = () => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.log('🔔 Notifications component mounted');
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
      setAlerts(data.alerts);
      
      // Show toast notifications for critical alerts
      data.alerts.forEach(alert => {
        if (alert.severity === 'critical') {
          toast.error(alert.message, {
            duration: 5000,
            icon: '⚠️'
          });
        } else if (alert.severity === 'warning') {
          toast(alert.message, {
            duration: 4000,
            icon: '⚡'
          });
        }
      });
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'var(--red)';
      case 'warning': return 'var(--yellow-primary)';
      default: return 'var(--text-muted)';
    }
  };

  const getSeverityIcon = (type) => {
    switch (type) {
      case 'low_stock': return '📦';
      case 'expiring': return '⏰';
      case 'expired': return '🚫';
      default: return '📢';
    }
  };

  if (loading) {
    return (
      <div className={styles.notificationsContainer}>
        <div className={styles.notificationBell}>
          <span style={{ fontSize: '20px' }}>🔔</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.notificationsContainer}>
      <div className={styles.notificationBell} onClick={() => setShowDetails(!showDetails)}>
        <span style={{ fontSize: '20px' }}>🔔</span>
        {alerts.length > 0 && (
          <span className={styles.notificationBadge}>{alerts.length}</span>
        )}
      </div>

      {showDetails && (
        <div className={styles.notificationDropdown}>
          <div className={styles.notificationHeader}>
            <h3>Notifications</h3>
            <button 
              onClick={() => setShowDetails(false)}
              className={styles.closeButton}
            >
              ×
            </button>
          </div>

          <div className={styles.notificationList}>
            {alerts.map((alert, index) => (
              <div 
                key={index} 
                className={`${styles.notificationItem} ${styles[alert.severity]}`}
                style={{ borderLeft: `4px solid ${getSeverityColor(alert.severity)}` }}
              >
                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeaderRow}>
                    <span className={styles.notificationIcon}>
                      {getSeverityIcon(alert.type)}
                    </span>
                    <span className={styles.notificationMessage}>
                      {alert.message}
                    </span>
                  </div>
                  
                  {alert.products && alert.products.length > 0 && (
                    <div className={styles.productList}>
                      {alert.products.slice(0, 3).map((product, pIndex) => (
                        <div key={pIndex} className={styles.productItem}>
                          <span className={styles.productName}>
                            {product.name}
                          </span>
                          <span className={styles.productDetail}>
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
                        <div className={styles.moreProducts}>
                          +{alert.products.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {alerts.length > 0 && (
            <div className={styles.notificationFooter}>
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  // Navigate to relevant page based on alert type
                  const firstAlert = alerts[0];
                  if (firstAlert.type === 'low_stock' || firstAlert.type === 'expiring') {
                    window.location.href = '/products';
                  }
                }}
              >
                View Details →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
