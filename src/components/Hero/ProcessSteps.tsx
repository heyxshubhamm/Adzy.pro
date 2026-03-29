import styles from './ProcessSteps.module.css';

const steps = [
  {
    title: "Discover Websites",
    description: "Browse our marketplace and find sites using filters like DR, traffic and niche."
  },
  {
    title: "Select Your Match",
    description: "Pick the site that fits your content and audience needs."
  },
  {
    title: "Customize Your Order",
    description: "Add your content or request a custom article from our team."
  },
  {
    title: "Finalize and Track",
    description: "Complete your order and track publication updates easily."
  }
];

const ProcessSteps = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.title}>How It Works</h2>
        <div className={styles.stepsGrid}>
          {steps.map((step, i) => (
            <div key={i} className={styles.stepItem}>
              <div className={styles.stepNumber}>{i + 1}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
              {i < steps.length - 1 && <div className={styles.arrow}>→</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSteps;
