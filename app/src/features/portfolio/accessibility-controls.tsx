"use client";

import React from "react";
import Link from "next/link";
import { QualityTier } from "../../contracts/experience";
import styles from "./accessibility-controls.module.css";

export interface AccessibilityControlsProps {
  currentTier?: QualityTier | "auto" | undefined;
  onTierChange?: ((tier: QualityTier | "auto") => void) | undefined;
  reducedMotion?: boolean | undefined;
  onReducedMotionToggle?: (() => void) | undefined;
  soundEnabled?: boolean | undefined;
  onSoundToggle?: (() => void) | undefined;
  decorativePaused?: boolean | undefined;
  onDecorativePauseToggle?: (() => void) | undefined;
}

export function AccessibilityControls({
  currentTier = "auto",
  onTierChange,
  reducedMotion = false,
  onReducedMotionToggle,
  soundEnabled = false,
  onSoundToggle,
  decorativePaused = false,
  onDecorativePauseToggle,
}: AccessibilityControlsProps) {
  return (
    <aside
      className={styles.controlsToolbar}
      role="region"
      aria-label="Accessibility and Studio Presentation Controls"
      data-testid="accessibility-controls-toolbar"
    >
      <div className={styles.controlItem}>
        <label htmlFor="quality-tier-select" className={styles.controlLabel}>
          Quality:
        </label>
        <select
          id="quality-tier-select"
          className={styles.selectInput}
          value={currentTier}
          onChange={(e) => onTierChange?.(e.target.value as QualityTier | "auto")}
          aria-label="Visual Quality Tier"
          data-testid="quality-tier-select"
        >
          <option value="auto">Auto (Adaptive)</option>
          <option value="high">High (Full Shadows & Bloom)</option>
          <option value="medium">Medium (Balanced)</option>
          <option value="low">Low (Optimized)</option>
          <option value="static">Static (HTML Portfolio Fallback)</option>
        </select>
      </div>

      <div className={styles.controlItem}>
        <button
          type="button"
          role="switch"
          aria-checked={reducedMotion ? "true" : "false"}
          onClick={onReducedMotionToggle}
          className={`${styles.toggleButton} ${reducedMotion ? styles.toggleButtonActive : ""}`}
          aria-label="Toggle Reduced Motion"
          data-testid="toggle-reduced-motion-btn"
        >
          Reduced Motion: {reducedMotion ? "ON" : "OFF"}
        </button>
      </div>

      <div className={styles.controlItem}>
        <button
          type="button"
          role="switch"
          aria-checked={soundEnabled ? "true" : "false"}
          onClick={onSoundToggle}
          className={`${styles.toggleButton} ${soundEnabled ? styles.toggleButtonActive : ""}`}
          aria-label="Toggle Audio Sound"
          data-testid="toggle-sound-btn"
        >
          Sound: {soundEnabled ? "ON" : "OFF (Muted)"}
        </button>
      </div>

      <div className={styles.controlItem}>
        <button
          type="button"
          role="switch"
          aria-checked={decorativePaused ? "true" : "false"}
          onClick={onDecorativePauseToggle}
          className={`${styles.toggleButton} ${decorativePaused ? styles.toggleButtonActive : ""}`}
          aria-label="Pause Decorative Animations"
          data-testid="toggle-decorative-pause-btn"
        >
          Decorative: {decorativePaused ? "PAUSED" : "PLAYING"}
        </button>
      </div>

      <nav className={styles.navRail} aria-label="Accessible Portfolio Destinations" data-testid="accessible-nav-rail">
        <Link href="/projects" className={styles.navRailLink} data-testid="a11y-link-projects">
          All Projects
        </Link>
        <Link href="/about" className={styles.navRailLink} data-testid="a11y-link-about">
          About
        </Link>
        <Link href="/resume" className={styles.navRailLink} data-testid="a11y-link-resume">
          Résumé
        </Link>
        <Link href="/contact" className={styles.navRailLink} data-testid="a11y-link-contact">
          Contact
        </Link>
      </nav>
    </aside>
  );
}
