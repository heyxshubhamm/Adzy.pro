import styles from './WhyChooseAdzy.module.css';

const benefits = [
  {
    title: "Quality Assurance",
    description: "Only high-authority sites with real organic traffic are approved for our marketplace.",
    icon: "🛡️"
  },
  {
    title: "Transparent Pricing",
    description: "No hidden fees. You get direct-to-seller pricing with full transparency on all costs.",
    icon: "💎"
  },
  {
    title: "Fast Execution",
    description: "Experience the industry's fastest turnaround time, with an average 24h publication speed.",
    icon: "⚡"
  },
  {
    title: "Secure Payments",
    description: "Your funds are protected. We use secure escrow-style payments for every transaction.",
    icon: "🔒"
  },
  {
    title: "Expert Support",
    description: "Get 24/7 help from SEO experts who understand your link-building needs.",
    icon: "🤝"
  },
  {
    title: "Detailed Analytics",
    description: "Verify every site with live traffic data and DA/DR metrics before you buy.",
    icon: "📊"
  }
];

const WhyChooseAdzy = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>Why Choose Adzy.pro?</h2>
          <p className={styles.subtitle}>The preferred choice for SEO agencies and performance marketers worldwide.</p>
        </div>
        
        <div className={styles.grid}>
          {benefits.map((benefit, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.icon}>{benefit.icon}</div>
              <h3 className={styles.cardTitle}>{benefit.title}</h3>
              <p className={styles.cardDescription}>{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseAdzy;
