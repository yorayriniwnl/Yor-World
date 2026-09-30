import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/features/portfolio/page-intro";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = { title: "Contact" };
export default function ContactPage() {
  return (
    <>
      <PageIntro eyebrow="A conversation starts here" title="Contact"><p>Contact details are awaiting owner confirmation.</p></PageIntro>
      <section className={styles.emptyState} aria-labelledby="contact-status">
        <span className={styles.emptySymbol} aria-hidden="true">↗</span>
        <div><h2 id="contact-status">Messaging is not available yet.</h2><p>This preview cannot receive or send messages. A verified contact address and a working message form will be added when they are ready.</p><p>No message has been submitted.</p><Link href="/projects" prefetch={false}>Explore the projects page <span aria-hidden="true">→</span></Link></div>
      </section>
    </>
  );
}
