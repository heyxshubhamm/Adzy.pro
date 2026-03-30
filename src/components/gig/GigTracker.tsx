"use client";
import { useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Client-side impression tracker.
 * Fires after hydration so SSR/bot crawls don't inflate view counts.
 */
export function GigTracker({ gigId }: { gigId: string }) {
  useEffect(() => {
    fetch(`${API}/gigs/${gigId}/impression`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, [gigId]);

  return null;
}
