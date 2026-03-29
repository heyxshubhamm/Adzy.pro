'use client';

import { useState, useEffect } from 'react';
import ListingCard from '../Marketplace/ListingCard';
import styles from './FeaturedMarketplace.module.css';
import Link from 'next/link';

interface Listing {
  id: string;
  name?: string;
  title: string;
  niche: string;
  traffic: string;
  dr: number;
  price: number;
  slug: string;
  cache_score?: number;
}

const FeaturedMarketplace = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${baseUrl}/api/listings?limit=8`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setListings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  if (loading) return null;

  return (
    <section className={styles.featuredSection}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>Featured Marketplaces</h2>
            <p className={styles.subtitle}>Hand-picked authority sites with high traffic metrics.</p>
          </div>
          <Link href="/marketplace" className="btn btn-primary">
            View all listings
          </Link>
        </div>

        <div className={styles.sliderContainer}>
          <div className={styles.slider}>
            {listings.map((listing) => (
              <div key={listing.id} className={styles.tileWrapper}>
                <ListingCard {...listing} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedMarketplace;
