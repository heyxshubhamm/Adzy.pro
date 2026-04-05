"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import GigCard from "@/components/Marketplace/GigCard";
import type { SearchResponse, GigSearchResult } from "@/types/search";
import styles from "./SearchResults.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SORT_OPTIONS = [
  { value: "relevance",  label: "Best match"    },
  { value: "rating",     label: "Highest rated"  },
  { value: "price_asc",  label: "Price: low–high" },
  { value: "price_desc", label: "Price: high–low" },
  { value: "newest",     label: "Newest"          },
  { value: "popular",    label: "Most popular"    },
] as const;

interface Props {
  initialData: SearchResponse;
}

export function SearchResults({ initialData }: Props) {
  const [data,         setData]         = useState(initialData);
  const [isPending,    startTransition]  = useTransition();
  const router        = useRouter();
  const searchParams  = useSearchParams();

  // Re-fetch whenever URL search params change
  useEffect(() => {
    const qs = searchParams.toString();
    startTransition(async () => {
      try {
        const res = await fetch(`${API}/gigs/search?${qs}`);
        if (res.ok) setData(await res.json());
      } catch {
        // keep previous data on error
      }
    });
  }, [searchParams.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  function setSort(sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    params.delete("page");
    router.push(`/search?${params.toString()}`);
  }

  function goTo(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/search?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const currentSort = searchParams.get("sort") ?? "relevance";

  return (
    <div>
      {/* Header row */}
      <div className={styles.header}>
        <div className={styles.meta}>
          {data.total > 0 ? (
            <>
              <span className={styles.count}>{data.total.toLocaleString()} results</span>
              {data.query && (
                <span className={styles.queryLabel}> for &ldquo;{data.query}&rdquo;</span>
              )}
              <span className={styles.timing}> · {data.took_ms}ms</span>
            </>
          ) : (
            <span className={styles.count}>No results</span>
          )}
        </div>
        <select
          className={styles.sortSelect}
          value={currentSort}
          onChange={e => setSort(e.target.value)}
          aria-label="Sort results"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* "Did you mean" suggestions */}
      {data.suggestions.length > 0 && (
        <div className={styles.suggestions}>
          Did you mean:{" "}
          {data.suggestions.map((s, i) => (
            <Link key={i} href={`/search?q=${encodeURIComponent(s)}`} className={styles.suggestionLink}>
              {s}
            </Link>
          ))}
        </div>
      )}

      {/* Results grid */}
      <div
        className={styles.grid}
        style={{ opacity: isPending ? 0.55 : 1, transition: "opacity .2s" }}
      >
        {data.results.map(gig => (
          <GigCard
            key={gig.id}
            id={gig.id}
            title={gig.title}
            slug={gig.slug}
            tags={gig.tags}
            min_price={Number(gig.price_from)}
            rating={gig.avg_rating}
            seller={{ username: gig.seller_name }}
          />
        ))}
      </div>

      {/* Empty state */}
      {data.results.length === 0 && !isPending && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No services found</p>
          <p className={styles.emptyHint}>Try different keywords or remove some filters.</p>
        </div>
      )}

      {/* Pagination */}
      {data.pages > 1 && (
        <Pagination current={data.page} total={data.pages} onPage={goTo} />
      )}
    </div>
  );
}

function Pagination({
  current,
  total,
  onPage,
}: {
  current: number;
  total: number;
  onPage: (page: number) => void;
}) {
  // Show at most 7 page numbers with ellipsis logic
  const pages: number[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push(-1); // left ellipsis
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push(-2); // right ellipsis
    pages.push(total);
  }

  return (
    <div className={styles.pagination}>
      {pages.map((page, idx) =>
        page < 0 ? (
          <span key={page} className={styles.ellipsis}>…</span>
        ) : (
          <button
            key={page}
            onClick={() => onPage(page)}
            className={`${styles.pageBtn} ${page === current ? styles.pageBtnActive : ""}`}
            disabled={page === current}
          >
            {page}
          </button>
        )
      )}
    </div>
  );
}
