import { notFound } from "next/navigation";
import styles from "./ListingDetail.module.css";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Package {
  id: string;
  tier: string;
  name: string;
  description: string;
  price: number;
  delivery_days: number;
  revisions: number;
}

interface Gig {
  id: string;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  status: string;
  rating?: number;
  reviews_count?: number;
  risk_score?: number;
  risk_report?: string;
  packages: Package[];
  seller: { id: string; username: string; avatar_url?: string; publisher_level?: number };
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  seller_reply?: string;
  created_at: string;
  reviewer?: { username: string };
}

export default async function GigDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const response = await fetch(`${API}/gigs/${slug}`, { cache: "no-store" });
  if (!response.ok) notFound();

  const gig: Gig = await response.json();

  const reviewsRes = await fetch(`${API}/gigs/${gig.id}/reviews`, { cache: "no-store" }).catch(() => null);
  const reviews: Review[] = reviewsRes?.ok ? await reviewsRes.json().catch(() => []) : [];

  const basicPkg = gig.packages.find((p) => p.tier === "basic") ?? gig.packages[0];

  return (
    <div className="container" style={{ paddingTop: "4rem", paddingBottom: "8rem" }}>
      <div className={styles.layout}>
        <div className={styles.main}>
          <Link href="/marketplace" className={styles.backLink}>← Back to Marketplace</Link>

          <div className={styles.header}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {gig.tags.map((tag) => (
                <span key={tag} className={styles.niche}>#{tag}</span>
              ))}
            </div>
            <h1 className={styles.title}>{gig.title}</h1>
          </div>

          <div className={styles.content}>
            <h2>About this service</h2>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{gig.description}</p>
          </div>

          {gig.packages.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Packages</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {gig.packages.map((pkg) => (
                  <div key={pkg.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
                    <div style={{ color: "#00f0ff", fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{pkg.tier}</div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{pkg.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 12 }}>{pkg.description}</div>
                    <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, marginBottom: 4 }}>${pkg.price}</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                      {pkg.delivery_days} day{pkg.delivery_days !== 1 ? "s" : ""} delivery
                      {pkg.revisions > 0 && ` · ${pkg.revisions === -1 ? "Unlimited" : pkg.revisions} revision${pkg.revisions !== 1 ? "s" : ""}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviews.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
                Reviews{gig.rating != null && <span style={{ color: "#f59e0b", marginLeft: 10, fontSize: 16 }}>★ {Number(gig.rating).toFixed(1)}</span>}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {reviews.map((review) => (
                  <div key={review.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600 }}>{review.reviewer?.username ?? "Buyer"}</span>
                      <span style={{ color: "#f59e0b", fontSize: 14 }}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                    </div>
                    {review.comment && <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{review.comment}</p>}
                    {review.seller_reply && (
                      <div style={{ marginTop: 12, paddingLeft: 14, borderLeft: "2px solid rgba(0,240,255,0.3)" }}>
                        <p style={{ color: "rgba(0,240,255,0.8)", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Seller Reply</p>
                        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{review.seller_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(gig.risk_score !== undefined || gig.risk_report) && (
            <div className={styles.intelligenceBox} style={{ marginTop: 32 }}>
              <header className={styles.intelligenceHeader}>
                <h3>Quality Signal</h3>
                {gig.risk_score !== undefined && (
                  <div className={`${styles.riskBadge} ${gig.risk_score > 50 ? styles.highRisk : styles.lowRisk}`}>
                    Risk: {gig.risk_score}/100
                  </div>
                )}
              </header>
              {gig.risk_report && (
                <div className={styles.intelligenceReport}>
                  <p className={styles.reportText}>{gig.risk_report}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.purchaseCard}>
            <div className={styles.priceContainer}>
              <span className={styles.priceLabel}>Starting at</span>
              <span className={styles.priceValue}>${basicPkg?.price ?? "—"}</span>
            </div>
            {basicPkg && (
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "8px 0 16px" }}>
                {basicPkg.delivery_days} day delivery · {basicPkg.revisions === -1 ? "Unlimited" : basicPkg.revisions} revision{basicPkg.revisions !== 1 ? "s" : ""}
              </p>
            )}
            <Link
              href={`/order/${gig.id}`}
              className={`btn btn-primary ${styles.buyNowBtn}`}
            >
              Continue
            </Link>
            <div className={styles.sellerInfo}>
              <span>Seller: <strong>{gig.seller?.username ?? "Verified Seller"}</strong></span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
