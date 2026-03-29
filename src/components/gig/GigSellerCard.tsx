import Link from "next/link";
import type { SellerPublicOut } from "@/types/gig";

const LEVEL_COLORS: Record<string, string> = {
  new: "#6b7280",
  level1: "#7b5ea7",
  level2: "#0d9488",
  top_rated: "#f59e0b",
};
const LEVEL_LABELS: Record<string, string> = {
  new: "New Seller",
  level1: "Level 1",
  level2: "Level 2",
  top_rated: "Top Rated",
};

export function GigSellerCard({ seller }: { seller: SellerPublicOut }) {
  const level = seller.seller_level ?? "new";
  const levelColor = LEVEL_COLORS[level] ?? "#6b7280";

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
        About the seller
      </h2>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(0,240,255,0.1)",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
              color: "#00f0ff",
            }}
          >
            {seller.avatar_url ? (
              <img
                src={seller.avatar_url}
                alt={seller.username}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              seller.username[0].toUpperCase()
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                {seller.display_name ?? seller.username}
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 20,
                  fontWeight: 600,
                  background: `${levelColor}22`,
                  color: levelColor,
                  border: `1px solid ${levelColor}44`,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {LEVEL_LABELS[level] ?? level}
              </span>
            </div>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              @{seller.username}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {[
            { label: "Orders done", value: seller.completed_orders },
            {
              label: "Avg rating",
              value: seller.avg_rating ? Number(seller.avg_rating).toFixed(1) : "—",
            },
            {
              label: "Response",
              value: seller.response_time ? `${seller.response_time}h` : "—",
            },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "12px 0",
                textAlign: "center",
                borderRight:
                  i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {seller.bio && (
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {seller.bio}
          </p>
        )}

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {seller.languages && seller.languages.length > 0 && (
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>Languages: </span>
              {seller.languages.join(", ")}
            </span>
          )}
          {seller.country && (
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>From: </span>
              {seller.country}
            </span>
          )}
        </div>

        <Link
          href={`/sellers/${seller.username}`}
          style={{ fontSize: 13, color: "#00f0ff", textDecoration: "none" }}
        >
          View full profile →
        </Link>
      </div>
    </section>
  );
}
