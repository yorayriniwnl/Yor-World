import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/features/portfolio/page-intro";
import { ownerIdentity } from "@/features/portfolio/public-content";
import { SafeExternalLink } from "@/features/portfolio/safe-link";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = {
  title: "About",
  description: "Biography, technical range, education, and verified background of Ayush Roy.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <PageIntro eyebrow="Background &amp; Discipline" title="About">
        <p className={styles.lead}>
          {ownerIdentity.name} — {ownerIdentity.role}
        </p>
        <p className={styles.eyebrow}>
          Based in {ownerIdentity.location} · Open to software engineering roles
        </p>
      </PageIntro>

      <div className={styles.contentRows}>
        <section aria-labelledby="bio-heading">
          <h2 id="bio-heading">Background</h2>
          <div>
            <p>
              I build backend-heavy product systems, realtime communication services, interactive 3D web interfaces, and applied machine learning tools. My focus centers on architectural clarity, strict type safety across network boundaries, deterministic testing, and high-performance user experiences.
            </p>
            <p>
              Rather than assembling opaque templates, I develop systems from foundational principles—whether deriving gray-level texture statistics for forensic image classification or calculating geometric solar angles in 3D space.
            </p>
            <div className={styles.identityCard}>
              <p>
                <strong>Public Profiles &amp; Verified Channels:</strong>
              </p>
              <ul className={styles.linksList}>
                <li>
                  <SafeExternalLink href={ownerIdentity.links.github}>
                    GitHub (@{ownerIdentity.handle})
                  </SafeExternalLink>
                </li>
                <li>
                  <SafeExternalLink href={ownerIdentity.links.linkedin}>
                    LinkedIn
                  </SafeExternalLink>
                </li>
                <li>
                  <SafeExternalLink href={ownerIdentity.links.devpost}>
                    Devpost
                  </SafeExternalLink>
                </li>
                <li>
                  <SafeExternalLink href={ownerIdentity.links.steam}>
                    Steam Profile
                  </SafeExternalLink>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="experience" aria-labelledby="exp-heading">
          <h2 id="exp-heading">Experience</h2>
          <div>
            <div className={styles.experienceBlock}>
              <h3>Telecom &amp; Data Network Intern</h3>
              <p className={styles.eyebrow}>
                Bharat Sanchar Nigam Limited (BSNL) · June 2026 · Bhubaneswar, India
              </p>
              <p>
                Completed an RGMTTC-certified four-week technical internship focused on broadband data networks, optical transport, IP switching infrastructure, and telecommunications operations.
              </p>
            </div>
          </div>
        </section>

        <section id="education" aria-labelledby="edu-heading">
          <h2 id="edu-heading">Education</h2>
          <div>
            <div className={styles.educationBlock}>
              <h3>Bachelor of Technology (B.Tech) in Computer Science &amp; Communication Engineering</h3>
              <p className={styles.eyebrow}>
                KIIT Deemed to be University · 2023 – 2027 (Expected) · Bhubaneswar, India
              </p>
              <p>
                Core Coursework: Data Structures &amp; Algorithms, Operating Systems, Database Management Systems, Computer Networks, Object-Oriented Programming, Discrete Mathematics, and Software Engineering.
              </p>
            </div>
          </div>
        </section>

        <section id="skills" aria-labelledby="skills-heading">
          <h2 id="skills-heading">Technical Arsenal</h2>
          <div>
            <p>
              Applied technical skills demonstrated through production repositories and verified deployments:
            </p>
            <div className={styles.skillsTable}>
              <div className={styles.skillRow}>
                <span className={styles.skillCategory}>Product &amp; Web</span>
                <span className={styles.skillItems}>
                  TypeScript, JavaScript, React, Next.js, Tailwind CSS, Three.js, React Three Fiber, Framer Motion
                </span>
              </div>
              <div className={styles.skillRow}>
                <span className={styles.skillCategory}>Backend &amp; Data</span>
                <span className={styles.skillItems}>
                  Python, FastAPI, Flask, Node.js, Express, REST APIs, WebSocket, Socket.IO, PostgreSQL, SQLite, Drizzle ORM
                </span>
              </div>
              <div className={styles.skillRow}>
                <span className={styles.skillCategory}>Vision &amp; ML</span>
                <span className={styles.skillItems}>
                  OpenCV, Scikit-Learn, Support Vector Machines (SVM), Local Binary Patterns (LBP), GLCM, Feature Engineering, Streamlit
                </span>
              </div>
              <div className={styles.skillRow}>
                <span className={styles.skillCategory}>Infrastructure</span>
                <span className={styles.skillItems}>
                  Docker, Docker Compose, Git, GitHub Actions, Vercel, Linux, Vitest, Playwright, axe-core
                </span>
              </div>
              <div className={styles.skillRow}>
                <span className={styles.skillCategory}>Expanding Focus</span>
                <span className={styles.skillItems}>
                  Generative AI, Large Language Models (LLMs), RAG pipelines, LangChain, AWS S3, Vector Databases
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="research" aria-labelledby="research-heading">
          <h2 id="research-heading">Research &amp; Engineering Focus</h2>
          <div>
            <p>
              Applied engineering explorations focus on texture-based image forensics (surface roughness analysis via LBP and GLCM matrices) and spatial 3D solar simulation.
            </p>
            <p className={styles.small}>
              Honest Disclosure: In accordance with project integrity standards, no peer-reviewed academic publications or formal commercial patents are currently claimed.
            </p>
            <p>
              <Link href="/projects" prefetch={false} className={styles.caseStudyCta}>
                Explore verified project case studies <span aria-hidden="true">→</span>
              </Link>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
