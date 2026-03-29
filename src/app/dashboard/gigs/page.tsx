import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import styles from "../Dashboard.module.css";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Gig {
  id: string;
  title: string;
  slug: string;
  status: string;
  tags: string[];
  packages: { tier: string; price: number }[];
}

export default async function SellerGigsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) redirect("/login");

  const response = await fetch(`${API}/gigs/my/gigs`, {
    headers: { Cookie: `access_token=${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return <div className="p-8 text-white opacity-50">Unable to load your gigs.</div>;
  }

  const gigs: Gig[] = await response.json();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>My Services</h1>
        <Link href="/dashboard/gigs/create" className="btn btn-primary">+ Add New Service</Link>
      </div>

      <div className={styles.tableContainer}>
        {gigs.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Tags</th>
                <th>Starting Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {gigs.map((gig) => {
                const basicPkg = gig.packages.find((p) => p.tier === "basic") ?? gig.packages[0];
                return (
                  <tr key={gig.id}>
                    <td className={styles.siteName}>
                      <Link href={`/gigs/${gig.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
                        {gig.title}
                      </Link>
                    </td>
                    <td style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                      {gig.tags.slice(0, 3).join(", ")}
                    </td>
                    <td>${basicPkg?.price ?? "—"}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[gig.status.toLowerCase()]}`}>
                        {gig.status}
                      </span>
                    </td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <Link href={`/dashboard/gigs/${gig.id}/edit`} className={styles.viewLink}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <p>You haven&apos;t created any services yet.</p>
            <Link href="/dashboard/gigs/create" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
              Create your first service
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
