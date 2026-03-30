import Link from "next/link";
import type { RelatedGigOut } from "@/types/gig";

export function RelatedGigs({ gigs }: { gigs: RelatedGigOut[] }) {
  if (!gigs.length) return null;

  return (
    <section>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 16,
          color: "#fff",
        }}
      >
        You may also like
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {gigs.map((gig) => (
          <Link
            key={gig.id}
            href={`/gigs/${gig.slug}`}
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                overflow: "hidden",
                transition: "border-color 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "rgba(0,240,255,0.25)";
                (e.currentTarget as HTMLDivElement).style.transform =
                  "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLDivElement).style.transform = "none";
              }}
            >
              {/* Cover image */}
              <div
                style={{
                  height: 120,
                  background: "rgba(255,255,255,0.04)",
                  overflow: "hidden",
                }}
              >
                {gig.cover_url ? (
                  <img
                    src={gig.cover_url}
                    alt={gig.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.15)",
                      fontSize: 32,
                    }}
                  >
                    ◇
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: "12px 14px" }}>
                <p
                  style={{
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    margin: "0 0 8px",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {gig.title}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {gig.avg_rating != null && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#f59e0b",
                        fontWeight: 600,
                      }}
                    >
                      ★ {Number(gig.avg_rating).toFixed(1)}
                      <span
                        style={{
                          color: "rgba(255,255,255,0.35)",
                          fontWeight: 400,
                          marginLeft: 3,
                        }}
                      >
                        ({gig.review_count})
                      </span>
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#fff",
                      marginLeft: "auto",
                    }}
                  >
                    ${Number(gig.price_from).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
