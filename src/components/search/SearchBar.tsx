"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import styles from "./SearchBar.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function SearchBar({ initialQuery }: { initialQuery: string }) {
  const [query,       setQuery]       = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef     = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res  = await fetch(`${API}/gigs/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  // Sync if the URL query changes externally
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  function submit(q: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set("q", q.trim());
    else          params.delete("q");
    params.delete("page");
    router.push(`/search?${params.toString()}`);
    setShowDrop(false);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inputRow}>
        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDrop(true); }}
          onKeyDown={e => e.key === "Enter" && submit(query)}
          onFocus={() => suggestions.length > 0 && setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 150)}
          placeholder="Search for services…"
          className={styles.input}
          autoComplete="off"
        />
        {query && (
          <button
            className={styles.clear}
            onClick={() => { setQuery(""); setSuggestions([]); inputRef.current?.focus(); }}
            aria-label="Clear"
          >
            ×
          </button>
        )}
        <button className={styles.button} onClick={() => submit(query)}>
          Search
        </button>
      </div>

      {showDrop && suggestions.length > 0 && (
        <ul className={styles.dropdown} role="listbox">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                className={styles.suggestion}
                onMouseDown={() => { setQuery(s); submit(s); }}
                role="option"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
