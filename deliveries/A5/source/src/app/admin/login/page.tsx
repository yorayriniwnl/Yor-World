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
    <main className={styles.container}>
      <div className={styles.loginCard}>
        <header className={styles.header}>
          <h1 className={styles.title}>Owner Administration</h1>
          <p className={styles.subtitle}>
            Enter your verified credentials and authenticator security code.
          </p>
        </header>

        <form
          method="POST"
          action="/api/admin/login"
          className={styles.form}
          autoComplete="off"
        >
          {/* Honeypot & CSRF protection */}
          <input type="text" name="_hp" tabIndex={-1} aria-hidden="true" style={{ display: "none" }} />

          <div className={styles.field}>
            <label htmlFor="owner-email" className={styles.label}>
              Owner Email
            </label>
            <input
              id="owner-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="owner@yorworld.test"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="owner-password" className={styles.label}>
              Password
            </label>
            <input
              id="owner-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="owner-totp" className={styles.label}>
              TOTP Security Code (AAL2 MFA)
            </label>
            <input
              id="owner-totp"
              name="totp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              autoComplete="one-time-code"
              required
              className={styles.input}
            />
            <span className={styles.subtitle}>
              6-digit time-based code from enrolled authenticator app.
            </span>
          </div>

          <button type="submit" className={styles.button}>
            Authenticate with MFA (AAL2)
          </button>
        </form>

        <footer style={{ marginTop: "var(--space-6)", textAlign: "center" }}>
          <Link href="/" className={styles.navLink}>
            &larr; Return to public portfolio
          </Link>
        </footer>
      </div>
    </main>
  );
}
