"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

interface Package {
  id: string;
  tier: string;
  name: string;
  description: string;
  price: number;
  delivery_days: number;
}

interface Gig {
  id: string;
  title: string;
  description: string;
  category_id?: string;
  tags: string[];
  status: string;
  packages: Package[];
}

interface Category {
  id: string;
  name: string;
}

export default function GigEditForm({ gig, categories }: { gig: Gig; categories: Category[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(gig.title);
  const [description, setDescription] = useState(gig.description);
  const [categoryId, setCategoryId] = useState(gig.category_id ?? "");
  const [tags, setTags] = useState(gig.tags.join(", "));
  const [packages, setPackages] = useState<Package[]>(gig.packages);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updatePackage(id: string, field: string, value: string | number) {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiFetch(`/gigs/${gig.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          description,
          category_id: categoryId || undefined,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          packages: packages.map(({ tier, name, description: desc, price, delivery_days }) => ({
            tier, name, description: desc, price, delivery_days,
          })),
        }),
      });
      router.push("/dashboard/gigs");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "14px 18px",
    color: "#fff",
    fontSize: 15,
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    color: "#00f0ff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  };

  return (
    <div style={{ maxWidth: 800, margin: "60px auto", padding: "0 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 900, marginBottom: 4 }}>Edit Service</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Status: {gig.status}</p>
      </div>

      {error && (
        <div style={{ marginBottom: 24, padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#f87171", fontSize: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <label style={labelStyle}>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={15} maxLength={80} style={fieldStyle} />
        </label>

        <label style={labelStyle}>
          Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={fieldStyle}>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={120} rows={6} style={{ ...fieldStyle, resize: "vertical" }} />
        </label>

        <label style={labelStyle}>
          Tags (comma-separated)
          <input value={tags} onChange={(e) => setTags(e.target.value)} style={fieldStyle} placeholder="e.g. logo, branding, design" />
        </label>

        {packages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ ...labelStyle, display: "block" }}>Packages</span>
            {packages.map((pkg) => (
              <div key={pkg.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <span style={{ color: "#00f0ff", fontWeight: 800, fontSize: 12, textTransform: "uppercase" }}>{pkg.tier}</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <input value={pkg.name} onChange={(e) => updatePackage(pkg.id, "name", e.target.value)} placeholder="Package name" style={fieldStyle} />
                  <input type="number" value={pkg.price} onChange={(e) => updatePackage(pkg.id, "price", parseFloat(e.target.value) || 0)} min={1} style={fieldStyle} />
                </div>
                <textarea value={pkg.description} onChange={(e) => updatePackage(pkg.id, "description", e.target.value)} placeholder="What's included?" rows={2} style={{ ...fieldStyle, resize: "vertical" }} />
                <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                  Delivery (days)
                  <input type="number" value={pkg.delivery_days} onChange={(e) => updatePackage(pkg.id, "delivery_days", parseInt(e.target.value) || 1)} min={1} max={365} style={{ ...fieldStyle, width: 120 }} />
                </label>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
          <button
            type="button"
            onClick={() => router.push("/dashboard/gigs")}
            style={{ padding: "14px 28px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{ flex: 1, padding: "14px 28px", background: saving ? "rgba(0,240,255,0.4)" : "#00f0ff", border: "none", borderRadius: 12, color: "#000", fontSize: 14, fontWeight: 900, cursor: saving ? "not-allowed" : "pointer", textTransform: "uppercase" }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
