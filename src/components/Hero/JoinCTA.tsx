import Link from 'next/link';
import styles from './JoinCTA.module.css';

const JoinCTA = () => {
  return (
    <section className={styles.section}>
      <div className={styles.banner}>
        <h2 className={styles.title}>
          Expert placements at your <span className={styles.accent}>fingertips</span>
        </h2>
        <Link href="/signup" className={`btn btn-primary ${styles.btn}`}>
          Join Adzy
        </Link>
      </div>
    </section>
  );
};

export default JoinCTA;
