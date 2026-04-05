"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface WalletData {
  id: string;
  balance: number;
  currency: string;
  updated_at: string;
  transactions: Array<{
    id: string;
    amount: number;
    transaction_type: string;
    description: string;
    status: string;
    created_at: string;
  }>;
}

interface Withdrawal {
  id: string;
  amount: number;
  method: string;
  status: string;
  admin_notes: string | null;
  requested_at: string;
  processed_at: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  credit: "#1D9E75", debit: "#DC2626", commission: "#7C3AED",
  refund: "#2563EB", withdrawal: "#D97706",
};

export default function WalletPage() {
  const [wallet,      setWallet]      = useState<WalletData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tab,         setTab]         = useState<"overview" | "withdraw">("overview");
  const [method,      setMethod]      = useState("paypal");
  const [amount,      setAmount]      = useState("");
  const [details,     setDetails]     = useState({ paypal_email: "", account_holder: "", account_number: "", ifsc: "" });
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");
  const [loading,     setLoading]     = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [w, wr] = await Promise.all([
      apiFetch<WalletData>("/wallet/me").catch(() => null),
      apiFetch<Withdrawal[]>("/wallet/withdrawals").catch(() => []),
    ]);
    setWallet(w as WalletData | null);
    setWithdrawals(wr as Withdrawal[]);
    setLoading(false);
  }

  async function submitWithdrawal() {
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      await apiFetch("/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: parseFloat(amount), method, details }),
      });
      setSuccess("Withdrawal request submitted! An admin will process it within 1-3 business days.");
      setAmount(""); setDetails({ paypal_email: "", account_holder: "", account_number: "", ifsc: "" });
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e?.message || "Failed to submit withdrawal");
    } finally {
      setSubmitting(false);
    }
  }

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    requested:  { bg: "#FEF9C3", color: "#854D0E" },
    processing: { bg: "#DBEAFE", color: "#1E40AF" },
    completed:  { bg: "#DCFCE7", color: "#166534" },
    rejected:   { bg: "#FEE2E2", color: "#991B1B" },
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300,
      color: "var(--text-muted)" }}>Loading wallet…</div>
  );

  return (
    <div style={{ maxWidth: 780, paddingBottom: 64 }}>
      {/* Balance Card */}
      <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: 16, padding: 32, marginBottom: 32, color: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: ".1em", opacity: 0.8, marginBottom: 8 }}>Available Balance</div>
        <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 4 }}>
          ${wallet?.balance?.toFixed(2) ?? "0.00"}
        </div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>{wallet?.currency || "USD"} — Adzy Seller Wallet</div>
        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button onClick={() => setTab("withdraw")}
            style={{ padding: "10px 24px", borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            💸 Withdraw Funds
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--border)", marginBottom: 24 }}>
        {(["overview", "withdraw"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 18px", fontSize: 13, background: "none", border: "none",
            borderBottom: `2px solid ${tab === t ? "var(--primary)" : "transparent"}`,
            color: tab === t ? "var(--foreground)" : "var(--text-muted)",
            cursor: "pointer", fontFamily: "inherit", fontWeight: tab === t ? 600 : 400,
          }}>
            {t === "overview" ? "Transaction History" : "Request Withdrawal"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)",
            textTransform: "uppercase", marginBottom: 16, letterSpacing: ".04em" }}>
            Recent Transactions
          </h3>
          {(wallet?.transactions?.length ?? 0) === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
              No transactions yet. Earnings appear here after orders are completed.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
              {wallet!.transactions.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 8, border: "0.5px solid var(--border)",
                  background: "var(--background)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {t.transaction_type} · {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15,
                    color: t.amount >= 0 ? TYPE_COLORS.credit : TYPE_COLORS.debit }}>
                    {t.amount >= 0 ? "+" : ""}${t.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {withdrawals.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)",
                textTransform: "uppercase", marginBottom: 16, letterSpacing: ".04em" }}>
                Withdrawal History
              </h3>
              <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "0.5px solid var(--border)", background: "var(--secondary)" }}>
                      {["Amount", "Method", "Status", "Notes", "Date"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11,
                          fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map(w => {
                      const sc = STATUS_COLORS[w.status] || STATUS_COLORS.requested;
                      return (
                        <tr key={w.id} style={{ borderBottom: "0.5px solid var(--border)" }}>
                          <td style={{ padding: "12px 14px", fontWeight: 600 }}>${w.amount.toFixed(2)}</td>
                          <td style={{ padding: "12px 14px", textTransform: "capitalize" }}>{w.method.replace("_", " ")}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                              background: sc.bg, color: sc.color }}>
                              {w.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: 12 }}>
                            {w.admin_notes || "—"}
                          </td>
                          <td style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: 12 }}>
                            {new Date(w.requested_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {tab === "withdraw" && (
        <div style={{ maxWidth: 480 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
            Request a payout from your wallet. Minimum withdrawal is $10.00. 
            Processed by our team within 1-3 business days.
          </p>

          {error && (
            <div style={{ padding: "12px 16px", borderRadius: 8, background: "#FEE2E2",
              color: "#991B1B", fontSize: 13, marginBottom: 16 }}>{error}</div>
          )}
          {success && (
            <div style={{ padding: "12px 16px", borderRadius: 8, background: "#DCFCE7",
              color: "#166534", fontSize: 13, marginBottom: 16 }}>{success}</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={labelStyle}>Amount (USD)</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, color: "var(--text-muted)" }}>$</span>
                <input type="number" min="10" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="0.00"
                  style={{ ...inputStyle, paddingLeft: 28 }} />
              </div>
              {wallet && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Available: ${wallet.balance.toFixed(2)}
                  {parseFloat(amount) > 0 && (
                    <> · After: ${(wallet.balance - parseFloat(amount)).toFixed(2)}</>
                  )}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Payout Method</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {["paypal", "bank_transfer", "crypto"].map(m => (
                  <button key={m} onClick={() => setMethod(m)}
                    style={{ padding: "12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                      border: `1.5px solid ${method === m ? "var(--primary)" : "var(--border)"}`,
                      background: method === m ? "var(--secondary)" : "var(--background)",
                      color: method === m ? "var(--primary)" : "var(--foreground)",
                      cursor: "pointer", fontFamily: "inherit" }}>
                    {m === "paypal" ? "🅿️ PayPal" : m === "bank_transfer" ? "🏦 Bank" : "₿ Crypto"}
                  </button>
                ))}
              </div>
            </div>

            {method === "paypal" && (
              <div>
                <label style={labelStyle}>PayPal Email</label>
                <input value={details.paypal_email} onChange={e => setDetails(d => ({ ...d, paypal_email: e.target.value }))}
                  placeholder="you@example.com" style={inputStyle} />
              </div>
            )}

            {method === "bank_transfer" && (
              <>
                <div>
                  <label style={labelStyle}>Account Holder Name</label>
                  <input value={details.account_holder} onChange={e => setDetails(d => ({ ...d, account_holder: e.target.value }))}
                    placeholder="John Doe" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Account Number</label>
                  <input value={details.account_number} onChange={e => setDetails(d => ({ ...d, account_number: e.target.value }))}
                    placeholder="0000000000" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>IFSC / SWIFT / BIC Code</label>
                  <input value={details.ifsc} onChange={e => setDetails(d => ({ ...d, ifsc: e.target.value }))}
                    placeholder="HDFC0001234" style={inputStyle} />
                </div>
              </>
            )}

            {method === "crypto" && (
              <div>
                <label style={labelStyle}>Wallet Address (USDT TRC-20)</label>
                <input value={details.account_number}
                  onChange={e => setDetails(d => ({ ...d, account_number: e.target.value }))}
                  placeholder="T..." style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} />
              </div>
            )}

            <button onClick={submitWithdrawal}
              disabled={submitting || !amount || parseFloat(amount) < 10 ||
                (wallet ? parseFloat(amount) > wallet.balance : false)}
              style={{ padding: "14px", borderRadius: 10, border: "none",
                background: "var(--primary)", color: "#fff", fontSize: 15,
                fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                opacity: (submitting || !amount || parseFloat(amount) < 10) ? 0.5 : 1 }}>
              {submitting ? "Submitting…" : `Request Withdrawal · $${parseFloat(amount || "0").toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 8,
  border: "0.5px solid var(--border)", background: "var(--background)",
  color: "var(--foreground)", fontFamily: "inherit", boxSizing: "border-box",
};
