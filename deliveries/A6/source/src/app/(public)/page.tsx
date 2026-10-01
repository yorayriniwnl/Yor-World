import type { Metadata } from "next";
import Link from "next/link";
import { ownerIdentity } from "@/features/portfolio/public-content";
import { StudioLauncher } from "@/features/world/StudioLauncher";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = {
  title: "YOR WORLD — Developer Studio & Portfolio",
  description: "Personal developer studio and verified engineering portfolio of Ayush Roy (yorayriniwnl).",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="welcome-heading">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Developer Studio &amp; Portfolio</p>
          <h1 id="welcome-heading">
            A little world.<br />
            <em>A closer look.</em>
          </h1>
          <p className={styles.heroDescription}>
            A personal studio for exploring substantive software engineering work, systems architecture, and forensic machine learning.
          </p>
          <div className={styles.identity}>
            <p className={styles.identityName}>
              {ownerIdentity.name} <span className={styles.badge}>Verified Identity</span>
            </p>
            <p>{ownerIdentity.role}</p>
            <p className={styles.small}>{ownerIdentity.tagline}</p>
          </div>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/projects" prefetch={false}>
              View projects <span aria-hidden="true">↗</span>
            </Link>
            <StudioLauncher />
          </div>
          <p className={styles.small}>
            All project claims are backed by verified evidence. WebGL runtime is lazy-loaded and completely optional.
          </p>
        </div>
        <aside className={styles.poster} aria-label="Studio status">
          <div className={styles.posterTop}>
            <span>YOR / 01</span>
            <span>Verified Portfolio</span>
          </div>
          <div className={styles.posterArt} aria-hidden="true">
            <div className={styles.posterHalo} />
            <div className={styles.portal}>
              <div className={styles.portalInset}>
                <span>Y</span>
              </div>
            </div>
            <div className={styles.posterLine} />
          </div>
          <div className={styles.posterBottom}>
            <p>
              A space for<br />
              <strong>curiosity.</strong>
            </p>
            <span>
              Interactive 3D Studio<br />
              or semantic portfolio below
            </span>
          </div>
        </aside>
      </section>
      <section className={styles.directory} aria-labelledby="directory-heading">
        <div className={styles.directoryIntro}>
          <p className={styles.eyebrow}>Take a look around</p>
          <h2 id="directory-heading">Start anywhere.</h2>
        </div>
        <ul className={styles.directoryList}>
          <li>
            <Link href="/projects" prefetch={false}>
              <span className={styles.number}>01</span>
              <span>
                <strong>Projects</strong>
                <span>Substantive verified case studies and architectures</span>
              </span>
              <span aria-hidden="true">↗</span>
            </Link>
          </li>
          <li>
            <Link href="/about" prefetch={false}>
              <span className={styles.number}>02</span>
              <span>
                <strong>About</strong>
                <span>Background, education, internship, and technical skills</span>
              </span>
              <span aria-hidden="true">↗</span>
            </Link>
          </li>
          <li>
            <Link href="/resume" prefetch={false}>
              <span className={styles.number}>03</span>
              <span>
                <strong>Résumé</strong>
                <span>Verified curriculum vitae and technical background</span>
              </span>
              <span aria-hidden="true">↗</span>
            </Link>
          </li>
          <li>
            <Link href="/contact" prefetch={false}>
              <span className={styles.number}>04</span>
              <span>
                <strong>Contact</strong>
                <span>Direct channels and verified links</span>
              </span>
              <span aria-hidden="true">↗</span>
            </Link>
          </li>
        </ul>
      </section>
    </>
  );
}
