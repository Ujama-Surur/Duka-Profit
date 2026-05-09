import React from 'react';
import { useTranslation } from 'react-i18next';

const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action, 
  onAction,
  size = 'medium' 
}) => {
  const { t } = useTranslation();

  const sizeStyles = {
    small: { padding: '32px', iconSize: 40 },
    medium: { padding: '48px', iconSize: 56 },
    large: { padding: '64px', iconSize: 72 }
  };

  const currentSize = sizeStyles[size] || sizeStyles.medium;

  return (
    <div 
      className="empty-state" 
      style={{
        padding: currentSize.padding,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      role="status"
      aria-live="polite"
    >
      <div 
        style={{
          fontSize: `${currentSize.iconSize}px`,
          marginBottom: '16px',
          opacity: 0.7,
          lineHeight: 1
        }}
      >
        {icon}
      </div>
      
      <h3 
        style={{
          fontSize: '18px',
          fontWeight: '700',
          marginBottom: '8px',
          color: 'var(--text)'
        }}
      >
        {title}
      </h3>
      
      <p 
        style={{
          fontSize: '14px',
          color: 'var(--text-muted)',
          marginBottom: '24px',
          lineHeight: '1.5',
          maxWidth: '300px'
        }}
      >
        {description}
      </p>
      
      {action && onAction && (
        <button
          onClick={onAction}
          className="btn btn-primary"
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
