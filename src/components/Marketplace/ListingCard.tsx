import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './ListingCard.module.css';

interface ListingCardProps {
  id: string;
  title: string;
  niche: string;
  traffic: string;
  dr: number;
  price: number;
  slug: string;
  cache_score?: number;
}

const ListingCard: React.FC<ListingCardProps> = ({ id, title, niche, traffic, dr, price, slug, cache_score }) => {
  const pulseScore = cache_score ? (cache_score * 10).toFixed(1) : "8.5";
  
  return (
    <motion.div 
      className={styles.card}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
    >
      {/* Intelligence Pulse Badge */}
      <div className={styles.intelligenceBadge}>
        <span className={styles.pulseDot} />
        Intelligence: {pulseScore}%
      </div>
      
      <Link href={`/listing/${slug}`} className={styles.cardLink}>
        <div className={styles.cardHeader}>
          <h3 className={styles.name}>{title}</h3>
          <span className={styles.nicheBadge}>{niche}</span>
          <div className={styles.drBadge}>DR {dr}</div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Monthly Traffic</span>
              <span className={styles.statValue}>{traffic}</span>
            </div>
          </div>
        </div>
      </Link>
      <div className={styles.cardFooter}>
        <div className={styles.price}>
          <span className={styles.priceLabel}>Starting at</span>
          <span className={styles.priceValue}>${price}</span>
        </div>
        <Link href={`/listing/${id}`} className={`btn btn-primary ${styles.buyBtn}`}>View Details</Link>
      </div>
    </motion.div>
  );
};

export default ListingCard;
