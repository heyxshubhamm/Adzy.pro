import { ReactNode } from "react";
import Link from "next/link";
import styles from "./Admin.module.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.adminContainer}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>Adzy ADMIN</div>
        <nav className={styles.nav}>
          <Link href="/admin" className={styles.navLink}>Dashboard</Link>
          <Link href="/admin/listings" className={styles.navLink}>Listings</Link>
          <Link href="/admin/users" className={styles.navLink}>Users</Link>
          <Link href="/admin/orders" className={styles.navLink}>Orders</Link>
        </nav>
      </aside>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
