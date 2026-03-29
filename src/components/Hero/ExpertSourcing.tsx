import Link from 'next/link';
import styles from './ExpertSourcing.module.css';

const ExpertSourcing = () => {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.content}>
          <div className={styles.brand}>
            <span className={styles.logoText}>Adzy.<span className={styles.logoAccent}>pro</span></span>
            <span className={styles.badge}>PRO</span>
          </div>
          
          <h2 className={styles.title}>
            Let experts find the right <br /> 
            placement for you
          </h2>
          
          <ul className={styles.benefits}>
            <li>
              <span className={styles.check}>✓</span>
              Work with experts who will source, interview, and vet sites for you
            </li>
            <li>
              <span className={styles.check}>✓</span>
              Get a report with clear recommendations
            </li>
            <li>
              <span className={styles.check}>✓</span>
              Hire vetted authority sites with confidence
            </li>
          </ul>
          
          <Link href="/expert-sourcing" className={`btn btn-primary ${styles.cta}`}>
            Discover expert sourcing
          </Link>
          
          <div className={styles.guarantee}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 1L3 4V8C3 12.14 5.99 16.01 10 17C14.01 16.01 17 12.14 17 8V4L10 1Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 9L9 11L13 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>100% money-back guarantee</span>
          </div>
        </div>
        
        <div className={styles.visual}>
          <div className={styles.cardStack}>
            <div className={`${styles.card} ${styles.cardBack1}`}></div>
            <div className={`${styles.card} ${styles.cardBack2}`}></div>
            <div className={styles.mainCard}>
              <img src="/expert_avatars_row.png" alt="Expert" className={styles.expertImg} />
              <div className={styles.expertInfo}>
                <p className={styles.expertName}>Lillian</p>
                <p className={styles.expertTitle}>Website developer</p>
              </div>
            </div>
          </div>
          <div className={styles.cursorWrapper}>
             <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 10L18 30L22 22L30 18L10 10Z" fill="#0066FF" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
             </svg>
          </div>
          <div className={styles.chatBubble}>
            <div className={styles.dots}>
               <span></span>
               <span></span>
               <span></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExpertSourcing;
