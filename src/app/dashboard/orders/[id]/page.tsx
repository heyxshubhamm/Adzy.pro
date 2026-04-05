import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import styles from "../../Dashboard.module.css";
import detailStyles from "./OrderDetail.module.css";
import Link from "next/link";
import OrderChat from "@/components/Chat/OrderChat";
import ReviewForm from "@/components/Reviews/ReviewForm";
import DisputePanel from "@/components/Dispute/DisputePanel";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const [orderRes, reviewRes] = await Promise.all([
    fetch(`${API}/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
    fetch(`${API}/orders/${id}/review`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null),
  ]);

  if (!orderRes.ok) notFound();

  const order = await orderRes.json();
  // review may not exist yet (404 is expected)
  const existingReview =
    reviewRes?.ok ? await reviewRes.json().catch(() => null) : null;

  const statusClass = styles[order.status?.toLowerCase()] ?? "";
  const isCompleted = order.status === "COMPLETED";
  const isDisputed = order.status === "DISPUTED";
  const canReview = isCompleted && !existingReview;
  const canDispute = ["PAID", "IN_PROGRESS", "COMPLETED"].includes(order.status) && !isDisputed;

  return (
    <div className={detailStyles.detailPage}>
      <header className={detailStyles.header}>
        <Link href="/dashboard/orders" className={detailStyles.backLink}>
          ← Back to Orders
        </Link>
        <div className={detailStyles.titleGroup}>
          <h1 className={detailStyles.title}>
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <span className={`${styles.badge} ${statusClass}`}>
            {order.status}
          </span>
        </div>
      </header>

      <div className={detailStyles.contentGrid}>
        <div className={detailStyles.mainCard}>
          {/* Service Details */}
          <section className={detailStyles.section}>
            <h3>Service Details</h3>
            <div className={detailStyles.metaGrid}>
              <div className={detailStyles.metaItem}>
                <label>Service</label>
                <span>{order.gig?.title ?? "—"}</span>
              </div>
              <div className={detailStyles.metaItem}>
                <label>Target URL</label>
                <a href={order.target_url} target="_blank" rel="noopener noreferrer">
                  {order.target_url}
                </a>
              </div>
              <div className={detailStyles.metaItem}>
                <label>Anchor Text</label>
                <span>{order.anchor_text}</span>
              </div>
              <div className={detailStyles.metaItem}>
                <label>Price</label>
                <span>${order.price}</span>
              </div>
            </div>
          </section>

          {/* Fulfillment */}
          <section className={detailStyles.section}>
            <h3>Fulfillment</h3>
            {isCompleted && order.proof_url ? (
              <div className={detailStyles.proofBox}>
                <div className={detailStyles.aiBadge}>COMPLETED</div>
                <p>Proof URL:</p>
                <a
                  href={order.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={detailStyles.proofUrl}
                >
                  {order.proof_url}
                </a>
              </div>
            ) : (
              <div className={detailStyles.pendingBox}>
                <div className={detailStyles.pulseDot} />
                <p>
                  {order.status === "IN_PROGRESS"
                    ? "Seller is working on your order…"
                    : order.status === "PAID"
                    ? "Awaiting seller to start delivery…"
                    : order.status === "DISPUTED"
                    ? "Order is under dispute review."
                    : "Order is pending payment confirmation."}
                </p>
              </div>
            )}
          </section>

          {/* Review (buyer only, after completion) */}
          {canReview && (
            <section className={detailStyles.section}>
              <h3>Leave a Review</h3>
              <ReviewForm orderId={order.id} token={token} />
            </section>
          )}

          {existingReview && (
            <section className={detailStyles.section}>
              <h3>Your Review</h3>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: i < existingReview.rating ? "#f59e0b" : "rgba(255,255,255,0.2)", fontSize: 18 }}>★</span>
                ))}
              </div>
              {existingReview.comment && (
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.6 }}>
                  {existingReview.comment}
                </p>
              )}
            </section>
          )}

          {/* Chat */}
          <section className={detailStyles.section}>
            <h3>Messages</h3>
            <OrderChat orderId={order.id} token={token} />
          </section>
        </div>

        {/* Sidebar */}
        <aside className={detailStyles.sidebar}>
          <div className={detailStyles.actionCard}>
            <h3>Order Status</h3>
            <p>Current: <strong>{order.status}</strong></p>
            {order.status === "PENDING" && (
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 8 }}>
                Awaiting payment confirmation.
              </p>
            )}
            {order.status === "PAID" && (
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 8 }}>
                Seller has been notified and will begin soon.
              </p>
            )}
          </div>

          {/* Dispute */}
          {(canDispute || isDisputed) && (
            <div className={detailStyles.actionCard} style={{ marginTop: 16 }}>
              <h3>Dispute</h3>
              <DisputePanel
                orderId={order.id}
                isDisputed={isDisputed}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
