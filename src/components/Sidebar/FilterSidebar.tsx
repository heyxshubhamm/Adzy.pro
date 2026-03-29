'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import styles from './FilterSidebar.module.css';

const FilterSidebar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentNiche = searchParams.get('niche') || '';

  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api("/api/categories/");
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const handleNicheChange = (niche: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get('niche') === niche) {
      params.delete('niche');
    } else {
      params.set('niche', niche);
    }
    router.push(`/marketplace?${params.toString()}`);
  };

  const handleReset = () => {
    router.push('/marketplace');
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.filterGroup}>
        <h3 className={styles.filterTitle}>Niche</h3>
        <ul className={styles.filterList}>
          {categories.slice(0, 10).map((cat) => (
            <li key={cat.id}>
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={currentNiche === cat.name}
                  onChange={() => handleNicheChange(cat.name)}
                /> 
                {cat.name}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.filterGroup}>
        <h3 className={styles.filterTitle}>Price Range</h3>
        <div className={styles.rangeInputs}>
          <input type="number" placeholder="Min $" className={styles.input} />
          <span>-</span>
          <input type="number" placeholder="Max $" className={styles.input} />
        </div>
      </div>

      <div className={styles.filterGroup}>
        <h3 className={styles.filterTitle}>Domain Rating (DR)</h3>
        <ul className={styles.filterList}>
          {[90, 70, 50, 30].map((dr) => (
            <li key={dr}>
              <label className={styles.radioLabel}>
                <input type="radio" name="dr" /> {dr}+ DR
              </label>
            </li>
          ))}
        </ul>
      </div>

      <button className={`btn btn-outline ${styles.resetBtn}`} onClick={handleReset}>Reset Filters</button>
    </aside>
  );
};

export default FilterSidebar;
