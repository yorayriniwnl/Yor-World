import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/features/portfolio/page-intro";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = { title: "Résumé" };
export default function ResumePage() {
  return (
    <>
      <PageIntro eyebrow="Experience, clearly presented" title="Résumé"><p>The résumé is awaiting owner confirmation.</p></PageIntro>
      <section className={styles.emptyState} aria-labelledby="resume-status">
        <span className={styles.emptySymbol} aria-hidden="true">↗</span>
        <div><h2 id="resume-status">No approved résumé is available.</h2><p>A readable summary and a downloadable document will appear here after the experience, education, and file have been verified.</p><Link href="/about" prefetch={false}>Visit About <span aria-hidden="true">→</span></Link></div>
      </section>
    </>
  );
}
