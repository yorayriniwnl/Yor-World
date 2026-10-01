import Link from "next/link";
import { PageIntro } from "@/features/portfolio/page-intro";
import styles from "@/features/portfolio/portfolio.module.css";

export default function NotFound() {
  return (
    <>
      <PageIntro eyebrow="404 — Not Found" title="Page not found">
        <p className={styles.lead}>
          The requested route does not exist or refers to an unpublished candidate project awaiting evidence verification.
        </p>
      </PageIntro>
      <div className={styles.emptyState} aria-labelledby="not-found-heading">
        <span className={styles.emptySymbol} aria-hidden="true">↗</span>
        <div>
          <h2 id="not-found-heading">Looking for verified engineering work?</h2>
          <p>
            In accordance with project integrity standards, only projects with verified evidence have active public case studies. Candidate projects remain unpublished until evidence is confirmed.
          </p>
          <div className={styles.actions}>
            <Link href="/projects" prefetch={false} className={styles.primaryAction}>
              View Verified Projects <span aria-hidden="true">→</span>
            </Link>
            <Link href="/" prefetch={false} className={styles.caseStudyCta}>
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
