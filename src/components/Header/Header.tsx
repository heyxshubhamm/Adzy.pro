import Link from 'next/link';
import styles from './Header.module.css';
import { auth, signOut } from '@/auth';
import { MegaMenu } from './MegaMenu';

const Header = async () => {
  const session = await auth();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerInner}`}>
        <div className={styles.logo}>
          <Link href="/">
            <span className={styles.logoText}>Adzy.<span className={styles.logoAccent}>pro</span></span>
          </Link>
        </div>
        
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            <li><Link href="/adzy-pro" className={styles.navLink}>Adzy Pro</Link></li>
            <li><Link href="/sell" className={styles.navLink}>Become a Seller</Link></li>
            <li><Link href="/about" className={styles.navLink}>How it Works</Link></li>
          </ul>
        </nav>

        <div className={styles.auth}>
          {session ? (
            <>
              <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
              <form
                action={async () => {
                  'use server';
                  await signOut();
                }}
              >
                <button className={`btn btn-outline ${styles.logoutBtn}`}>Sign Out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={`${styles.navLink} ${styles.loginBtn}`}>Sign In</Link>
              <Link href="/signup" className="btn btn-primary">Join</Link>
            </>
          )}
        </div>
      </div>
      
      {/* ── Desktop Interactive Mega Menu Sub-navigation ── */}
      <div className={styles.megaMenuContainer || "mega-menu-wrapper"}>
        <div className="container">
          <MegaMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
