import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './GigCard.module.css';

interface Package {
  tier: string;
  price: number;
}

interface GigCardProps {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  min_price?: number | null;
  packages?: Package[];
  rating?: number | null;
  reviews_count?: number;
  gig_level?: string;
  seller?: {
    username: string;
    avatar_url?: string;
    publisher_level?: number;
    adzy_choice?: boolean;
    level_label?: string;
  } | null;
}

const GigCard: React.FC<GigCardProps> = ({
  title,
  slug,
  tags,
  min_price,
  packages,
  rating,
  gig_level,
  seller,
}) => {
  const displayPrice =
    min_price != null
      ? min_price
      : packages && packages.length > 0
      ? Math.min(...packages.map((p) => p.price))
      : null;

  const primaryTag = tags?.[0];
  const sellerLevelNum = seller?.adzy_choice ? 4 : seller?.publisher_level ?? 0;
  const levelLabel = seller?.level_label
    ? seller.level_label
    : seller?.adzy_choice
    ? "Adzy Choice"
    : sellerLevelNum >= 0
    ? ["New Seller", "Level 1", "Level 2", "Best Seller", "Adzy Choice"][sellerLevelNum] ?? "New Seller"
    : "New Seller";

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.leftBadges}>
          {primaryTag && <div className={styles.nicheBadge}>#{primaryTag}</div>}
          {gig_level && gig_level !== "standard" && (
            <div className={`${styles.gigLevelBadge} ${styles[`gig_${gig_level}`]}`}>
              {gig_level.toUpperCase()}
            </div>
          )}
        </div>
        {rating != null && (
          <div className={styles.scoreBadge}>★ {Number(rating).toFixed(1)}</div>
        )}
      </div>

      <div className={styles.cardContent}>
        <Link href={`/gigs/${slug}`} className={styles.title}>
          <h3>{title}</h3>
        </Link>

        {tags && tags.length > 1 && (
          <div className={styles.metrics}>
            {tags.slice(1, 3).map((tag) => (
              <span key={tag} className={styles.tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.seller}>
          {seller?.avatar_url ? (
            <Image
              src={seller.avatar_url}
              alt={seller.username}
              width={24}
              height={24}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {seller?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
          )}
          <span className={styles.username}>{seller?.username ?? 'Verified Seller'}</span>
          {sellerLevelNum > 0 && (
            <span className={`${styles.levelBadge} ${styles[`level${sellerLevelNum}`]}`}>
              {levelLabel}
            </span>
          )}
        </div>
        {displayPrice != null && (
          <div className={styles.price}>
            <span className={styles.starting}>From</span>
            <span className={styles.amount}>${displayPrice}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GigCard;
