import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/features/portfolio/page-intro";
import { ownerIdentity } from "@/features/portfolio/public-content";
import { SafeExternalLink } from "@/features/portfolio/safe-link";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description: "Verified contact channels and communication links for Ayush Roy.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <PageIntro eyebrow="Direct Channels" title="Contact">
        <p className={styles.lead}>
          Get in touch for engineering roles, technical collaboration, or project inquiries.
        </p>
      </PageIntro>

      <div className={styles.contentRows}>
        <section aria-labelledby="direct-heading">
          <h2 id="direct-heading">Direct Channels</h2>
          <div>
            <p>
              Email is the primary channel for professional inquiries, software engineering roles, and technical discussions:
            </p>
            <p>
              <a
                href={`mailto:${ownerIdentity.email}`}
                className={styles.caseStudyCta}
              >
                ✉️ {ownerIdentity.email}
              </a>
            </p>
            <div className={styles.identityCard}>
              <p>
                <strong>Verified Social &amp; Code Profiles:</strong>
              </p>
              <ul className={styles.linksList}>
                <li>
                  <SafeExternalLink href={ownerIdentity.links.github}>
                    GitHub (@{ownerIdentity.handle})
                  </SafeExternalLink>
                </li>
                <li>
                  <SafeExternalLink href={ownerIdentity.links.linkedin}>
                    LinkedIn Profile
                  </SafeExternalLink>
                </li>
                <li>
                  <SafeExternalLink href={ownerIdentity.links.devpost}>
                    Devpost
                  </SafeExternalLink>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="form-status-heading">
          <h2 id="form-status-heading">Messaging is not available yet.</h2>
          <div>
            <p className={styles.small}>
              The interactive in-browser contact form and durable transactional outbox are scheduled for milestone A5. Direct email communication is active.
            </p>
            <p>
              <Link href="/projects" prefetch={false} className={styles.caseStudyCta}>
                View verified project case studies <span aria-hidden="true">→</span>
              </Link>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
