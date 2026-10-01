import Link from "next/link";
import type { PublicRoute } from "@/contracts/experience";
import styles from "./portfolio.module.css";

const links: ReadonlyArray<{ href: PublicRoute; label: string }> = [
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/resume", label: "Résumé" },
];

export function Navigation() {
  return (
    <header className={styles.header}>
      <Link href="/" prefetch={false} className={styles.brand} aria-label="Yor World home">
        <span className={styles.brandMark} aria-hidden="true">Y</span>
        <span>YOR WORLD<span className={styles.brandSub}>Ayush Roy · Portfolio</span></span>
      </Link>
      <nav aria-label="Primary navigation">
        <ul className={styles.navList}>
          {links.map(({ href, label }) => <li key={href}><Link href={href} prefetch={false}>{label}</Link></li>)}
        </ul>
      </nav>
    </header>
  );
}
