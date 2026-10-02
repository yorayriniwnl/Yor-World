"use client";

import React from "react";
import Link from "next/link";
import styles from "./room-controls.module.css";

export interface StaticFallbackProps {
  reason?: string | undefined;
  onRetry?: (() => void) | undefined;
  onContinue?: (() => void) | undefined;
}

export function StaticFallback({ reason, onRetry, onContinue }: StaticFallbackProps) {
  return (
    <section
      className={styles.staticFallbackContainer}
      role="region"
      aria-labelledby="static-fallback-heading"
      data-testid="static-fallback-section"
    >
      <div className={styles.staticFallbackCard}>
        <div className={styles.staticFallbackHeader}>
          <span className={styles.staticFallbackBadge} aria-label="Static Portfolio Tier Active">
            Accessible Static Presentation
          </span>
          <h2 id="static-fallback-heading" className={styles.staticFallbackTitle}>
            Full Portfolio Mode
          </h2>
          <p className={styles.staticFallbackReason}>
            {reason ||
              "The 3D interactive studio is running in static fallback mode. All verified portfolio projects, case studies, background info, and contact capabilities remain 100% accessible via standard HTML/CSS below."}
          </p>
        </div>

        <div className={styles.staticFallbackActions}>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={styles.primaryActionButton}
              data-testid="static-fallback-retry"
            >
              Retry 3D Studio
            </button>
          )}
          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className={styles.secondaryActionButton}
              data-testid="static-fallback-continue"
            >
              Continue with Portfolio
            </button>
          )}
        </div>

        <div className={styles.staticFallbackProjectRail} aria-labelledby="static-projects-heading">
          <h3 id="static-projects-heading" className={styles.projectRailTitle}>
            Published Projects
          </h3>
          <ul className={styles.projectList} role="list">
            <li>
              <Link href="/projects/candidatex" className={styles.projectRailLink} data-testid="static-link-candidatex">
                <strong>CandidateX</strong> — Zero-Knowledge Recruiting Platform
              </Link>
            </li>
            <li>
              <Link href="/projects/helios" className={styles.projectRailLink} data-testid="static-link-helios">
                <strong>Helios</strong> — Real-Time Solar Grid Monitor
              </Link>
            </li>
            <li>
              <Link href="/projects/zenith" className={styles.projectRailLink} data-testid="static-link-zenith">
                <strong>Zenith</strong> — Autonomous Drone Fleet Operations
              </Link>
            </li>
            <li>
              <Link href="/projects/ai-vs-real" className={styles.projectRailLink} data-testid="static-link-ai-real">
                <strong>AI vs Real</strong> — Forensic Generative Media Detector
              </Link>
            </li>
            <li>
              <Link href="/projects/talks" className={styles.projectRailLink} data-testid="static-link-talks">
                <strong>Talks</strong> — Keynotes & Technical Conference Archive
              </Link>
            </li>
          </ul>
        </div>

        <div className={styles.staticFallbackNavLinks}>
          <Link href="/about" className={styles.navLinkItem} data-testid="static-link-about">
            About Yor
          </Link>
          <span className={styles.linkSeparator} aria-hidden="true">|</span>
          <Link href="/resume" className={styles.navLinkItem} data-testid="static-link-resume">
            Résumé
          </Link>
          <span className={styles.linkSeparator} aria-hidden="true">|</span>
          <Link href="/contact" className={styles.navLinkItem} data-testid="static-link-contact">
            Contact
          </Link>
        </div>
      </div>
    </section>
  );
}
