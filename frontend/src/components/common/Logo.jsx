import React from 'react';
import logoImg from '../../assets/logo.jpeg';
import styles from './Logo.module.css';

/**
 * Logo component to be used throughout the application.
 */
const Logo = ({ size = 'medium', className = '', showText = false }) => {
  const logoClasses = `${styles.logo} ${styles[size]} ${className}`;

  return (
    <div className={logoClasses}>
      <img src={logoImg} alt="Duka Profit" className={styles.logoImage} />
      
      {/* <span className={styles.logoIcon}>💰</span> */}
      
      {showText && <span className={styles.logoText}>Duka Profit</span>}
    </div>
  );
};

export default Logo;
