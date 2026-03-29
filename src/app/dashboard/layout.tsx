import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { redirect } from "next/navigation";
import styles from "./Dashboard.module.css";
import Link from "next/link";

export default async function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/login");
  }

  let role = "buyer";
  let email = "";
  
  try {
    const decoded = jwtDecode<{ role: string; email: string }>(token);
    role = decoded.role;
    email = decoded.email;
  } catch (e) {
    redirect("/login");
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{email.charAt(0).toUpperCase()}</div>
          <div className={styles.details}>
            <span className={styles.userName}>{email.split('@')[0]}</span>
            <span className={styles.userRole}>{role === 'seller' ? 'Publisher' : 'Buyer'}</span>
          </div>
        </div>
        
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            <li><Link href="/dashboard" className={styles.navLink}>Overview</Link></li>
            {role === 'seller' && (
              <>
                <li><Link href="/dashboard/gigs" className={styles.navLink}>My Services</Link></li>
                <li><Link href="/dashboard/orders" className={styles.navLink}>Service Orders</Link></li>
                <li><Link href="/dashboard/kyc" className={styles.navLink}>Identity Verification</Link></li>
              </>
            )}
            {role === 'buyer' && (
              <li><Link href="/dashboard/orders" className={styles.navLink}>My Orders</Link></li>
            )}
            <li><Link href="/dashboard/settings" className={styles.navLink}>Account Settings</Link></li>
          </ul>
        </nav>
      </aside>
      
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
