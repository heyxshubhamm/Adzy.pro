import Link from 'next/link';
import styles from './FeatureHighlight.module.css';

const features = [
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="8" height="8" rx="1" stroke="#404145" strokeWidth="2"/>
        <rect x="16" y="5" width="8" height="8" rx="1" stroke="#404145" strokeWidth="2"/>
        <rect x="27" y="5" width="8" height="8" rx="1" stroke="#404145" strokeWidth="2"/>
        <rect x="5" y="16" width="8" height="8" rx="1" stroke="#404145" strokeWidth="2"/>
        <rect x="16" y="16" width="8" height="8" rx="1" stroke="#404145" strokeWidth="2"/>
        <path d="M28 20H34M31 17V23" stroke="#404145" strokeWidth="2" strokeLinecap="round"/>
        <rect x="5" y="27" width="8" height="8" rx="1" stroke="#404145" strokeWidth="2"/>
        <path d="M17 31H23M20 28V34" stroke="#404145" strokeWidth="2" strokeLinecap="round"/>
        <path d="M28 31H34M31 28V34" stroke="#404145" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    text: "Access a pool of top talent across 700 categories"
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="14" stroke="#404145" strokeWidth="2"/>
        <path d="M20 12V20L25 25" stroke="#404145" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M30 10L33 13M33 10L30 13" stroke="#404145" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    text: "Enjoy a simple, easy-to-use matching experience"
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="24" height="24" rx="2" stroke="#404145" strokeWidth="2"/>
        <path d="M20 14L16 20H24L20 26" stroke="#404145" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    text: "Get quality work done quickly and within budget"
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="12" width="20" height="16" rx="2" stroke="#404145" strokeWidth="2"/>
        <path d="M16 16V24M12 20H20" stroke="#404145" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="30" cy="18" r="6" stroke="#404145" strokeWidth="2"/>
        <path d="M28 18L29 19L32 16" stroke="#404145" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    text: "Only pay when you're happy"
  }
];

const FeatureHighlight = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.top}>
          <h2 className={styles.title}>Make it all happen with freelancers</h2>
          <Link href="/signup" className={`btn btn-primary ${styles.joinBtn}`}>
            Join now
          </Link>
        </div>
        
        <div className={styles.divider}></div>
        
        <div className={styles.grid}>
          {features.map((feature, i) => (
            <div key={i} className={styles.feature}>
              <div className={styles.iconWrapper}>{feature.icon}</div>
              <p className={styles.featureText}>{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureHighlight;
