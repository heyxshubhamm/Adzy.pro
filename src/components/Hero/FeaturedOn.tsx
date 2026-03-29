import styles from './FeaturedOn.module.css';

const FeaturedOn = () => {
  const logos = [
    "AP News", "Digital Journal", "APSense", "Big News Network", 
    "Business Insider", "US Times Now", "USA Today", "Yahoo News", 
    "The Mercury News", "Global NewsWire", "Chicago Tribune"
  ];

  // Duplicate for seamless loop
  const allLogos = [...logos, ...logos];

  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.title}>Get Featured On</h2>
        <div className={styles.marqueeContainer}>
          <div className={styles.marquee}>
            {allLogos.map((logo, i) => (
              <span key={i} className={styles.logoItem}>{logo}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedOn;
