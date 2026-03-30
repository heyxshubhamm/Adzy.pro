import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import styles from "./ListingDetail.module.css";
import { GigTracker } from "@/components/gig/GigTracker";
import { GigMediaGallery } from "@/components/gig/GigMediaGallery";
import { GigPackageSelector } from "@/components/gig/GigPackageSelector";
import { GigSellerCard } from "@/components/gig/GigSellerCard";
import { GigReviews } from "@/components/gig/GigReviews";
import { RelatedGigs } from "@/components/gig/RelatedGigs";
import type { GigDetailOut } from "@/types/gig";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API}/gigs/top?limit=100`);
    if (!res.ok) return [];
    const gigs: { slug: string }[] = await res.json();
    return gigs.map((g) => ({ slug: g.slug }));
  } catch {
    return [];
  }
}

async function fetchGig(slug: string): Promise<GigDetailOut | null> {
  try {
    const res = await fetch(`${API}/gigs/slug/${slug}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const gig = await fetchGig(slug);
  if (!gig) return { title: "Gig not found — Adzy" };

  const description = gig.description.slice(0, 160);
  const coverImage =
    gig.media.find((m) => m.is_cover)?.processed_urls?.cover ??
    gig.media[0]?.url;

  return {
    title: `${gig.title} | Adzy`,
    description,
    alternates: { canonical: `/gigs/${gig.slug}` },
    openGraph: {
      title: gig.title,
      description,
      url: `/gigs/${gig.slug}`,
      siteName: "Adzy",
      type: "website",
      ...(coverImage && {
        images: [{ url: coverImage, width: 1280, height: 720, alt: gig.title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: gig.title,
      description,
      ...(coverImage && { images: [coverImage] }),
    },
  };
}

export default async function GigDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gig = await fetchGig(slug);
  if (!gig) notFound();

  const minPrice = gig.packages.length
    ? Math.min(...gig.packages.map((p) => Number(p.price)))
    : null;

  const coverImage =
    gig.media.find((m) => m.is_cover)?.processed_urls?.cover ??
    gig.media[0]?.url;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: gig.title,
    description: gig.description.slice(0, 300),
    url: `https://adzy.pro/gigs/${gig.slug}`,
    provider: {
      "@type": "Person",
      name: gig.seller.display_name ?? gig.seller.username,
      url: `https://adzy.pro/sellers/${gig.seller.username}`,
    },
    ...(gig.avg_rating != null && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(gig.avg_rating).toFixed(1),
        reviewCount: gig.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(minPrice != null && {
      offers: {
        "@type": "Offer",
        price: minPrice,
        priceCurrency: "USD",
        availability: gig.seller.is_available
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      },
    }),
    ...(coverImage && { image: coverImage }),
  };

  return (
    <>
      <GigTracker gigId={gig.id} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container" style={{ paddingTop: "4rem", paddingBottom: "8rem" }}>
        <div className={styles.layout}>
          {/* ── Main column ── */}
          <div>
            <Link href="/marketplace" className={styles.backLink}>
              ← Back to Marketplace
            </Link>

            {/* Header */}
            <div className={styles.header}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {gig.tags.map((tag) => (
                  <span key={tag} className={styles.niche}>
                    #{tag}
                  </span>
                ))}
              </div>
              <h1 className={styles.title}>{gig.title}</h1>
              {gig.avg_rating != null && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <span style={{ color: "#f59e0b", fontSize: 16 }}>★</span>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                    {Number(gig.avg_rating).toFixed(1)}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                    ({gig.review_count} review{gig.review_count !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
            </div>

            {/* Media gallery */}
            {gig.media.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <GigMediaGallery media={gig.media} title={gig.title} />
              </div>
            )}

            {/* Description */}
            <section className={styles.content} style={{ marginBottom: 40 }}>
              <h2>About this service</h2>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
                {gig.description}
              </p>
            </section>

            {/* Seller card */}
            <div style={{ marginBottom: 40 }}>
              <GigSellerCard seller={gig.seller} />
            </div>

            {/* Reviews */}
            <div style={{ marginBottom: 40 }}>
              <GigReviews
                reviews={gig.reviews}
                avgRating={gig.avg_rating}
                reviewCount={gig.review_count}
              />
            </div>

            {/* Related gigs */}
            {gig.related_gigs.length > 0 && (
              <RelatedGigs gigs={gig.related_gigs} />
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className={styles.sidebar}>
            <GigPackageSelector
              packages={gig.packages}
              gigId={gig.id}
              sellerAvailable={gig.seller.is_available}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
