"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGigFormStore } from "@/store/gigFormStore";
import { apiFetch } from "@/lib/apiFetch";
import { useRouter } from "next/navigation";
import styles from "./GigWizard.module.css";

export default function CreateListingWizard() {
  const { user, loading } = useAuth();
  const { step, setStep, data, updateData, reset } = useGigFormStore();
  const router = useRouter();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [gigId, setGigId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "seller")) {
      router.replace("/become-seller");
    }
    apiFetch<{ id: string; name: string }[]>("/categories").then(setCategories).catch(() => {});
  }, [user, loading, router]);

  // Step 1 — store only, no API call yet
  function handleOverviewNext(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep(2);
  }

  // Step 2 — store only
  function handlePricingNext(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const basic = data.packages.find((p) => p.tier === "basic");
    if (!basic?.name || !basic?.description) {
      setError("Basic package name and description are required.");
      return;
    }
    setError("");
    setStep(3);
  }

  // Step 3 — create gig with all collected data
  async function handleRequirementsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const endpoint = gigId ? `/gigs/${gigId}` : "/gigs";
      const method = gigId ? "PATCH" : "POST";
      const res = await apiFetch<{ id: string }>(endpoint, {
        method,
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          category_id: data.category_id,
          subcategory: data.subcategory || undefined,
          tags: data.tags,
          packages: data.packages.filter((p) => p.name && p.description),
          requirements: data.requirements.filter((r) => r.question),
        }),
      });
      setGigId(res.id);
      setStep(4);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save gig.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !gigId) return;

    try {
      const { upload_url, s3_key, public_url } = await apiFetch<{
        upload_url: string;
        s3_key: string;
        public_url: string;
      }>(`/gigs/${gigId}/media/presign`, {
        method: "POST",
        body: JSON.stringify({ filename: file.name, content_type: file.type, media_type: "image" }),
      });

      await fetch(upload_url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      await apiFetch(`/gigs/${gigId}/media/confirm`, {
        method: "POST",
        body: JSON.stringify({ s3_key, public_url, media_type: "image" }),
      });

      updateData({ media: [...data.media, { s3_key, url: public_url, is_cover: data.media.length === 0 }] });
    } catch {
      setError("Image upload failed. Please try again.");
    }
  }

  async function finalPublish() {
    if (!gigId) return;
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`/gigs/${gigId}/publish`, { method: "POST" });
      reset();
      router.push("/dashboard/gigs?created=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Publish failed. Check all requirements.");
    } finally {
      setSubmitting(false);
    }
  }

  // Package helpers
  function updatePackage(tier: "basic" | "standard" | "premium", field: string, value: string | number) {
    const updated = data.packages.map((p) =>
      p.tier === tier ? { ...p, [field]: value } : p
    );
    updateData({ packages: updated });
  }

  function togglePackage(tier: "standard" | "premium") {
    const exists = data.packages.some((p) => p.tier === tier);
    if (exists) {
      updateData({ packages: data.packages.filter((p) => p.tier !== tier) });
    } else {
      updateData({
        packages: [
          ...data.packages,
          { tier, name: "", description: "", price: tier === "standard" ? 25 : 50, delivery_days: 3 },
        ],
      });
    }
  }

  // Requirement helpers
  function addRequirement() {
    updateData({ requirements: [...data.requirements, { question: "", is_required: true }] });
  }

  function updateRequirement(index: number, field: string, value: string | boolean) {
    const updated = data.requirements.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    updateData({ requirements: updated });
  }

  function removeRequirement(index: number) {
    updateData({ requirements: data.requirements.filter((_, i) => i !== index) });
  }

  if (loading) return null;

  const basicPkg = data.packages.find((p) => p.tier === "basic") ?? data.packages[0];
  const standardPkg = data.packages.find((p) => p.tier === "standard");
  const premiumPkg = data.packages.find((p) => p.tier === "premium");

  return (
    <div className={styles.wizardContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Create a New Service</h1>
        <div className={styles.stepper}>
          {(["Overview", "Pricing", "Requirements", "Gallery"] as const).map((label, i) => (
            <div key={label} className={`${styles.stepNode} ${step >= i + 1 ? styles.active : ""}`}>
              {label}
            </div>
          ))}
        </div>
      </header>

      {error && (
        <div style={{ marginBottom: 24, padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#f87171", fontSize: 14 }}>
          {error}
        </div>
      )}

      <main className={styles.activeForm}>
        {/* ── Step 1: Overview ── */}
        {step === 1 && (
          <form onSubmit={handleOverviewNext} className={styles.stepForm}>
            <div className={styles.field}>
              <label>Service Title</label>
              <input
                value={data.title}
                onChange={(e) => updateData({ title: e.target.value })}
                required
                minLength={15}
                maxLength={80}
                placeholder="e.g. I will design a professional logo for your brand"
              />
            </div>
            <div className={styles.field}>
              <label>Category</label>
              <select
                value={data.category_id}
                onChange={(e) => updateData({ category_id: e.target.value })}
                required
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Description (min 120 characters)</label>
              <textarea
                value={data.description}
                onChange={(e) => updateData({ description: e.target.value })}
                required
                minLength={120}
                rows={6}
                placeholder="Describe what you'll deliver, your process, and why buyers should choose you..."
              />
            </div>
            <div className={styles.field}>
              <label>Tags (comma-separated, 1–5)</label>
              <input
                value={data.tags.join(", ")}
                onChange={(e) =>
                  updateData({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5) })
                }
                placeholder="e.g. logo design, branding, illustration"
              />
            </div>
            <button type="submit" className={styles.submitBtn}>Continue to Pricing</button>
          </form>
        )}

        {/* ── Step 2: Pricing ── */}
        {step === 2 && (
          <form onSubmit={handlePricingNext} className={styles.stepForm}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 8 }}>
              Basic package is required. Add Standard and Premium for upsells.
            </p>

            {/* Basic — always shown */}
            <PackageCard
              tier="basic"
              pkg={basicPkg}
              required
              onChange={(field, val) => updatePackage("basic", field, val)}
            />

            {/* Standard — toggleable */}
            <PackageToggle
              label="+ Add Standard package"
              active={!!standardPkg}
              onToggle={() => togglePackage("standard")}
            />
            {standardPkg && (
              <PackageCard
                tier="standard"
                pkg={standardPkg}
                onChange={(field, val) => updatePackage("standard", field, val)}
              />
            )}

            {/* Premium — toggleable */}
            <PackageToggle
              label="+ Add Premium package"
              active={!!premiumPkg}
              onToggle={() => togglePackage("premium")}
            />
            {premiumPkg && (
              <PackageCard
                tier="premium"
                pkg={premiumPkg}
                onChange={(field, val) => updatePackage("premium", field, val)}
              />
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" onClick={() => setStep(1)} className={styles.submitBtn} style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>
                Back
              </button>
              <button type="submit" className={styles.submitBtn} style={{ flex: 1 }}>
                Continue to Requirements
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3: Requirements ── */}
        {step === 3 && (
          <form onSubmit={handleRequirementsSubmit} className={styles.stepForm}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
              Add questions you need answered before starting work. Optional — skip if none needed.
            </p>

            {data.requirements.map((req, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input
                  value={req.question}
                  onChange={(e) => updateRequirement(i, "question", e.target.value)}
                  placeholder={`Question ${i + 1}`}
                  style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 18px", color: "#fff", fontSize: 15 }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.6)", fontSize: 13, whiteSpace: "nowrap", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={req.is_required}
                    onChange={(e) => updateRequirement(i, "is_required", e.target.checked)}
                  />
                  Required
                </label>
                <button
                  type="button"
                  onClick={() => removeRequirement(i)}
                  style={{ background: "rgba(239,68,68,0.15)", border: "none", color: "#f87171", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addRequirement}
              style={{ background: "rgba(0,240,255,0.08)", border: "1px dashed rgba(0,240,255,0.3)", color: "#00f0ff", borderRadius: 12, padding: "14px", fontSize: 14, cursor: "pointer", fontWeight: 700 }}
            >
              + Add a question
            </button>

            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" onClick={() => setStep(2)} className={styles.submitBtn} style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>
                Back
              </button>
              <button type="submit" disabled={submitting} className={styles.submitBtn} style={{ flex: 1 }}>
                {submitting ? "Saving…" : "Continue to Gallery"}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 4: Gallery ── */}
        {step === 4 && (
          <div className={styles.stepForm}>
            <h2 className={styles.subtitle ?? ""}>Add images to showcase your service</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>At least one image required to publish. Max 5.</p>
            <div className={styles.mediaGrid}>
              {data.media.map((m) => (
                <div
                  key={m.s3_key}
                  className={styles.mediaSlot}
                  style={{ backgroundImage: `url(${m.url})` }}
                />
              ))}
              {data.media.length < 5 && (
                <label className={styles.uploadBox}>
                  <span>+ Upload Image</span>
                  <input type="file" hidden onChange={handleGalleryUpload} accept="image/*" />
                </label>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button type="button" onClick={() => setStep(3)} className={styles.submitBtn} style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>
                Back
              </button>
              <button
                onClick={finalPublish}
                disabled={submitting || data.media.length === 0}
                className={`${styles.submitBtn} ${styles.publish}`}
                style={{ flex: 1 }}
              >
                {submitting ? "Publishing…" : "Publish Service"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ──

type PkgData = { tier: string; name: string; description: string; price: number | string; delivery_days: number | string };

function PackageCard({
  tier,
  pkg,
  required = false,
  onChange,
}: {
  tier: string;
  pkg: PkgData;
  required?: boolean;
  onChange: (field: string, value: string | number) => void;
}) {
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#00f0ff", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em" }}>{tierLabel}</span>
        {required && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Required</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <input
          value={pkg.name}
          onChange={(e) => onChange("name", e.target.value)}
          required={required}
          placeholder="Package name"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14 }}
        />
        <input
          type="number"
          value={pkg.price}
          onChange={(e) => onChange("price", parseFloat(e.target.value) || 0)}
          required={required}
          min={1}
          placeholder="Price ($)"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14 }}
        />
      </div>
      <textarea
        value={pkg.description}
        onChange={(e) => onChange("description", e.target.value)}
        required={required}
        placeholder="What's included in this package?"
        rows={2}
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, resize: "vertical" }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
          Delivery (days)
          <input
            type="number"
            value={pkg.delivery_days}
            onChange={(e) => onChange("delivery_days", parseInt(e.target.value) || 1)}
            required={required}
            min={1}
            max={365}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14 }}
          />
        </label>
      </div>
    </div>
  );
}

function PackageToggle({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        background: active ? "rgba(0,240,255,0.08)" : "transparent",
        border: `1px dashed ${active ? "rgba(0,240,255,0.4)" : "rgba(255,255,255,0.1)"}`,
        color: active ? "#00f0ff" : "rgba(255,255,255,0.4)",
        borderRadius: 12,
        padding: "12px 20px",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {active ? label.replace("+ Add", "− Remove") : label}
    </button>
  );
}
