import styles from "./portfolio.module.css";

export function PageIntro({ eyebrow, title, children }: {
  eyebrow: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className={styles.pageIntro}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1>{title}</h1>
      <div className={styles.lead}>{children}</div>
    </div>
  );
}
