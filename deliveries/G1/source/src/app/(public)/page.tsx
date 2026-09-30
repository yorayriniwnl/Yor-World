import Link from "next/link";
import { draftIdentity } from "@/features/portfolio/public-content";
import { StudioLauncher } from "@/features/world/StudioLauncher";
import styles from "@/features/portfolio/portfolio.module.css";

export default function HomePage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="welcome-heading">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>The door is taking shape</p>
          <h1 id="welcome-heading">A little world.<br /><em>A closer look.</em></h1>
          <p className={styles.heroDescription}>A personal studio for exploring the work, the thinking, and the person behind it.</p>
          <div className={styles.identity}>
            <p className={styles.identityName}>{draftIdentity.name} <span className={styles.badge}>Draft identity</span></p>
            <p>{draftIdentity.role}</p>
            <p className={styles.small}>{draftIdentity.note}</p>
          </div>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/projects" prefetch={false}>View projects <span aria-hidden="true">↗</span></Link>
            <StudioLauncher />
          </div>
          <p className={styles.small}>Portfolio preview · Content is awaiting verification.</p>
        </div>
        <aside className={styles.poster} aria-label="Studio status">
          <div className={styles.posterTop}><span>YOR / 01</span><span>In the making</span></div>
          <div className={styles.posterArt} aria-hidden="true">
            <div className={styles.posterHalo} />
            <div className={styles.portal}><div className={styles.portalInset}><span>Y</span></div></div>
            <div className={styles.posterLine} />
          </div>
          <div className={styles.posterBottom}><p>A space for<br /><strong>curiosity.</strong></p><span>Studio coming later<br />Portfolio pages below</span></div>
        </aside>
      </section>
      <section className={styles.directory} aria-labelledby="directory-heading">
        <div className={styles.directoryIntro}><p className={styles.eyebrow}>Take a look around</p><h2 id="directory-heading">Start anywhere.</h2></div>
        <ul className={styles.directoryList}>
          <li><Link href="/projects" prefetch={false}><span className={styles.number}>01</span><span><strong>Projects</strong><span>Case studies, as they are verified</span></span><span aria-hidden="true">↗</span></Link></li>
          <li><Link href="/about" prefetch={false}><span className={styles.number}>02</span><span><strong>About</strong><span>Background and skills, in progress</span></span><span aria-hidden="true">↗</span></Link></li>
          <li><Link href="/contact" prefetch={false}><span className={styles.number}>03</span><span><strong>Contact</strong><span>Details awaiting confirmation</span></span><span aria-hidden="true">↗</span></Link></li>
        </ul>
      </section>
    </>
  );
}
