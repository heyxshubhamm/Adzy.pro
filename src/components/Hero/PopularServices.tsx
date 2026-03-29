import styles from './PopularServices.module.css';

const services = [
  { name: "Vibe Coding", color: "#4A0E0E" },
  { name: "Website Development", color: "#0E4A2D" },
  { name: "Video Editing", color: "#4A2D0E" },
  { name: "Software Development", color: "#2D0E4A" },
  { name: "Book Publishing", color: "#0E2D4A" },
  { name: "Architecture & Interior Design", color: "#4A0E2D" }
];

const PopularServices = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.title}>Popular services</h2>
        <div className={styles.sliderContainer}>
          <div className={styles.slider}>
            {services.map((service, i) => (
              <div key={i} className={styles.card} style={{ backgroundColor: service.color }}>
                <div className={styles.header}>
                  <h3 className={styles.serviceName}>{service.name}</h3>
                </div>
                <div className={styles.body}>
                  {/* Decorative element mimicking the illustration */}
                  <div className={styles.graphic}></div>
                </div>
              </div>
            ))}
          </div>
          <button className={styles.nextBtn}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5L16 12L9 19" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default PopularServices;
