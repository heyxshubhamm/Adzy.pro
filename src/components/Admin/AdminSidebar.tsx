'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: '📊' },
  { name: 'Categories', path: '/admin/categories', icon: '🌳' },
  { name: 'Listings', path: '/admin/listings', icon: '🛒' },
  { name: 'Users', path: '/admin/users', icon: '👥' },
  { name: 'Settings', path: '/admin/settings', icon: '⚙️' },
];

const AdminSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Link href="/admin">
          <span className={styles.logoText}>Adzy.<span className={styles.logoAccent}>admin</span></span>
        </Link>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path} 
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.name}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <div className={styles.profile}>
          <div className={styles.avatar}>A</div>
          <div className={styles.info}>
            <span className={styles.userName}>Adzy Admin</span>
            <span className={styles.userRole}>System Operator</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
