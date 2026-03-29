"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { PackageOut } from "@/types/gig";

interface Props {
  packages: PackageOut[];
  gigId: string;
  sellerAvailable: boolean;
}

const TIER_ORDER = { basic: 0, standard: 1, premium: 2 } as const;
const TIER_COLOR: Record<string, string> = {
  basic: "#6b7280",
  standard: "#7b5ea7",
  premium: "#0d9488",
};

export function GigPackageSelector({ packages, gigId, sellerAvailable }: Props) {
  const sorted = [...packages].sort(
    (a, b) => (TIER_ORDER[a.tier] ?? 0) - (TIER_ORDER[b.tier] ?? 0)
  );
  const [active, setActive] = useState(sorted[0]);
  const router = useRouter();
  const { user } = useAuth();

  function handleOrder() {
    if (!user) {
      router.push(`/login?next=/gigs/${gigId}`);
      return;
    }
    router.push(`/order/${gigId}?package=${active.id}`);
  }

  function handleContact() {
    if (!user) {
      router.push(`/login?next=/gigs/${gigId}`);
      return;
    }
    router.push(`/dashboard/orders`);
  }

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      {/* Tier tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {sorted.map((pkg) => (
          <button
            key={pkg.tier}
            onClick={() => setActive(pkg)}
            style={{
              flex: 1,
              padding: "12px 8px",
              background: active.id === pkg.id ? "rgba(255,255,255,0.04)" : "transparent",
              border: "none",
              borderBottom: `2px solid ${active.id === pkg.id ? TIER_COLOR[pkg.tier] : "transparent"}`,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: active.id === pkg.id ? 700 : 400,
              color:
                active.id === pkg.id ? TIER_COLOR[pkg.tier] : "rgba(255,255,255,0.4)",
              transition: "all 0.15s",
            }}
          >
            {pkg.tier.charAt(0).toUpperCase() + pkg.tier.slice(1)}
          </button>
        ))}
      </div>

      {/* Package details */}
      <div style={{ padding: "20px 20px 0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{active.name}</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>
            ${Number(active.price).toFixed(0)}
          </span>
        </div>

        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.6,
            margin: "0 0 16px",
          }}
        >
          {active.description}
        </p>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {active.delivery_days} day{active.delivery_days > 1 ? "s" : ""} delivery
          </span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 .49-4" />
            </svg>
            {active.revisions === -1 ? "Unlimited" : active.revisions} revision
            {active.revisions !== 1 && active.revisions !== -1 ? "s" : ""}
          </span>
        </div>

        {active.features.length > 0 && (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 16px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {active.features.map((f, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ flexShrink: 0, marginTop: 2 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CTAs */}
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {!sellerAvailable && (
          <p
            style={{
              fontSize: 12,
              color: "#fbbf24",
              textAlign: "center",
              margin: 0,
            }}
          >
            Seller is currently unavailable for new orders
          </p>
        )}
        <button
          onClick={handleOrder}
          disabled={!sellerAvailable}
          style={{
            padding: "13px 0",
            width: "100%",
            background: sellerAvailable
              ? "linear-gradient(135deg, #00f0ff 0%, #7b5ea7 100%)"
              : "rgba(255,255,255,0.06)",
            color: sellerAvailable ? "#000" : "rgba(255,255,255,0.3)",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: sellerAvailable ? "pointer" : "not-allowed",
          }}
        >
          Continue (${Number(active.price).toFixed(0)})
        </button>
        <button
          onClick={handleContact}
          style={{
            padding: "11px 0",
            width: "100%",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            fontSize: 14,
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
          }}
        >
          Contact seller
        </button>
      </div>
    </div>
  );
}
