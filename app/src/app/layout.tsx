import type { Metadata } from "next";
import { connection } from "next/server";
import { publicBaseUrl } from "@/config/public-base-url";
import { Navigation } from "@/features/portfolio/navigation";
import "@/styles/tokens.css";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicBaseUrl),
  title: { default: "YOR WORLD — Ayush Roy Portfolio", template: "%s — YOR WORLD" },
  description: "Personal developer portfolio and verified engineering case studies of Ayush Roy (yorayriniwnl).",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Nonces are per request; every HTML route must render after an actual request.
  await connection();
  return (
    <html lang="en">
      <body>
        <a className={styles.skipLink} href="#main-content">Skip to content</a>
        <div className={styles.site}>
          <Navigation />
          <main id="main-content" tabIndex={-1} className={styles.main}>{children}</main>
          <footer className={styles.footer}>
            <p>YOR WORLD <span aria-hidden="true">/</span> Ayush Roy Portfolio</p>
            <p><span className={styles.soundDot} aria-hidden="true" />Sound off <span aria-hidden="true">·</span> Explore at your pace</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
