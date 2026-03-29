import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { redirect } from "next/navigation";
import styles from "./Dashboard.module.css";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/login");
  }

  // Layer 2: Intelligence Sync (FastAPI Command Center)
  const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/admin/stats`, {
      headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (!statsResponse.ok) {
    return <div className="p-8 text-white opacity-50">INITIATING TELEMETRY...</div>;
  }
  
  const stats = await statsResponse.json();
  const { role } = jwtDecode<{ role: string }>(token);

  return (
    <div>
      <h1 className={styles.pageTitle}>Dashboard Overview</h1>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Projects</span>
          <span className={styles.statValue}>{stats.total_orders || 0}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active Telemetry</span>
          <span className={styles.statValue}>{stats.total_listings || 0}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{role === 'seller' ? 'Revenue' : 'Investment'}</span>
          <span className={styles.statValue}>${stats.total_revenue || "0.00"}</span>
        </div>
      </div>

      <div className={styles.recentActivity}>
        <h2>Recent Activity</h2>
        <div className={styles.emptyState}>
          <p>No recent activity found. Start by {role === 'SELLER' ? 'adding a listing' : 'buying a placement'}.</p>
        </div>
      </div>
    </div>
  );
}
