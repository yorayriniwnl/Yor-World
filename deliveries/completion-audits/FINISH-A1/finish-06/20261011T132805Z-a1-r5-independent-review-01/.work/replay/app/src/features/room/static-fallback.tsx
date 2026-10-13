"use client";

import React from "react";
import Link from "next/link";
import styles from "./room-controls.module.css";
import type { PublishedProject } from "@/contracts/content";
import { publishedProjects } from "@/features/portfolio/public-content";

export interface StaticFallbackProps {
  projects?: readonly PublishedProject[];
  reason?: string | undefined;
  onRetry?: (() => void) | undefined;
  onContinue?: (() => void) | undefined;
}

export function StaticFallback({ projects = publishedProjects, reason, onRetry, onContinue }: StaticFallbackProps) {
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
            {projects.filter((project) => project.id !== "candidatex" && project.slug !== "candidatex").map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.slug}`} prefetch={false} className={styles.projectRailLink}
                  data-testid={`static-link-${project.id === "ai-vs-real" ? "ai-real" : project.id}`}>
                  <strong>{project.title}</strong> ? {project.summary}
                </Link>
              </li>
            ))}
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
