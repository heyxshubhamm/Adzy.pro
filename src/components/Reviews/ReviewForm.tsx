"use client";

import { useState } from "react";
import styles from "./ReviewForm.module.css";

interface Props {
  orderId: string;
  token: string;
  onSubmitted?: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReviewForm({ orderId, token, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/orders/${orderId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Failed to submit review"
        );
      }
      setDone(true);
      onSubmitted?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className={styles.success}>
        <span className={styles.successIcon}>★</span>
        <p>Review submitted! Thank you for your feedback.</p>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${styles.star} ${star <= (hovered || rating) ? styles.filled : ""}`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(star)}
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
        {rating > 0 && (
          <span className={styles.ratingLabel}>
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </span>
        )}
      </div>

      <textarea
        className={styles.textarea}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience (optional)…"
        rows={3}
        maxLength={1000}
      />

      {error && <p className={styles.error}>{error}</p>}

      <button
        className={styles.submitBtn}
        onClick={submit}
        disabled={submitting}
      >
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </div>
  );
}
