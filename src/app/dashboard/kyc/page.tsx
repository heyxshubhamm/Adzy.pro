"use client";

import { useState, useEffect } from "react";
import styles from "./KYC.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface KYCStatus {
  kyc_status: string;
  kyc_submitted_at?: string;
  kyc_rejected_reason?: string;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function KYCPage() {
  const [status, setStatus] = useState<KYCStatus | null>(null);
  const [documentUrl, setDocumentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getCookie("access_token");
    if (!token) return;

    fetch(`${API}/seller/kyc/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStatus(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!documentUrl.trim()) {
      setError("Please provide a document URL.");
      return;
    }
    const token = getCookie("access_token");
    if (!token) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/seller/kyc/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ document_url: documentUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Submission failed");
      }
      setSuccess("Document submitted. Our team will review it within 1–2 business days.");
      setStatus({ kyc_status: "pending", kyc_submitted_at: new Date().toISOString() });
      setDocumentUrl("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.page}><p className={styles.loading}>Loading…</p></div>;
  }

  const kycStatus = status?.kyc_status ?? "not_submitted";

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Identity Verification</h1>
      <p className={styles.subtext}>
        Verify your identity to unlock higher withdrawal limits and earn a verified badge on your profile.
      </p>

      <div className={styles.statusCard}>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Status</span>
          <span className={`${styles.statusBadge} ${styles[kycStatus]}`}>
            {kycStatus === "not_submitted" && "Not Submitted"}
            {kycStatus === "pending" && "Under Review"}
            {kycStatus === "verified" && "✓ Verified"}
            {kycStatus === "rejected" && "Rejected"}
          </span>
        </div>
        {status?.kyc_submitted_at && (
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Submitted</span>
            <span className={styles.statusValue}>
              {new Date(status.kyc_submitted_at).toLocaleDateString()}
            </span>
          </div>
        )}
        {kycStatus === "rejected" && status?.kyc_rejected_reason && (
          <div className={styles.rejectedBox}>
            <strong>Reason:</strong> {status.kyc_rejected_reason}
          </div>
        )}
      </div>

      {(kycStatus === "not_submitted" || kycStatus === "rejected") && (
        <div className={styles.formCard}>
          <h2 className={styles.formHeading}>Submit Your Document</h2>
          <p className={styles.formHint}>
            Upload your government-issued ID to a file hosting service (Google Drive, Dropbox, etc.),
            set it to publicly viewable, and paste the link below.
          </p>
          <label className={styles.label}>Document URL</label>
          <input
            className={styles.input}
            type="url"
            placeholder="https://drive.google.com/file/d/…"
            value={documentUrl}
            onChange={(e) => setDocumentUrl(e.target.value)}
          />
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}
          <button
            className={styles.submitBtn}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit for Review"}
          </button>
        </div>
      )}

      {kycStatus === "pending" && (
        <div className={styles.pendingBox}>
          <span className={styles.pendingIcon}>⏳</span>
          <p>Your document is under review. We typically respond within 1–2 business days.</p>
        </div>
      )}

      {kycStatus === "verified" && (
        <div className={styles.verifiedBox}>
          <span className={styles.verifiedIcon}>✓</span>
          <p>Your identity has been verified. Your profile now shows a verified badge.</p>
        </div>
      )}
    </div>
  );
}
