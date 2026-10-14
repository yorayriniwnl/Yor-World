import { OwnerLoginForm } from "@/features/admin/login-form";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "../admin.module.css";

export const metadata: Metadata = {
  title: "Owner Administration Login | YOR WORLD",
  description: "Secure multi-factor authentication for YOR WORLD administration.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <header className={styles.header}>
          <h1 className={styles.title}>Owner Administration</h1>
          <p className={styles.subtitle}>
            Enter your verified credentials and authenticator security code.
          </p>
        </header>

        <OwnerLoginForm />

        <footer style={{ marginTop: "var(--space-6)", textAlign: "center" }}>
          <Link href="/" className={styles.navLink}>
            &larr; Return to public portfolio
          </Link>
        </footer>
      </div>
    </div>
  );
}
