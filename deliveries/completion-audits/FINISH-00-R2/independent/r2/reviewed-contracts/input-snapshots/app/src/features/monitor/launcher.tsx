"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProjectId, PublishedProject } from "@/contracts/content";
import { publishedProjects } from "@/features/portfolio/public-content";
import { createProjectTiles } from "./project-tiles";
import {
  startProjectTransition,
  type ProjectMotif,
  TransitionAbortedError,
  PROJECT_MOTIFS,
} from "../experience/project-transition";
import { NavigationAdapter } from "../experience/navigation-adapter";
import { executeTerminalCommand } from "./commands";
import styles from "./monitor.module.css";

export interface LauncherProps {
  projects?: readonly PublishedProject[];
  publicationRevision?: number;
  reducedMotion?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  navigationAdapter?: NavigationAdapter;
  isFramedFallback?: boolean;
}

export function Launcher({
  projects = publishedProjects,
  publicationRevision = 1,
  reducedMotion = false,
  isOpen = true,
  onClose,
  navigationAdapter,
  isFramedFallback = false,
}: LauncherProps) {
  const projectTiles = createProjectTiles(projects);
  const router = useRouter();
  const [activeTransition, setActiveTransition] = useState<{
    motif: ProjectMotif;
    progress: number;
    abortController: AbortController;
  } | null>(null);

  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    "Studio Workstation OS v2.4 (x86_64-linux)",
    "Type 'help' for allowlisted commands, or 'projects' to view case studies.",
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Escape closes launcher or active transition
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (activeTransition) {
          activeTransition.abortController.abort("USER_ESCAPE");
          setActiveTransition(null);
        } else {
          onClose?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeTransition, onClose]);

  // Auto-scroll terminal history to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  }, [terminalHistory, reducedMotion]);

  if (!isOpen) return null;

  const handleProjectSelect = async (projectId: ProjectId) => {
    if (projectId === "candidatex") {
      setTerminalHistory((prev) => [
        ...prev,
        `visitor@studio:~$ open ${projectId}`,
        "Cannot open 'candidatex': Project evidence is unverified and holds draft status.",
      ]);
      return;
    }
    const project = projects.find((candidate) => candidate.id === projectId);
    if (!project) return;

    // Cancel prior transition if running (rapid switching safety)
    if (activeTransition) {
      activeTransition.abortController.abort("RAPID_PROJECT_SWITCH");
    }

    const abortController = new AbortController();
    const motif = { ...PROJECT_MOTIFS[projectId], name: project.title };

    setActiveTransition({
      motif,
      progress: 0,
      abortController,
    });

    try {
      if (navigationAdapter) {
        // Delegate to adapter which manages cancellation and route transitions
        navigationAdapter.openProject(projectId);
      } else {
        // Execute bounded transition with progress updates
        await startProjectTransition(projectId, abortController.signal, {
          reducedMotion,
          onMotifProgress: (progress) => {
            setActiveTransition((prev) => (prev ? { ...prev, progress } : null));
          },
        });
        router.push(`/projects/${project.slug}`);
      }
    } catch (err) {
      if (err instanceof TransitionAbortedError) {
        // Canceled cleanly; do not navigate
      } else {
        console.error("Transition error:", err);
      }
    } finally {
      setActiveTransition(null);
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = terminalInput.trim();
    if (!trimmed) return;

    const promptLine = `visitor@studio:~$ ${trimmed}`;
    const result = executeTerminalCommand(trimmed, projects, publicationRevision);

    if (result.clear) {
      setTerminalHistory([]);
      setTerminalInput("");
      return;
    }

    setTerminalHistory((prev) => [...prev, promptLine, ...result.output]);
    setTerminalInput("");

    // Execute side-effect action if requested by command
    if (result.action === "openProject" && result.target) {
      handleProjectSelect(result.target as ProjectId);
    } else if (result.action === "openRoute" && result.target) {
      router.push(result.target);
    } else if (result.action === "close") {
      onClose?.();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Studio Monitor Launcher"
      aria-modal="true"
      className={`${styles.monitorContainer} ${
        isFramedFallback ? styles.framedFallback : ""
      }`}
    >
      <header className={styles.monitorHeader}>
        <div className={styles.titleGroup}>
          <span className={styles.statusLed} aria-hidden="true" />
          <h2 className={styles.headerTitle}>Studio Monitor // Project Launcher</h2>
        </div>
        <div className={styles.headerControls}>
          <span className={styles.headerBadge}>Publication r{publicationRevision}</span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close monitor launcher"
          >
            ✕
          </button>
        </div>
      </header>

      <div className={styles.monitorBody}>
        {/* Project Selection Tiles */}
        <section className={styles.launcherSection} aria-labelledby="launcher-projects-heading">
          <div className={styles.sectionHeader}>
            <h3 id="launcher-projects-heading" className={styles.sectionTitle}>
              Verified Project Systems
            </h3>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Click tile for 3D camera transition, or use direct link
            </span>
          </div>

          <div className={styles.projectGrid}>
            {projectTiles.map((tile) => (
              <div
                key={tile.id}
                className={`${styles.projectCard} ${
                  tile.status === "unpublished" ? styles.unpublished : ""
                }`}
                style={{ borderLeftColor: tile.accent, borderLeftWidth: "4px" }}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardBadgeStrip}>
                    <span
                      className={
                        tile.status === "verified"
                          ? styles.cardBadge
                          : styles.cardBadgeUnpublished
                      }
                    >
                      {tile.status === "verified" ? "Verified" : "Unpublished Draft"}
                    </span>
                    <span className={styles.cardBadge}>{tile.motif}</span>
                  </div>
                  <h4 className={styles.cardTitle}>{tile.title}</h4>
                  <p className={styles.cardSummary}>{tile.summary}</p>
                </div>

                <div className={styles.cardActions}>
                  {tile.status === "verified" ? (
                    <>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleProjectSelect(tile.id)}
                      >
                        Inspect Case Study <span aria-hidden="true">→</span>
                      </button>
                      <Link
                        href={`/projects/${tile.slug}`}
                        prefetch={false}
                        className={styles.directLink}
                      >
                        Direct URL
                      </Link>
                    </>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#ef4444" }}>
                      Evidence Verification Pending (404)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Integrated Terminal */}
        <section className={styles.launcherSection} aria-labelledby="launcher-terminal-heading">
          <div className={styles.sectionHeader}>
            <h3 id="launcher-terminal-heading" className={styles.sectionTitle}>
              Interactive Workstation Terminal
            </h3>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Allowlisted commands only
            </span>
          </div>

          <div className={styles.terminalContainer}>
            <div className={styles.terminalOutput} tabIndex={0} aria-label="Terminal Log">
              {terminalHistory.map((line, index) => (
                <div key={index} className={styles.terminalOutputLine}>
                  {line}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            <form onSubmit={handleTerminalSubmit} className={styles.terminalForm}>
              <span className={styles.promptLabel}>visitor@studio:~$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="type 'help', 'projects', or 'open <id>'..."
                className={styles.terminalInput}
                aria-label="Terminal command input"
                autoComplete="off"
                spellCheck="false"
              />
            </form>
          </div>
        </section>
      </div>

      {/* Visual Transition Overlay during Bounded Room Travel */}
      {activeTransition && (
        <div className={styles.transitionOverlay} role="status" aria-live="assertive">
          <span
            className={styles.motifBadge}
            style={{
              backgroundColor: `${activeTransition.motif.accentColor}25`,
              color: activeTransition.motif.accentColor,
              border: `1px solid ${activeTransition.motif.accentColor}60`,
            }}
          >
            {activeTransition.motif.name} · {activeTransition.motif.motifStyle}
          </span>
          <p style={{ margin: "4px 0", color: "#f8fafc", fontSize: "14px", fontWeight: 600 }}>
            Traveling to {activeTransition.motif.name}
          </p>
          <div className={styles.motifProgressBar}>
            <div
              className={styles.motifProgressFill}
              style={{
                width: `${Math.round(activeTransition.progress * 100)}%`,
                backgroundColor: activeTransition.motif.accentColor,
              }}
            />
          </div>
          <button
            type="button"
            className={styles.cancelTransitionBtn}
            onClick={() => {
              activeTransition.abortController.abort("USER_CANCEL");
              setActiveTransition(null);
            }}
          >
            Cancel Transition (Esc)
          </button>
        </div>
      )}
    </div>
  );
}
