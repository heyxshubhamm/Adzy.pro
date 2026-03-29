import React from 'react';
import GigCard from './GigCard';
import styles from './GigGrid.module.css';

interface Package {
  tier: string;
  price: number;
}

interface Gig {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  min_price?: number | null;
  packages?: Package[];
  rating?: number | null;
  reviews_count?: number;
  seller?: {
    username: string;
    avatar_url?: string;
    publisher_level?: number;
  } | null;
}

interface GigGridProps {
  gigs: Gig[];
}

export default function GigGrid({ gigs }: GigGridProps) {
  if (!gigs || gigs.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🔍</div>
        <p>No services found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {gigs.map((gig) => (
        <GigCard key={gig.id} {...gig} />
      ))}
    </div>
  );
}
