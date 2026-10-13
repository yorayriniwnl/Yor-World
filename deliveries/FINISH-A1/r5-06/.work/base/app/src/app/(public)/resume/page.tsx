import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/features/portfolio/page-intro";
import { ownerIdentity } from "@/features/portfolio/public-content";
import { SafeExternalLink } from "@/features/portfolio/safe-link";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = {
  title: "Résumé",
  description: "Verified curriculum vitae and professional résumé of Ayush Roy.",
  alternates: {
    canonical: "/resume",
  },
};

export default function ResumePage() {
  return (
    <>
      <PageIntro eyebrow="Curriculum Vitae" title="Résumé">
        <p className={styles.lead}>
          Verified academic background, technical experience, and production projects.
        </p>
      </PageIntro>

      <div className={styles.resumeContainer}>
        <div className={styles.resumeToolbar}>
          <a
            href={ownerIdentity.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.printButton}
          >
            GitHub Profile <span aria-hidden="true">↗</span>
          </a>
          <a
            href={ownerIdentity.links.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.printButton}
          >
            LinkedIn <span aria-hidden="true">↗</span>
          </a>
        </div>

        <article className={styles.resumePaper} aria-label="Ayush Roy Curriculum Vitae">
          <header className={styles.resumeHeader}>
            <h2 className={styles.resumeName}>{ownerIdentity.name}</h2>
            <p className={styles.resumeTitle}>{ownerIdentity.role}</p>
            <ul className={styles.resumeMetaList}>
              <li>📍 {ownerIdentity.location}</li>
              <li>
                ✉️{" "}
                <a href={`mailto:${ownerIdentity.email}`} className={styles.projectExternalLink}>
                  {ownerIdentity.email}
                </a>
              </li>
              <li>
                🌐{" "}
                <SafeExternalLink href={ownerIdentity.links.website}>
                  {ownerIdentity.links.website.replace("https://", "")}
                </SafeExternalLink>
              </li>
              <li>
                💻{" "}
                <SafeExternalLink href={ownerIdentity.links.github}>
                  github.com/{ownerIdentity.handle}
                </SafeExternalLink>
              </li>
              <li>
                🔗{" "}
                <SafeExternalLink href={ownerIdentity.links.linkedin}>
                  linkedin.com/in/{ownerIdentity.handle}
                </SafeExternalLink>
              </li>
            </ul>
          </header>

          <section className={styles.resumeSection} aria-labelledby="resume-edu-heading">
            <h2 id="resume-edu-heading" className={styles.resumeSectionTitle}>
              Education
            </h2>
            <div className={styles.resumeEntry}>
              <div className={styles.resumeEntryHead}>
                <h3 className={styles.resumeEntryTitle}>
                  KIIT Deemed to be University
                </h3>
                <span className={styles.resumeEntryDate}>2023 – 2027 (Expected)</span>
              </div>
              <p className={styles.resumeEntrySub}>
                Bachelor of Technology (B.Tech) in Computer Science &amp; Communication Engineering · Bhubaneswar, India
              </p>
              <ul className={styles.resumeEntryList}>
                <li>
                  Relevant Coursework: Data Structures &amp; Algorithms, Operating Systems, Database Management Systems, Computer Networks, Object-Oriented Programming, Discrete Mathematics, Software Engineering.
                </li>
              </ul>
            </div>
          </section>

          <section className={styles.resumeSection} aria-labelledby="resume-exp-heading">
            <h2 id="resume-exp-heading" className={styles.resumeSectionTitle}>
              Technical Experience
            </h2>
            <div className={styles.resumeEntry}>
              <div className={styles.resumeEntryHead}>
                <h3 className={styles.resumeEntryTitle}>
                  Bharat Sanchar Nigam Limited (BSNL)
                </h3>
                <span className={styles.resumeEntryDate}>June 2026</span>
              </div>
              <p className={styles.resumeEntrySub}>
                Telecom &amp; Data Network Intern · RGMTTC-Certified · Bhubaneswar, India
              </p>
              <ul className={styles.resumeEntryList}>
                <li>
                  Completed a four-week intensive training program on telecommunications switching, IP data networking, and optical fiber transport.
                </li>
                <li>
                  Analyzed broadband routing infrastructure, network fault isolation procedures, and enterprise telecommunications reliability standards.
                </li>
              </ul>
            </div>
          </section>

          <section className={styles.resumeSection} aria-labelledby="resume-projects-heading">
            <h2 id="resume-projects-heading" className={styles.resumeSectionTitle}>
              Selected Engineering Projects
            </h2>

            <div className={styles.resumeEntry}>
              <div className={styles.resumeEntryHead}>
                <h3 className={styles.resumeEntryTitle}>
                  AI vs. Real Image Detector · <Link href="/projects/ai-vs-real">View Case Study</Link>
                </h3>
                <span className={styles.resumeEntryDate}>Python, OpenCV, Scikit-Learn, Streamlit</span>
              </div>
              <ul className={styles.resumeEntryList}>
                <li>
                  Engineered a forensic image classifier evaluating micro-texture irregularities using Local Binary Patterns (LBP) and Gray-Level Co-occurrence Matrices (GLCM).
                </li>
                <li>
                  Trained a Support Vector Machine with Radial Basis Function kernel; achieved <strong>78.5% held-out test accuracy</strong> on a deterministic 80/20 train/test evaluation split.
                </li>
                <li>
                  Packaged calibrated probability inference into a lightweight local runtime with zero external API dependencies.
                </li>
              </ul>
            </div>

            <div className={styles.resumeEntry}>
              <div className={styles.resumeEntryHead}>
                <h3 className={styles.resumeEntryTitle}>
                  Yor Zenith: Solar Feasibility Planner · <Link href="/projects/zenith">View Case Study</Link>
                </h3>
                <span className={styles.resumeEntryDate}>React, TypeScript, Three.js, Python, FastAPI</span>
              </div>
              <ul className={styles.resumeEntryList}>
                <li>
                  Architected a full-stack platform featuring interactive 3D roof layout modeling with Three.js and raycasting collision detection.
                </li>
                <li>
                  Implemented mathematical solar irradiance calculation factoring in geographic coordinates, roof pitch angles, and seasonal declination curves.
                </li>
                <li>
                  Developed investment payback, estimated ROI, and clean energy subsidy analysis algorithms.
                </li>
              </ul>
            </div>

            <div className={styles.resumeEntry}>
              <div className={styles.resumeEntryHead}>
                <h3 className={styles.resumeEntryTitle}>
                  Yor Helios: Realtime Energy Intelligence · <Link href="/projects/helios">View Case Study</Link>
                </h3>
                <span className={styles.resumeEntryDate}>Python, FastAPI, TypeScript, Docker, WebSocket</span>
              </div>
              <ul className={styles.resumeEntryList}>
                <li>
                  Engineered an asynchronous streaming backend in FastAPI for continuous telemetry ingestion and anomaly threshold evaluation.
                </li>
                <li>
                  Implemented channel-based WebSocket distribution for operator dashboards with automated heartbeat connection monitoring.
                </li>
                <li>
                  Containerized the multi-service topology using Docker Compose for reproducible local and edge deployments.
                </li>
              </ul>
            </div>

            <div className={styles.resumeEntry}>
              <div className={styles.resumeEntryHead}>
                <h3 className={styles.resumeEntryTitle}>
                  Yor Talks V2: Realtime Social Platform · <Link href="/projects/talks">View Case Study</Link>
                </h3>
                <span className={styles.resumeEntryDate}>React, Vite, TypeScript, Express, Socket.IO, PostgreSQL, Drizzle ORM</span>
              </div>
              <ul className={styles.resumeEntryList}>
                <li>
                  Developed full-stack bidirectional messaging platform with room-based Socket.IO routing and optimistic client-side message rendering.
                </li>
                <li>
                  Designed relational schema and automated migrations in PostgreSQL using Drizzle ORM.
                </li>
                <li>
                  Authored modular, accessible UI component system in TypeScript with responsive layouts.
                </li>
              </ul>
            </div>
          </section>

          <section className={styles.resumeSection} aria-labelledby="resume-skills-heading">
            <h2 id="resume-skills-heading" className={styles.resumeSectionTitle}>
              Technical Skills
            </h2>
            <div className={styles.skillsTable}>
              <div className={styles.skillRow}>
                <span className={styles.skillCategory}>Languages</span>
                <span className={styles.skillItems}>
                  TypeScript, JavaScript, Python, SQL, HTML5, CSS3
                </span>
              </div>
              <div className={styles.skillRow}>
                <span className={styles.skillCategory}>Frameworks &amp; Web</span>
                <span className={styles.skillItems}>
                  React, Next.js, Three.js, React Three Fiber, Vite, Express, FastAPI, Flask, Socket.IO, Tailwind CSS
                </span>
              </div>
              <div className={styles.skillRow}>
                <span className={styles.skillCategory}>ML &amp; Data</span>
                <span className={styles.skillItems}>
                  OpenCV, Scikit-Learn, NumPy, SVM, LBP, GLCM, PostgreSQL, SQLite, Drizzle ORM, Streamlit
                </span>
              </div>
              <div className={styles.skillRow}>
                <span className={styles.skillCategory}>Tools &amp; DevOps</span>
                <span className={styles.skillItems}>
                  Docker, Docker Compose, Git, GitHub Actions, Linux, Vercel, Vitest, Playwright, axe-core
                </span>
              </div>
            </div>
          </section>
        </article>
      </div>
    </>
  );
}
