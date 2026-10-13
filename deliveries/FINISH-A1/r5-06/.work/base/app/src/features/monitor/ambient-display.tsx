"use client";

import React, { useEffect, useState } from "react";
import styles from "./monitor.module.css";

export interface AmbientDisplayProps {
  state?: "ambient" | "focus" | "launcher";
  onOpenLauncher?: () => void;
  onFocus?: () => void;
  isFramedFallback?: boolean;
}

const SAMPLE_CODE_LINES = [
  "// YOR WORLD Architecture — Room & Experience Runtime",
  "import { CameraDirector } from '@/features/world/CameraDirector';",
  "import { CharacterDirector } from '@/features/world/CharacterDirector';",
  "import { IntentArbitrator } from '@/features/experience/intent-arbitration';",
  "",
  "export class ExperienceRuntime {",
  "  private arbitrator = new IntentArbitrator();",
  "  private camera = new CameraDirector();",
  "",
  "  public async openProject(id: ProjectId): Promise<void> {",
  "    const token = this.cancellation.startTransition(`open_${id}`);",
  "    await startProjectTransition(id, token.signal);",
  "    this.navigate(`/projects/${id}`);",
  "  }",
  "}",
];

export function AmbientDisplay({
  state = "ambient",
  onOpenLauncher,
  onFocus,
  isFramedFallback = false,
}: AmbientDisplayProps) {
  const [lineOffset, setLineOffset] = useState(0);
  const [timeString, setTimeString] = useState("12:00:00 UTC");

  useEffect(() => {
    // Clock updater
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata" }) + " IST"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (state === "launcher") return;
    // Ambient code stream tick
    const codeTimer = setInterval(() => {
      setLineOffset((prev) => (prev + 1) % SAMPLE_CODE_LINES.length);
    }, 2400);
    return () => clearInterval(codeTimer);
  }, [state]);

  const visibleLines = [
    ...SAMPLE_CODE_LINES.slice(lineOffset),
    ...SAMPLE_CODE_LINES.slice(0, lineOffset),
  ].slice(0, 7);

  return (
    <div
      className={`${styles.monitorContainer} ${
        isFramedFallback ? styles.framedFallback : ""
      }`}
      data-monitor-state={state}
      onClick={onFocus}
    >
      <header className={styles.monitorHeader}>
        <div className={styles.titleGroup}>
          <span className={styles.statusLed} aria-hidden="true" />
          <span className={styles.headerTitle}>Studio Display // Monitor 34&quot;</span>
        </div>
        <div className={styles.headerControls}>
          <span className={styles.headerBadge}>{timeString}</span>
          <span className={styles.headerBadge}>
            {state === "ambient" ? "Ambient" : state === "focus" ? "Focused" : "Launcher"}
          </span>
        </div>
      </header>

      <div className={styles.ambientScreen}>
        <div className={styles.ambientScanlines} aria-hidden="true" />

        <div className={styles.codeStream} aria-label="Simulated Code Stream">
          {visibleLines.map((line, idx) => (
            <div
              key={idx}
              className={`${styles.codeLine} ${
                idx === 2 ? styles.codeLineHighlight : ""
              }`}
            >
              {line || " "}
            </div>
          ))}
        </div>

        <div className={styles.ambientPrompt}>
          <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#94a3b8" }}>
            Ultrawide Workstation Monitor · 4 Verified Systems Published
          </p>
          <button
            type="button"
            className={styles.openLauncherBtn}
            onClick={(e) => {
              e.stopPropagation();
              onOpenLauncher?.();
            }}
          >
            Open Project Launcher <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </div>
  );
}
