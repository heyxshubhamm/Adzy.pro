import Link from 'next/link';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.brand}>
            <div className={styles.logo}>
              <span className={styles.logoText}>Adzy.<span className={styles.logoAccent}>pro</span></span>
            </div>
            <p className={styles.tagline}>
              High-performance backlink marketplace for authority-focused link building.
            </p>
          </div>
          
          <div className={styles.linksColumn}>
            <h4 className={styles.columnTitle}>Marketplace</h4>
            <ul className={styles.linkList}>
              <li><Link href="/marketplace">All Listings</Link></li>
              <li><Link href="/sell">Sell Backlinks</Link></li>
              <li><Link href="/blog">SEO Insights</Link></li>
              <li><Link href="/marketplace?niche=SaaS">SaaS Outreach</Link></li>
            </ul>
          </div>

          <div className={styles.linksColumn}>
            <h4 className={styles.columnTitle}>Company</h4>
            <ul className={styles.linkList}>
              <li><Link href="/about">How it Works</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/contact">Contact Us</Link></li>
              <li><Link href="/careers">Careers</Link></li>
            </ul>
          </div>

          <div className={styles.linksColumn}>
            <h4 className={styles.columnTitle}>Support</h4>
            <ul className={styles.linkList}>
              <li><Link href="/help">Help Center</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/refund">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Adzy.pro. All rights reserved.
          </p>
          <div className={styles.socials}>
            {/* Social icons would go here */}
            <span className={styles.socialLink}>Twitter</span>
            <span className={styles.socialLink}>LinkedIn</span>
            <span className={styles.socialLink}>Facebook</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
