"use client";

import { useState } from "react";
import styles from "./DisputePanel.module.css";

interface Props {
  orderId: string;
  token: string;
  isDisputed: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DisputePanel({ orderId, token, isDisputed }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(isDisputed);
  const [error, setError] = useState("");

  if (submitted || isDisputed) {
    return (
      <p className={styles.disputeActive}>
        ⚠ A dispute has been filed for this order. Our team will review it within 2 business days.
      </p>
    );
  }

  const submit = async () => {
    if (reason.trim().length < 20) {
      setError("Please describe your reason in at least 20 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/orders/${orderId}/dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: reason.trim(),
          ...(evidenceUrl.trim() ? { evidence_url: evidenceUrl.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Failed to open dispute"
        );
      }
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button className={styles.openBtn} onClick={() => setOpen(true)}>
        Open a Dispute
      </button>
    );
  }

  return (
    <div className={styles.form}>
      <p className={styles.warning}>
        Only open a dispute if you believe there is a genuine issue with this order.
        False disputes may affect your account standing.
      </p>

      <label className={styles.label}>
        Reason <span className={styles.required}>*</span>
      </label>
      <textarea
        className={styles.textarea}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Describe the problem in detail (min 20 characters)…"
        rows={4}
        maxLength={2000}
      />

      <label className={styles.label}>Evidence URL (optional)</label>
      <input
        className={styles.input}
        type="url"
        value={evidenceUrl}
        onChange={(e) => setEvidenceUrl(e.target.value)}
        placeholder="https://screenshot.example.com/proof.png"
      />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.btnRow}>
        <button
          className={styles.cancelBtn}
          onClick={() => setOpen(false)}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          className={styles.submitBtn}
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "File Dispute"}
        </button>
      </div>
    </div>
  );
}
