import styles from './Reviews.module.css';

const reviewsRow1 = [
  { name: "Alex R.", company: "SaaS Founder", text: "Adzy saved us weeks of manual outreach. The traffic is 100% real." },
  { name: "Sarah M.", company: "SEO Agency", text: "Best marketplace for high-DR sites. The 24h live time is no joke!" },
  { name: "James K.", company: "Affiliate Marketer", text: "I've tried many platforms, but Adzy's quality filter is on another level." },
  { name: "Elena G.", company: "Content Manager", text: "Fast, reliable, and transparent. The only place I buy backlinks now." },
  { name: "David L.", company: "E-com Owner", text: "Seeing actual ranking improvements within 2 weeks. Highly recommend." },
  { name: "Sophie T.", company: "Growth Lead", text: "The UI is so clean, finding niche-relevant sites is actually enjoyable." },
  { name: "Marcus P.", company: "Web Developer", text: "Secure payments and expert support. Everything a freelancer needs." },
  { name: "Linda W.", company: "Blogger", text: "Super easy to use. I listed my site and got my first order in 48 hours." },
  { name: "Ryan S.", company: "Crypto News", text: "Genuine high-traffic crypto sites that are hard to find elsewhere." },
  { name: "Chloe B.", company: "Marketing Director", text: "The escrow protection gives us the confidence to scale our campaigns." }
];

const reviewsRow2 = [
  { name: "Tom F.", company: "Tech Startup", text: "Finally, a platform that prioritizes traffic over useless metrics like DA." },
  { name: "Anna C.", company: "SEO Consultant", text: "Adzy is my secret weapon for client success. The ROI is incredible." },
  { name: "Kevin J.", company: "Digital Agency", text: "Scaling link building is finally possible without hiring an outreach team." },
  { name: "Mia H.", company: "SaaS Growth", text: "Transparent pricing is what sold me. No hidden markups, just results." },
  { name: "Paul D.", company: "Agency Owner", text: "The best support team I've ever dealt with. They really know SEO." },
  { name: "Olivia R.", company: "Site Owner", text: "Selling my backlink placements has never been easier or more secure." },
  { name: "Mark V.", company: "SEO Expert", text: "Real sites, real traffic, real rankings. Adzy is the gold standard." },
  { name: "Grace L.", company: "Content Strategist", text: "The filtering options are so precise. Saved me hours of research." },
  { name: "Julian M.", company: "Niche Site Builder", text: "Great pricing and even better quality. A must-have for any SEO." },
  { name: "Emma N.", company: "Global Marketing", text: "The 100% manual approval process really shows in the site quality." }
];

const ReviewCard = ({ name, company, text }: { name: string, company: string, text: string }) => (
  <div className={styles.card}>
    <div className={styles.stars}>★★★★★</div>
    <p className={styles.text}>"{text}"</p>
    <div className={styles.user}>
      <span className={styles.name}>{name}</span>
      <span className={styles.company}>{company}</span>
    </div>
  </div>
);

const Reviews = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.title}>What People Say</h2>
      </div>
      
      <div className={styles.marqueeContainer}>
        {/* Row 1: Right to Left */}
        <div className={styles.marquee}>
          <div className={styles.marqueeInner}>
            {reviewsRow1.map((review, i) => <ReviewCard key={i} {...review} />)}
            {/* Duplicate for infinite effect */}
            {reviewsRow1.map((review, i) => <ReviewCard key={`dup-${i}`} {...review} />)}
          </div>
        </div>

        {/* Row 2: Left to Right */}
        <div className={`${styles.marquee} ${styles.reverse}`}>
          <div className={styles.marqueeInner}>
            {reviewsRow2.map((review, i) => <ReviewCard key={i} {...review} />)}
            {/* Duplicate for infinite effect */}
            {reviewsRow2.map((review, i) => <ReviewCard key={`dup-${i}`} {...review} />)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reviews;
