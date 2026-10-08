import Link from "next/link";
import { ownerIdentity } from "@/features/portfolio/public-content";
import { StudioLauncher } from "@/features/world/StudioLauncher";
import { SkillsAtlas } from "@/features/portfolio/skills-atlas";
import { readServerPublication } from "@/content/server-publication";
import styles from "@/features/portfolio/portfolio.module.css";

export const dynamic = "force-dynamic";

const workArtwork: Record<string, string | undefined> = {
  "ai-vs-real": styles.editorialArtAi,
  zenith: styles.editorialArtZenith,
  helios: styles.editorialArtHelios,
  "yor-talks": styles.editorialArtTalks,
};

export default async function HomePage() {
  const publication = await readServerPublication();

  return (
    <div className={styles.editorialHome}>
      <section className={styles.editorialHero} aria-labelledby="welcome-heading">
        <span className={styles.editorialHeroGhost} aria-hidden="true">YOR.</span>
        <div className={styles.editorialHeroMeta}>
          <span><span className={styles.editorialLiveDot} aria-hidden="true" /> OPEN TO INTERESTING IDEAS</span>
          <span>PORTFOLIO / 2026</span>
        </div>
        <div className={styles.editorialHeroGrid}>
          <div className={styles.editorialHeroWords}>
            <p className={styles.editorialHeroKicker}>Hi, I&apos;m {ownerIdentity.name}.</p>
            <h1 id="welcome-heading">Full-stack<br /><em>developer.</em></h1>
            <p className={styles.editorialHeroSummary}>Building complete software experiences, from the logic behind the screen to the worlds you can step inside.</p>
            <p className={styles.editorialHeroTagline}>{ownerIdentity.tagline}</p>
            <div className={styles.editorialHeroActions}>
              <Link href="/projects" className={styles.editorialPrimaryLink} prefetch={false}>View projects <span aria-hidden="true">↗</span></Link>
              <StudioLauncher projects={publication.projects} publicationRevision={publication.revision} />
            </div>
            <p className={styles.editorialHeroFootnote}><span aria-hidden="true">✳</span> Scroll to explore the story</p>
          </div>
          <div className={styles.editorialHeroFigure}>
            <div className={styles.editorialFigureTop}><span>YOR WORLD / STUDIO 001</span><span>DESIGNED TO BE EXPLORED ↗</span></div>
            <div className={styles.editorialFigureWorld} role="img" aria-label="Illustrated studio entrance">
              <div className={styles.editorialFigureOrbit} aria-hidden="true" />
              <div className={styles.editorialFigurePortal} aria-hidden="true">
                <div className={styles.editorialFigureInside}>
                  <span>Y</span>
                  <i className={styles.editorialFigureMonitor} />
                  <i className={styles.editorialFigureLight} />
                  <i className={styles.editorialFigureDesk} />
                </div>
              </div>
              <span className={styles.editorialFigureStarA} aria-hidden="true">✳</span>
              <span className={styles.editorialFigureStarB} aria-hidden="true">✦</span>
            </div>
            <div className={styles.editorialFigureBottom}>
              <span>01 / 04<br /><strong>PERSONAL STUDIO</strong></span>
              <span>Enter through the door<br />Meet the resident. Explore the work.</span>
            </div>
            <div className={styles.editorialIdentityTag}>
              <span className={styles.editorialIdentityStamp} aria-hidden="true">Y.</span>
              <span><strong>{ownerIdentity.name}</strong><small>{ownerIdentity.role}</small></span>
              <span className={styles.editorialIdentityVerified}>Verified identity</span>
            </div>
          </div>
        </div>
        <div className={styles.editorialHeroBottom}><span>ENGINEER / CREATOR / BUILDER</span><span>BHUBANESWAR, INDIA</span><span>SCROLL TO DISCOVER ↓</span></div>
      </section>

      <section className={styles.editorialSection} id="story" aria-labelledby="editorial-story-heading">
        <div className={styles.editorialSectionTop}><span>01 / ABOUT</span><span>THE PERSON BEHIND THE PIXELS</span></div>
        <div className={styles.editorialAboutGrid}>
          <div className={styles.editorialSectionLead}>
            <h2 id="editorial-story-heading">Hi, I&apos;m<br /><em>Ayush.</em></h2>
            <p>I enjoy the parts of software that connect: thoughtful interfaces, solid backend systems, and experimental things that make you curious.</p>
            <div className={styles.editorialMiniLinks}>
              <Link href="/about">My story <span aria-hidden="true">↗</span></Link>
              <Link href="/resume">Résumé <span aria-hidden="true">↗</span></Link>
              <a href={ownerIdentity.links.github} target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <div className={styles.editorialAboutCard}>
            <div className={styles.editorialCardClip} aria-hidden="true" />
            <div className={styles.editorialAboutCardTop}><span>YOR / 001</span><span>ENGINEER&apos;S ID</span></div>
            <div className={styles.editorialAvatarMark} aria-hidden="true">AR<span>✳</span></div>
            <strong>{ownerIdentity.name}</strong>
            <span>{ownerIdentity.role}</span>
            <div className={styles.editorialCardFacts}><span>KIIT UNIVERSITY</span><span>2027 / EXPECTED</span></div>
            <div className={styles.editorialBarcode} aria-hidden="true">|||| || |||| ||| || |||||</div>
          </div>
          <dl className={styles.editorialQuickFacts}>
            <div><dt>Based in</dt><dd>{ownerIdentity.location}</dd></div>
            <div><dt>Education</dt><dd>Computer Science &amp; Communication Engineering</dd></div>
            <div><dt>Interests</dt><dd>Realtime systems · WebGL · Applied ML</dd></div>
            <div><dt>Currently</dt><dd>Building and learning.</dd></div>
          </dl>
        </div>
      </section>

      <section className={styles.editorialSection} id="skills" aria-labelledby="editorial-skills-heading">
        <div className={styles.editorialSectionTop}><span>02 / TECHNICAL TOOLKIT</span><span>THINGS I USE TO BUILD</span></div>
        <div className={styles.editorialSectionHeader}>
          <h2 id="editorial-skills-heading">Tools of<br /><em>the trade.</em></h2>
          <p>Frontend, backend, data, and the pieces in between. Pick a category to see the tools behind the work.</p>
        </div>
        <SkillsAtlas />
      </section>

      <section className={styles.editorialSection} id="work" aria-labelledby="editorial-work-heading">
        <div className={styles.editorialSectionTop}><span>03 / SELECTED WORK</span><span>REAL PROJECTS. REAL EVIDENCE.</span></div>
        <div className={styles.editorialSectionHeader}>
          <h2 id="editorial-work-heading">Things I&apos;ve<br /><em>built.</em></h2>
          <p>{publication.projects.length} published projects with linked case studies and verified technical contributions.</p>
        </div>
        <div className={styles.editorialWorkTrack} aria-label="Selected published projects">
          {publication.projects.map((project, index) => (
            <article key={project.slug} className={styles.editorialWorkCard}>
              <div className={`${styles.editorialWorkArtwork} ${workArtwork[project.slug] ?? styles.editorialArtDefault}`}>
                <div className={styles.editorialWorkArtHead}><span>{String(index + 1).padStart(2, "0")} / FEATURED</span><span>↗</span></div>
                <div className={styles.editorialWorkVisual} aria-hidden="true">
                  <div className={styles.editorialWorkVisualInner}><span>{project.slug === "zenith" ? "☼" : project.slug === "helios" ? "≈" : project.slug === "ai-vs-real" ? "◉" : "◎"}</span><i /><i /><i /></div>
                </div>
                <p>{project.title}</p>
              </div>
              <div className={styles.editorialWorkCopy}>
                <span className={styles.editorialWorkKicker}>PROJECT {String(index + 1).padStart(2,"0")} / VERIFIED</span>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
                <Link href={`/projects/${project.slug}`} prefetch={false}>Read the case study <span aria-hidden="true">↗</span></Link>
              </div>
            </article>
          ))}
        </div>
        <Link href="/projects" className={styles.editorialTextLink}>All verified projects <span aria-hidden="true">↗</span></Link>
      </section>

      <section className={styles.editorialSection} id="journey" aria-labelledby="editorial-journey-heading">
        <div className={styles.editorialSectionTop}><span>04 / THE JOURNEY</span><span>LEARNING BY DOING</span></div>
        <div className={styles.editorialJourneyGrid}>
          <div className={styles.editorialSectionLead}>
            <h2 id="editorial-journey-heading">Always<br /><em>learning.</em></h2>
            <p>From fundamentals and networking to building interactive products. Still a work in progress, and that&apos;s the point.</p>
          </div>
          <div className={styles.editorialJourneyEntries}>
            <div><span>2023 — 2027 (EXPECTED)</span><h3>B.Tech, Computer Science &amp; Communication Engineering</h3><p>KIIT Deemed to be University · Bhubaneswar</p></div>
            <div><span>JUNE 2026</span><h3>Telecom &amp; Data Network Intern</h3><p>Bharat Sanchar Nigam Limited (BSNL) · RGMTTC</p></div>
            <Link href="/about#experience">More about my experience <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className={styles.editorialSection} id="moments" aria-labelledby="editorial-moments-heading">
        <div className={styles.editorialSectionTop}><span>05 / MILESTONES</span><span>THE LITTLE THINGS ADD UP</span></div>
        <h2 className={styles.editorialMomentsHeading} id="editorial-moments-heading">Proud <em>moments.</em></h2>
        <div className={styles.editorialMomentsGrid}>
          <div><span>01</span><strong>{publication.projects.length.toString().padStart(2,"0")}</strong><p>Published, evidence-backed engineering projects</p></div>
          <div><span>02</span><strong>01</strong><p>Documented telecom internship experience</p></div>
          <div><span>03</span><strong>2027</strong><p>Expected graduation year</p></div>
        </div>
      </section>

      <section className={styles.editorialContact} id="connect" aria-labelledby="editorial-contact-heading">
        <div className={styles.editorialSectionTop}><span>06 / GET IN TOUCH</span><span>THE NEXT CHAPTER</span></div>
        <h2 id="editorial-contact-heading">Have something<br /><em>in mind?</em></h2>
        <p>Interesting problem, ambitious product, or just a good conversation. I&apos;m all ears.</p>
        <Link href="/contact" className={styles.editorialContactAction}>Let&apos;s talk <span aria-hidden="true">↗</span></Link>
      </section>
    </div>
  );
}
