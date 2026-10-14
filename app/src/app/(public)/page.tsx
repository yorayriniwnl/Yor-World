import Link from "next/link";
import { ownerIdentity } from "@/features/portfolio/public-content";
import { StudioLauncher } from "@/features/world/StudioLauncher";
import { SkillsAtlas } from "@/features/portfolio/skills-atlas";
import { StudioSceneIllustration } from "@/features/portfolio/StudioSceneIllustration";
import { ProjectVisual } from "@/features/portfolio/ProjectVisual";
import { readServerPublication } from "@/content/server-publication";
import styles from "@/features/portfolio/home-refined.module.css";

export const dynamic = "force-dynamic";

const artClass: Record<string, string | undefined> = {
  "ai-vs-real": styles.workSurfaceAi,
  zenith: styles.workSurfaceZenith,
  helios: styles.workSurfaceHelios,
  talks: styles.workSurfaceTalks,
};
export default async function HomePage() {
  const publication = await readServerPublication();

  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="welcome-heading">
        <div className={styles.topline}>
          <span className={styles.availability}>Independent developer &amp; engineer</span>
          <span>AYUSH ROY · PORTFOLIO / 2026</span>
        </div>

        <div className={styles.heroStage}>
          <span className={styles.stageWatermark} aria-hidden="true">AYUSH<br />ROY.</span>
          <div className={styles.stageTopCaption}>
            <span>AN ENGINEER&apos;S PERSONAL UNIVERSE</span>
            <span>01 / 06</span>
          </div>
          <div className={styles.stagePortrait}>
            <div className={styles.heroVisualShell}>
              <div className={styles.heroArtwork} aria-hidden="true">
                <StudioSceneIllustration />
              </div>
              <span className={styles.artOrbitText}>A WORLD BEYOND THE SCREEN ↗</span>
              <div className={styles.heroFigureCaption}>
                <span>STUDIO NO. 001</span>
                <span>AN ILLUSTRATED WORLD CONCEPT</span>
              </div>
            </div>
          </div>
          <div className={styles.stageSignature}>
            <span className={styles.stageSignatureMark} aria-hidden="true">AR.</span>
            <span>DESIGN MINDED.<br />ENGINEERING DRIVEN.</span>
          </div>
          <div className={styles.stageSideCaption} aria-hidden="true">BUILT WITH CURIOSITY · 2026</div>
        </div>

        <div className={styles.heroIntro}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>
              <span className={styles.kickerMark} aria-hidden="true">✳</span>
              Hello, I&apos;m {ownerIdentity.name}.
            </p>
            <h1 id="welcome-heading"><span>Full-stack</span><em>developer.</em></h1>
          </div>
          <div className={styles.heroDetails}>
            <p className={styles.heroDescription}>
              I build digital things with a pulse. From dependable systems
              to immersive experiences, every detail is designed to feel intentional.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.mainLink} href="/projects" prefetch={false}>
                Explore selected work <span aria-hidden="true">↗</span>
              </Link>
              <StudioLauncher projects={publication.projects} publicationRevision={publication.revision} />
            </div>
          </div>
        </div>

        <div className={styles.footline}>
          <span>SOFTWARE / SYSTEMS / IMMERSIVE WEB</span>
          <span>{ownerIdentity.location}</span>
          <span>SCROLL TO DISCOVER ↓</span>
        </div>
      </section>

      <section className={styles.chapter} id="story" aria-labelledby="editorial-story-heading">
        <div className={styles.sectionEyebrow}><span>01 / ABOUT ME</span><span>A LITTLE CONTEXT</span></div>
        <div className={styles.storyGrid}>
          <div>
            <h2 id="editorial-story-heading" className={styles.sectionTitle}>Hi, I&apos;m<br /><em>Ayush.</em></h2>
            <blockquote className={styles.storyQuote}>
              I&apos;m drawn to the interesting space where <em>technology meets experience.</em>
            </blockquote>
          </div>
          <div className={styles.storyCopy}>
            <p>I work across frontend, backend, and realtime systems. I care as much about how a product feels to use as I do about how reliably it works behind the scenes.</p>
            <p>Currently studying Computer Science &amp; Communication Engineering at KIIT, and continually turning ideas into working software.</p>
            <div className={styles.storyActions}>
              <Link href="/about" className={styles.textLink}>More about me <span aria-hidden="true">↗</span></Link>
              <Link href="/resume" className={styles.textLink}>Résumé <span aria-hidden="true">↗</span></Link>
              <a href={ownerIdentity.links.github} target="_blank" rel="noopener noreferrer" className={styles.textLink}>GitHub <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.chapter} id="skills" aria-labelledby="editorial-skills-heading">
        <div className={styles.sectionEyebrow}><span>02 / TECHNICAL TOOLKIT</span><span>THINGS I WORK WITH</span></div>
        <div className={styles.sectionIntro}>
          <h2 id="editorial-skills-heading" className={styles.sectionTitle}>The tools<br /><em>I reach for.</em></h2>
          <p>From interface details to systems engineering. Explore the technologies behind the work.</p>
        </div>
        <div className={styles.skillsWell}><SkillsAtlas /></div>
      </section>

      <section className={styles.chapter} id="work" aria-labelledby="editorial-work-heading">
        <div className={styles.sectionEyebrow}><span>03 / SELECTED PROJECTS</span><span>IDEAS TAKEN FURTHER</span></div>
        <div className={styles.sectionIntro}>
          <h2 id="editorial-work-heading" className={styles.sectionTitle}>Things I&apos;ve<br /><em>built.</em></h2>
          <p>A selection of {publication.projects.length} published projects, each with a case study you can actually inspect.</p>
        </div>
        <div className={styles.works}>
          {publication.projects.map((project, index) => (
            <article className={styles.workCard} key={project.slug}>
              <Link href={`/projects/${project.slug}`} className={`${styles.workSurface} ${artClass[project.slug] ?? styles.workSurfaceDefault}`} prefetch={false}>
                <div className={styles.workTop}>
                  <span>PROJECT {String(index + 1).padStart(2, "0")} / {String(publication.projects.length).padStart(2,"0")}</span>
                  <span aria-hidden="true">↗</span>
                </div>
                <span className={styles.workVisual} aria-hidden="true"><ProjectVisual slug={project.slug} /></span>
                <h3>{project.title}</h3>
              </Link>
              <div className={styles.workFooter}>
                <p>{project.summary}</p>
                <span><Link href={`/projects/${project.slug}`} prefetch={false}>CASE STUDY ↗</Link></span>
              </div>
            </article>
          ))}
        </div>
        <div style={{marginTop:32}}><Link href="/projects" className={styles.textLink}>View all projects <span aria-hidden="true">↗</span></Link></div>
      </section>

      <section className={styles.chapter} id="journey" aria-labelledby="editorial-journey-heading">
        <div className={styles.sectionEyebrow}><span>04 / EXPERIENCE &amp; EDUCATION</span><span>THE JOURNEY SO FAR</span></div>
        <div className={styles.timeline}>
          <div className={styles.timelineIntro}>
            <h2 id="editorial-journey-heading" className={styles.sectionTitle}>Always<br /><em>learning.</em></h2>
            <p>Curious enough to start something new, persistent enough to make it work. Every project is part of the process.</p>
          </div>
          <div className={styles.timelineItems}>
            <div className={styles.timelineItem}><span>2023–2027 (EXPECTED)</span><div><h3>B.Tech, Computer Science &amp; Communication Engineering</h3><p>KIIT Deemed to be University · Bhubaneswar</p></div></div>
            <div className={styles.timelineItem}><span>JUNE 2026</span><div><h3>Telecom &amp; Data Network Intern</h3><p>Bharat Sanchar Nigam Limited (BSNL) · RGMTTC</p></div></div>
            <Link href="/about#experience" className={styles.textLink}>Explore my experience <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className={styles.chapter} id="moments" aria-labelledby="editorial-moments-heading">
        <div className={styles.sectionEyebrow}><span>05 / A FEW MILESTONES</span><span>STILL BUILDING</span></div>
        <h2 id="editorial-moments-heading" className={styles.sectionTitle}>Proud <em>moments.</em></h2>
        <div className={styles.moments}>
          <div className={styles.moment}><span className={styles.momentIndex}>01 / PUBLISHED</span><strong>{String(publication.projects.length).padStart(2,"0")}</strong><p>Engineering case studies with verifiable supporting work.</p></div>
          <div className={styles.moment}><span className={styles.momentIndex}>02 / INDUSTRY</span><strong>01</strong><p>Documented internship in telecom and data networking.</p></div>
          <div className={styles.moment}><span className={styles.momentIndex}>03 / NEXT CHAPTER</span><strong>2027</strong><p>Expected university graduation and the next chapter ahead.</p></div>
        </div>
      </section>

      <section className={styles.contactSection} id="connect" aria-labelledby="editorial-contact-heading">
        <div className={styles.sectionEyebrow}><span>06 / SAY HELLO</span><span>YOUR MOVE</span></div>
        <h2 id="editorial-contact-heading" className={styles.contactTitle}>Let&apos;s make<br /><em>something real.</em></h2>
        <div className={styles.contactBottom}>
          <p>Have a project in mind, a challenging problem, or just something worth talking about?</p>
          <Link href="/contact">Let&apos;s talk <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </div>
  );
}
