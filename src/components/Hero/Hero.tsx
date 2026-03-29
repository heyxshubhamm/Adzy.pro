'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import styles from './Hero.module.css';

interface Props {
  categories: any[];
}

const Hero = ({ categories }: Props) => {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = () => {
    if (query.trim()) {
      router.push(`/marketplace?q=${encodeURIComponent(query)}`);
    } else {
      router.push('/marketplace');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const heroCategories = (categories || []).slice(0, 5);

  return (
    <section className={styles.hero}>
      <div className={styles.heroBg}>
        <img src="/hero_bg_professional.png" alt="Hero Background" className={styles.bgImage} />
        <div className={styles.overlay}></div>
      </div>
      
      <div className={`container ${styles.heroInner}`}>
        <motion.h1 
          className={styles.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          The top influencers <br /> 
          will take it from here
        </motion.h1>

        <motion.div 
          className={styles.searchContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className={styles.searchBox}>
            <input 
              type="text" 
              placeholder="Search for any service..." 
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className={styles.searchButton} onClick={handleSearch}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 21L16.65 16.65" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div className={styles.categoryPills}>
            {heroCategories.map((cat, i) => (
              <motion.button 
                key={cat.slug} 
                className={styles.pill}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 + (i * 0.1) }}
                onClick={() => {
                  router.push(`/category/${cat.slug}`);
                }}
              >
                {cat.name} →
              </motion.button>
            ))}
          </div>
        </motion.div>

        <div className={styles.trustedBy}>
          <span className={styles.trustedLabel}>Trusted by:</span>
          <div className={styles.trustedLogos}>
            <span className={styles.logoItem}>Meta</span>
            <span className={styles.logoItem}>Google</span>
            <span className={styles.logoItem}>NETFLIX</span>
            <span className={styles.logoItem}>P&G</span>
            <span className={styles.logoItem}>PayPal</span>
            <span className={styles.logoItem}>Payoneer</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
