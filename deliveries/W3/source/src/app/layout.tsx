import type { Metadata } from "next";
import { Navigation } from "@/features/portfolio/navigation";
import "@/styles/tokens.css";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = {
  title: { default: "YOR WORLD — Portfolio preview", template: "%s — YOR WORLD" },
  description: "A portfolio in progress. Identity and content await confirmation; the studio is not yet available.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className={styles.skipLink} href="#main-content">Skip to content</a>
        <div className={styles.site}>
          <Navigation />
          <main id="main-content" tabIndex={-1} className={styles.main}>{children}</main>
          <footer className={styles.footer}>
            <p>YOR WORLD <span aria-hidden="true">/</span> Portfolio preview</p>
            <p><span className={styles.soundDot} aria-hidden="true" />Sound off <span aria-hidden="true">·</span> Explore at your pace</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
