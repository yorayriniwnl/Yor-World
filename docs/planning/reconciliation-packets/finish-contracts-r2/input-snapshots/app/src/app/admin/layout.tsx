import { SignOutButton } from "@/features/admin/sign-out";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Administration Shell | YOR WORLD",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <header className={styles.adminNav} role="banner">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <Link href="/admin" style={{ textDecoration: "none", fontWeight: 700, fontSize: "1.125rem", color: "inherit" }}>
            YOR WORLD Admin
          </Link>
          <span className={`${styles.badge} ${styles.badgeSuccess}`}>
            MFA AAL2 Required
          </span>
          <span className={`${styles.badge}`}>
            Owner Authorization
          </span>
        </div>

        <nav aria-label="Administration navigation">
          <ul className={styles.navLinks}>
            <li>
              <Link href="/admin" className={styles.navLink}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/admin/editor" className={styles.navLink}>
                Editor
              </Link>
            </li>
            <li>
              <Link href="/admin/publish" className={styles.navLink}>
                Publish
              </Link>
            </li>
            <li>
              <SignOutButton />
            </li>
            <li>
              <Link href="/" className={styles.navLink}>
                Public Portfolio
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
