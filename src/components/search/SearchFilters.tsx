"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { SearchFacets } from "@/types/search";
import styles from "./SearchFilters.module.css";

const SELLER_LEVELS = [
  { value: "new",       label: "New Seller" },
  { value: "level_1",   label: "Level 1" },
  { value: "level_2",   label: "Level 2" },
  { value: "top_rated", label: "Top Rated" },
];

const DELIVERY_OPTIONS = [
  { value: "1",  label: "Express (1 day)" },
  { value: "3",  label: "Up to 3 days" },
  { value: "7",  label: "Up to 7 days" },
  { value: "14", label: "Up to 14 days" },
];

export function SearchFilters({ facets }: { facets: SearchFacets }) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  function set(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else        params.delete(key);
    params.delete("page");
    router.push(`/search?${params.toString()}`);
  }

  function toggle(key: string, value: string) {
    const current = searchParams.get(key);
    set(key, current === value ? null : value);
  }

  const activeCategory   = searchParams.get("category");
  const activeLevel      = searchParams.get("seller_level");
  const activeDelivery   = searchParams.get("delivery_days");
  const minRating        = searchParams.get("min_rating");
  const minPrice         = searchParams.get("min_price");
  const maxPrice         = searchParams.get("max_price");

  const hasFilters = !!(activeCategory || activeLevel || activeDelivery || minRating || minPrice || maxPrice);

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    ["category", "seller_level", "delivery_days", "min_rating", "min_price", "max_price"].forEach(k => params.delete(k));
    params.delete("page");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className={styles.sidebar}>
      {hasFilters && (
        <button className={styles.clearAll} onClick={clearAll}>
          Clear all filters
        </button>
      )}

      {/* Category */}
      {facets.categories.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.heading}>Category</h3>
          <ul className={styles.list}>
            {facets.categories.map(cat => (
              <li key={cat.slug}>
                <button
                  className={`${styles.filterBtn} ${activeCategory === cat.slug ? styles.active : ""}`}
                  onClick={() => toggle("category", cat.slug)}
                >
                  <span>{cat.name ?? cat.slug}</span>
                  <span className={styles.count}>{cat.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Seller Level */}
      <section className={styles.section}>
        <h3 className={styles.heading}>Seller Level</h3>
        <ul className={styles.list}>
          {SELLER_LEVELS.map(lvl => (
            <li key={lvl.value}>
              <button
                className={`${styles.filterBtn} ${activeLevel === lvl.value ? styles.active : ""}`}
                onClick={() => toggle("seller_level", lvl.value)}
              >
                {lvl.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Delivery Time */}
      <section className={styles.section}>
        <h3 className={styles.heading}>Delivery Time</h3>
        <ul className={styles.list}>
          {DELIVERY_OPTIONS.map(opt => (
            <li key={opt.value}>
              <button
                className={`${styles.filterBtn} ${activeDelivery === opt.value ? styles.active : ""}`}
                onClick={() => toggle("delivery_days", opt.value)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Minimum Rating */}
      <section className={styles.section}>
        <h3 className={styles.heading}>Minimum Rating</h3>
        <ul className={styles.list}>
          {["4", "4.5"].map(r => (
            <li key={r}>
              <button
                className={`${styles.filterBtn} ${minRating === r ? styles.active : ""}`}
                onClick={() => toggle("min_rating", r)}
              >
                ★ {r}+
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Price Range */}
      <section className={styles.section}>
        <h3 className={styles.heading}>Budget</h3>
        <div className={styles.priceRow}>
          <input
            type="number"
            placeholder="Min $"
            min={0}
            defaultValue={minPrice ?? ""}
            className={styles.priceInput}
            onBlur={e => set("min_price", e.target.value || null)}
          />
          <span className={styles.priceSep}>–</span>
          <input
            type="number"
            placeholder="Max $"
            min={0}
            defaultValue={maxPrice ?? ""}
            className={styles.priceInput}
            onBlur={e => set("max_price", e.target.value || null)}
          />
        </div>
      </section>
    </div>
  );
}
