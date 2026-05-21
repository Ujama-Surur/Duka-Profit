import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from '../components/common/Logo';
import styles from './Landing.module.css';
import { BarChart3, Package, DollarSign, Smartphone, Lock, Zap, Star } from 'lucide-react';

const Facebook = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Twitter = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const Instagram = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export default function Landing() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');

  const features = [
    {
      icon: <BarChart3 size={40} color="var(--green-primary)" />,
      title: 'Sales Tracking',
      description: 'Track your daily sales and monitor business performance with real-time analytics.'
    },
    {
      icon: <Package size={40} color="var(--green-primary)" />,
      title: 'Inventory Management',
      description: 'Manage your products, track stock levels, and get alerts when items run low.'
    },
    {
      icon: <DollarSign size={40} color="var(--green-primary)" />,
      title: 'Profit Analytics',
      description: 'Understand your profit margins and identify your most profitable products.'
    },
    {
      icon: <Smartphone size={40} color="var(--green-primary)" />,
      title: 'Mobile Friendly',
      description: 'Access your business data from anywhere with our responsive mobile design.'
    },
    {
      icon: <Lock size={40} color="var(--green-primary)" />,
      title: 'Secure Data',
      description: 'Your business data is encrypted and stored securely with regular backups.'
    },
    {
      icon: <Zap size={40} color="var(--green-primary)" />,
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
                    <Star key={i} size={16} fill="var(--yellow-primary)" color="var(--yellow-primary)" style={{ marginRight: 2 }} />
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
              <a href="#" className={styles.socialLink}><Facebook size={18} /></a>
              <a href="#" className={styles.socialLink}><Twitter size={18} /></a>
              <a href="#" className={styles.socialLink}><Instagram size={18} /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
