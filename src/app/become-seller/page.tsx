"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./BecomeSeller.module.css";

// Layer 1: Professional Enrollment Engine (Seller Onboarding)
export default function BecomeSellerPage() {
  const { refetch, user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    display_name: "", bio: "", skills: "", languages: "", country: "", response_time: 24,
  });
  const [error, setError] = useState("");

  if (user?.role === "seller") {
    router.replace("/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/roles/become-seller`, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include", // Essential for session authority
        body: JSON.stringify({
          ...form,
          skills:        form.skills.split(",").map(s => s.trim()),
          languages:     form.languages.split(",").map(s => s.trim()),
          response_time: Number(form.response_time),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Industrialization of your account failed. Check credentials.");
        return;
      }

      await refetch(); // Recalibrate session authority
      router.push("/dashboard");
    } catch (err) {
      setError("System connection interrupted. Telemetry not received.");
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>System Enrollment: Become a Publisher</h1>
      <p className={styles.subtitle}>Execute your entry into the Adzy.pro elite marketplace.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {step === 1 && (
          <div className={styles.step}>
            <div className={styles.inputGroup}>
              <label>Professional Display Name</label>
              <input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} required />
            </div>
            <div className={styles.inputGroup}>
              <label>Seller Biography (Min 20 chars)</label>
              <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} required />
            </div>
            <button type="button" className={styles.nextBtn} onClick={() => setStep(2)}>Next Step →</button>
          </div>
        )}
        {step === 2 && (
          <div className={styles.step}>
            <div className={styles.inputGroup}>
              <label>Core Skills (Comma-separated)</label>
              <input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} required />
            </div>
            <div className={styles.inputGroup}>
              <label>Operational Region (Country)</label>
              <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} required />
            </div>
            <div className={styles.inputGroup}>
              <label>Target Response Time (Hours)</label>
              <select value={form.response_time} onChange={e => setForm({ ...form, response_time: Number(e.target.value) })}>
                <option value={1}>Immediate: 1 Hour</option>
                <option value={4}>Urgent: 4 Hours</option>
                <option value={24}>Standard: 24 Hours</option>
              </select>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.submitBtn}>Initialize Professional Profile</button>
          </div>
        )}
      </form>
    </div>
  );
}
