import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/features/portfolio/page-intro";
import { ownerIdentity } from "@/features/portfolio/public-content";
import { SafeExternalLink } from "@/features/portfolio/safe-link";
import { ContactForm } from "@/features/contact/contact-form";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description: "Verified contact channels and durable in-browser messaging for Ayush Roy.",
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
        <section aria-labelledby="form-heading">
          <h2 id="form-heading">Send a Message</h2>
          <div>
            <p>
              Send an inquiry here. A receipt appears after your message is safely recorded for review.
            </p>
            <ContactForm />
            <p className={styles.small} style={{ marginTop: "16px" }}>
              <strong>Retention Policy:</strong> Inquiries are held in private storage for 90 days
              for review and triage. Your email is used solely to respond directly to your message.
            </p>
          </div>
        </section>

        <section aria-labelledby="direct-heading">
          <h2 id="direct-heading">Direct Channels</h2>
          <div>
            <p>
              Email is also available for direct technical discussions, engineering opportunities, and inquiries:
            </p>
            <p>
              <a
                href={`mailto:${ownerIdentity.email}`}
                className={styles.caseStudyCta}
              >
                ✉️ {ownerIdentity.email}
              </a>
            </p>
            <div className={styles.identityCard} style={{ marginTop: "24px" }}>
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
            <p style={{ marginTop: "24px" }}>
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
