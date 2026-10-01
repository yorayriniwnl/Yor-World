import React from "react";
import styles from "./portfolio.module.css";

export interface SafeExternalLinkProps {
  href: string;
  children?: React.ReactNode;
  className?: string | undefined;
}

export function isSafeHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Renders an external link with mandatory security guarantees:
 * - Protocol validation (strictly https:)
 * - target="_blank"
 * - rel="noopener noreferrer"
 * - Accessible screen reader notice for opening in new tab
 */
export function SafeExternalLink({
  href,
  children,
  className,
}: SafeExternalLinkProps) {
  const isSafe = isSafeHttpsUrl(href);

  if (!isSafe) {
    // If an unsafe scheme like javascript: or unparseable URL is provided,
    // render non-clickable fallback with warning to prevent execution.
    return (
      <span className={className ? `${className} ${styles.unsafeLink}` : styles.unsafeLink}>
        {children} <span className={styles.unsafeBadge}>[link disabled: non-https]</span>
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
      <span className={styles.externalIndicator} aria-hidden="true">
        ↗
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
