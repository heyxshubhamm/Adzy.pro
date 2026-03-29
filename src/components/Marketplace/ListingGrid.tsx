'use client';

import ListingCard from './ListingCard';
import styles from './ListingGrid.module.css';

interface Listing {
  id: string;
  title: string;
  niche: string;
  traffic: string;
  dr: number;
  price: number;
  slug: string;
  cache_score: number;
}

interface ListingGridProps {
  listings: Listing[];
}

export default function ListingGrid({ listings }: ListingGridProps) {
  return (
    <div className={styles.gridContainer}>
      <div className={styles.gridHeader}>
        <h2 className={styles.gridTitle}>
          Available Placements ({listings?.length || 0})
        </h2>
        <div className={styles.sort}>
          <span>Sort by:</span>
          <select className={styles.sortSelect}>
            <option>Most Relevant (AI)</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>DR: High to Low</option>
          </select>
        </div>
      </div>
      <div className={styles.grid}>
        {listings && listings.length > 0 ? (
          listings.map((listing) => (
            <ListingCard 
            key={listing.id} 
            {...listing} 
            cache_score={listing.cache_score}
          />
          ))
        ) : (
          <div className={styles.noResults}>No listings found matching your criteria.</div>
        )}
      </div>
    </div>
  );
}
