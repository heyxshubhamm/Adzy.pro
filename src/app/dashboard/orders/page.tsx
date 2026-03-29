import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { redirect } from "next/navigation";
import styles from "../Dashboard.module.css";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; role?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const { role } = jwtDecode<{ role: string }>(token);
  const orderRole = params.role ?? (role === "seller" ? "seller" : "buyer");
  const isSuccess = params.success === "true";

  const response = await fetch(`${API}/orders?role=${orderRole}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return (
      <div style={{ padding: "2rem", color: "rgba(255,255,255,0.4)" }}>
        Unable to load orders.
      </div>
    );
  }

  const orders = await response.json();

  return (
    <div>
      {isSuccess && (
        <div className={styles.successPanel}>
          <div className={styles.pulseDot} />
          <div>
            <h3 className={styles.successTitle}>Order placed successfully</h3>
            <p className={styles.successText}>
              Your order has been submitted. The seller will be notified.
            </p>
          </div>
        </div>
      )}

      <h1 className={styles.pageTitle}>
        {orderRole === "seller" ? "Service Orders" : "My Purchases"}
      </h1>

      <div className={styles.tableContainer}>
        {orders.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Price</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id}>
                  <td>
                    <div className={styles.siteInfo}>
                      <span className={styles.siteName}>
                        {order.gig?.title ?? "—"}
                      </span>
                      {order.gig?.tags?.[0] && (
                        <span className={styles.niche}>
                          #{order.gig.tags[0]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>${order.price}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        styles[order.status?.toLowerCase()] ?? ""
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className={styles.viewLink}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <p>No orders found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
