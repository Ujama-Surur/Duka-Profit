import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from '../components/common/Logo';
import styles from './Landing.module.css';

export default function Landing() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');

  const features = [
    {
      icon: '📊',
      title: 'Sales Tracking',
      description: 'Track your daily sales and monitor business performance with real-time analytics.'
    },
    {
      icon: '📦',
      title: 'Inventory Management',
      description: 'Manage your products, track stock levels, and get alerts when items run low.'
    },
    {
      icon: '💰',
      title: 'Profit Analytics',
      description: 'Understand your profit margins and identify your most profitable products.'
    },
    {
      icon: '📱',
      title: 'Mobile Friendly',
      description: 'Access your business data from anywhere with our responsive mobile design.'
    },
    {
      icon: '🔐',
      title: 'Secure Data',
      description: 'Your business data is encrypted and stored securely with regular backups.'
    },
    {
      icon: '⚡',
      title: 'Fast Performance',
      description: 'Lightning-fast interface designed for quick data entry and retrieval.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah M.',
      business: 'Retail Shop Owner',
      content: 'Duka Profit transformed how I manage my small shop. I can now track my sales and inventory in real-time.',
      rating: 5
    },
    {
      name: 'John K.',
      business: 'Electronics Store',
      content: 'The profit analytics helped me identify which products are making the most money. Highly recommended!',
      rating: 5
    },
    {
      name: 'Grace W.',
      business: 'Fashion Boutique',
      content: 'Simple to use and very powerful. My business has grown 30% since I started using Duka Profit.',
      rating: 5
    }
  ];

  return (
    <div className={styles.landingContainer}>
      {/* Header */}
      <header className={styles.header}>
        <nav className={styles.nav}>
          <div className={styles.navBrand}>
            <Logo size="medium" />
          </div>
          <div className={styles.navActions}>
            <Link to="/login" className={styles.btnSecondary}>
              Sign In
            </Link>
            <Link to="/register" className={styles.btnPrimary}>
              Get Started Free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Manage Your Small Business with Confidence
          </h1>
          <p className={styles.heroSubtitle}>
            The simplest way to track sales, manage inventory, and grow your profit. 
            Designed specifically for small businesses in East Africa.
          </p>
          <div className={styles.heroActions}>
            <Link to="/register" className={styles.btnPrimaryLarge}>
              Start Free Trial
            </Link>
            <Link to="/login" className={styles.btnSecondaryLarge}>
              Sign In to Account
            </Link>
          </div>
        </div>
        <div className={styles.heroImage}>
          <div className={styles.dashboardPreview}>
            <div className={styles.previewHeader}>
              <div className={styles.previewStats}>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>12,450</span>
                  <span className={styles.statLabel}>Today's Sales</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>89</span>
                  <span className={styles.statLabel}>Products</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Everything You Need to Grow</h2>
          <p className={styles.sectionSubtitle}>
            Powerful features designed for small business success
          </p>
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={styles.testimonials}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Loved by Small Business Owners</h2>
          <p className={styles.sectionSubtitle}>
            Join thousands of entrepreneurs who trust Duka Profit
          </p>
          <div className={styles.testimonialsGrid}>
            {testimonials.map((testimonial, index) => (
              <div key={index} className={styles.testimonialCard}>
                <div className={styles.testimonialRating}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className={styles.star}>⭐</span>
                  ))}
                </div>
                <p className={styles.testimonialContent}>"{testimonial.content}"</p>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.authorInfo}>
                    <div className={styles.authorName}>{testimonial.name}</div>
                    <div className={styles.authorBusiness}>{testimonial.business}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.container}>
          <h2 className={styles.ctaTitle}>Ready to Transform Your Business?</h2>
          <p className={styles.ctaSubtitle}>
            Start your free trial today - no credit card required
          </p>
          <div className={styles.ctaActions}>
            <Link to="/register" className={styles.btnPrimaryLarge}>
              Get Started Free
            </Link>
            <Link to="/login" className={styles.btnSecondaryLarge}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <Logo size="medium" />
              <p className={styles.footerDescription}>
                Empowering small businesses across East Africa with simple, powerful tools.
              </p>
            </div>
            <div className={styles.footerLinks}>
              <div className={styles.linkGroup}>
                <h4>Product</h4>
                <Link to="/features">Features</Link>
                <Link to="/pricing">Pricing</Link>
                <Link to="/support">Support</Link>
              </div>
              <div className={styles.linkGroup}>
                <h4>Company</h4>
                <Link to="/about">About</Link>
                <Link to="/contact">Contact</Link>
                <Link to="/blog">Blog</Link>
              </div>
              <div className={styles.linkGroup}>
                <h4>Legal</h4>
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Service</Link>
                <Link to="/security">Security</Link>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>&copy; 2024 Duka Profit. All rights reserved.</p>
            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink}>📘</a>
              <a href="#" className={styles.socialLink}>🐦</a>
              <a href="#" className={styles.socialLink}>📷</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
