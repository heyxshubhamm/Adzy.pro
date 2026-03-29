"use client";
import { useState } from "react";
import { StarRating } from "@/components/StarRating";
import type { ReviewOut } from "@/types/gig";

interface Props {
  reviews: ReviewOut[];
  avgRating: number | null | undefined;
  reviewCount: number;
}

export function GigReviews({ reviews, avgRating, reviewCount }: Props) {
  const [shown, setShown] = useState(4);

  if (reviewCount === 0) {
    return (
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#fff" }}>
          Reviews
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>No reviews yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
        Reviews ({reviewCount})
      </h2>

      {avgRating != null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
            padding: 16,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ fontSize: 40, fontWeight: 900, color: "#fff" }}>
            {Number(avgRating).toFixed(1)}
          </span>
          <div>
            <StarRating rating={avgRating} count={reviewCount} />
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
              {reviewCount} review{reviewCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {reviews.slice(0, shown).map((review) => (
          <div
            key={review.id}
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              paddingBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "rgba(0,240,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#00f0ff",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {review.buyer_avatar ? (
                  <img
                    src={review.buyer_avatar}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  review.buyer_name[0]?.toUpperCase() ?? "B"
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                  {review.buyer_name}
                </div>
                <StarRating rating={review.rating} />
              </div>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                {new Date(review.created_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {review.comment && (
              <p
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {review.comment}
              </p>
            )}
          </div>
        ))}
      </div>

      {shown < reviews.length && (
        <button
          onClick={() => setShown((s) => s + 4)}
          style={{
            marginTop: 16,
            fontSize: 13,
            color: "#00f0ff",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Show more reviews
        </button>
      )}
    </section>
  );
}
