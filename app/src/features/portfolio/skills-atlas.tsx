"use client";

import { useState } from "react";
import styles from "./portfolio.module.css";

const skills = [
  { symbol: "Ts", name: "TypeScript", category: "Web" },
  { symbol: "Re", name: "React", category: "Web" },
  { symbol: "Nx", name: "Next.js", category: "Web" },
  { symbol: "3D", name: "Three.js", category: "Web" },
  { symbol: "Py", name: "Python", category: "Backend" },
  { symbol: "Fa", name: "FastAPI", category: "Backend" },
  { symbol: "Pg", name: "PostgreSQL", category: "Backend" },
  { symbol: "Ws", name: "WebSocket", category: "Backend" },
  { symbol: "Dk", name: "Docker", category: "Tools" },
  { symbol: "Gh", name: "GitHub Actions", category: "Tools" },
  { symbol: "Cv", name: "OpenCV", category: "ML" },
  { symbol: "Pw", name: "Playwright", category: "Tools" },
] as const;

const categories = ["All", "Web", "Backend", "Tools", "ML"] as const;
type Category = typeof categories[number];

export function SkillsAtlas() {
  const [active, setActive] = useState<Category>("All");
  const visibleSkills = active === "All" ? skills : skills.filter((skill) => skill.category === active);

  return (
    <div className={styles.editorialSkillsExperience}>
      <div className={styles.editorialSkillFilters} role="group" aria-label="Filter technical skills">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={active === category}
            onClick={() => setActive(category)}
            className={active === category ? styles.editorialSkillFilterActive : undefined}
          >
            {category === "All" ? "All disciplines" : category}
          </button>
        ))}
      </div>
      <ul className={styles.editorialSkillGrid} aria-label={active === "All" ? "Technical skills" : `${active} technical skills`}>
        {visibleSkills.map((skill, index) => (
          <li key={skill.name} className={styles.editorialSkillTile}>
            <span className={styles.editorialSkillIndex}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.editorialSkillGlyph} aria-hidden="true">{skill.symbol}</span>
            <strong>{skill.name}</strong>
            <span className={styles.editorialSkillCategory}>{skill.category}</span>
          </li>
        ))}
      </ul>
      <p className={styles.editorialSkillsNote}>A working toolkit, not a proficiency score. Select a discipline to explore the stack.</p>
    </div>
  );
}
