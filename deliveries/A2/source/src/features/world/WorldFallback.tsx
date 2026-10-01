"use client";

import React from "react";
import Link from "next/link";
import styles from "./world.module.css";

export interface WorldFallbackProps {
  reason?: string | undefined;
  onRetry?: (() => void) | undefined;
  onDismiss?: (() => void) | undefined;
}

export function WorldFallback({ reason, onRetry, onDismiss }: WorldFallbackProps) {
  return (
    <section
      className={styles.fallbackBanner}
      role="region"
      aria-labelledby="fallback-heading"
      data-testid="world-fallback-banner"
    >
      <h3 id="fallback-heading" className={styles.fallbackTitle}>
        Accessible Portfolio View (3D Studio Fallback)
      </h3>
      <p className={styles.fallbackDescription}>
        {reason ||
          "The interactive 3D studio is unavailable in this browser environment. All portfolio projects, case studies, background info, and contact details remain completely accessible below."}
      </p>
      <div className={styles.fallbackActions}>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={styles.hudButton}
            data-testid="fallback-retry-btn"
          >
            Retry 3D Studio
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={styles.hudButton}
            data-testid="fallback-dismiss-btn"
          >
            Close Fallback
          </button>
        )}
        <Link href="/projects" className={styles.hudButton} data-testid="fallback-projects-link">
          Browse Projects
        </Link>
        <Link href="/about" className={styles.hudButton} data-testid="fallback-about-link">
          Read About
        </Link>
      </div>
    </section>
  );
}
