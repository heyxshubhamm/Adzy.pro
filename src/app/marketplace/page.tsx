import styles from "./Marketplace.module.css";
import GigGrid from "@/components/Marketplace/GigGrid";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getGigs(q?: string): Promise<any[]> {
  const url = new URL(`${API}/gigs`);
  if (q) url.searchParams.set("q", q);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const gigs = await getGigs(params.q);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Marketplace Intelligence</h1>
        <p className={styles.subtitle}>
          Discover high-performance services with zero-latency efficiency.
        </p>
        <form method="GET" className={styles.searchBar}>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search by title or keyword…"
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>
            Search
          </button>
        </form>
      </header>

      <main className={styles.main}>
        {params.q && (
          <p className={styles.sectionLabel}>
            Results for &ldquo;{params.q}&rdquo; — {gigs.length} found
          </p>
        )}
        <GigGrid gigs={gigs} />
      </main>
    </div>
  );
}
