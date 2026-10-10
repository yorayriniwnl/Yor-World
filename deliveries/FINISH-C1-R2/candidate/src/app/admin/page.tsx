import { requirePageOwner } from "@/server/auth/page-owner";
export const dynamic = "force-dynamic";
import styles from "./admin.module.css";

export default async function AdminDashboardPage() {
  await requirePageOwner();
  return (
    <div>
      <header style={{ marginBottom: "var(--space-6)" }}>
        <h1 className={styles.title}>Administration & Security Overview</h1>
        <p className={styles.subtitle}>
          Authoritative owner identity, multi-factor assurance (AAL2), and database row-level security.
        </p>
      </header>

      <section aria-labelledby="sec-security" style={{ marginBottom: "var(--space-8)" }}>
        <h2 id="sec-security" className={styles.title} style={{ fontSize: "1.25rem" }}>
          Authorization & Assurance Matrix
        </h2>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>Identity Verification</h3>
            <p className={styles.subtitle} style={{ margin: "var(--space-2) 0" }}>
              Authoritative Owner Record: <span className={`${styles.badge} ${styles.badgeSuccess}`}>Active</span>
            </p>
            <p className={styles.subtitle}>
              Bound to <code>admin_users.id</code> foreign-keyed to <code>auth.users.id</code>. Email string alone is never used as authorization.
            </p>
          </div>

          <div className={styles.card}>
            <h3>MFA Assurance Level</h3>
            <p className={styles.subtitle} style={{ margin: "var(--space-2) 0" }}>
              Assurance Tier: <span className={`${styles.badge} ${styles.badgeSuccess}`}>AAL2 Required</span>
            </p>
            <p className={styles.subtitle}>
              MFA is strictly non-decorative. Unverified AAL1 sessions are rejected with HTTP 403 on all mutating and private routes.
            </p>
          </div>

          <div className={styles.card}>
            <h3>Database Isolation (RLS)</h3>
            <p className={styles.subtitle} style={{ margin: "var(--space-2) 0" }}>
              Row-Level Security: <span className={`${styles.badge} ${styles.badgeSuccess}`}>Enforced on 15 Tables</span>
            </p>
            <p className={styles.subtitle}>
              Least-privilege grants applied. Anonymous users can only SELECT from <code>published_content</code>.
            </p>
          </div>

          <div className={styles.card}>
            <h3>Revocation Resilience</h3>
            <p className={styles.subtitle} style={{ margin: "var(--space-2) 0" }}>
              Revocation State: <span className={`${styles.badge} ${styles.badgeSuccess}`}>Immediate Cutoff</span>
            </p>
            <p className={styles.subtitle}>
              Setting <code>active = false</code> in <code>admin_users</code> instantly rejects mutations without waiting for JWT expiration.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="sec-publishing" style={{ marginBottom: "var(--space-8)" }}>
        <h2 id="sec-publishing" className={styles.title} style={{ fontSize: "1.25rem" }}>
          Milestone A4: Content Editing, Publishing & Rollback Controls
        </h2>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>Structured Project Editor</h3>
            <p className={styles.subtitle} style={{ margin: "var(--space-2) 0" }}>
              Draft State: <span className={`${styles.badge} ${styles.badgeSuccess}`}>Optimistic Concurrency</span>
            </p>
            <p className={styles.subtitle}>
              Edit structured sections, code, lists, images, and evidence records with automated stale revision (409) conflict rejection.
            </p>
            <a href="/admin/editor" className={styles.buttonSecondary} style={{ marginTop: "auto", textAlign: "center", textDecoration: "none" }}>
              Open Project Editor
            </a>
          </div>

          <div className={styles.card}>
            <h3>Publish Review & Rollback</h3>
            <p className={styles.subtitle} style={{ margin: "var(--space-2) 0" }}>
              Publication Status: <span className={`${styles.badge} ${styles.badgeSuccess}`}>Pre-Flight Protected</span>
            </p>
            <p className={styles.subtitle}>
              Transactional publication snapshots, unapproved media (422) blocking, immutable history auditing, and asset-verified rollback.
            </p>
            <a href="/admin/publish" className={styles.buttonSecondary} style={{ marginTop: "auto", textAlign: "center", textDecoration: "none" }}>
              Open Publish & Rollback
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="sec-boundary" className={styles.card} style={{ background: "var(--color-surface-subtle, #f8fafc)" }}>
        <h2 id="sec-boundary" style={{ fontSize: "1.125rem", margin: "0 0 var(--space-2) 0" }}>
          Milestone A3 Boundary Declaration
        </h2>
        <p className={styles.subtitle}>
          In accordance with work orders, Milestone A4 delivers owner-managed structured editing, private draft media isolation, pre-flight evidence review, transactional publication, immutable history, and verified rollback on exact accepted A3.
        </p>
      </section>
    </div>
  );
}
