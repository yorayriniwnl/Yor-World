"use client";

import React, { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import styles from "./world.module.css";
import portfolioStyles from "@/features/portfolio/portfolio.module.css";
import type { PublishedProject } from "@/contracts/content";
import { publishedProjects } from "@/features/portfolio/public-content";

const emptySubscribe = () => () => {};

function getSearchSnapshot(): string {
  return typeof window !== "undefined" ? window.location.search : "";
}

function getServerSearchSnapshot(): string {
  return "";
}

// Dynamic import with ssr: false ensures ZERO Three.js code is loaded pre-entry
const DynamicWorldRoot = dynamic(() => import("./WorldRoot"), {
  ssr: false,
  loading: () => (
    <div className={`${styles.stageContainer} ${styles.fullscreenStage}`} data-testid="world-loading-placeholder">
      <div style={{ padding: "2rem", color: "#cadbee", textAlign: "center" }}>
        Loading 3D Studio Environment...
      </div>
    </div>
  ),
});

export function StudioLauncher({ projects = publishedProjects, publicationRevision = 1 }: {
  projects?: readonly PublishedProject[];
  publicationRevision?: number;
}) {
  const search = useSyncExternalStore(emptySubscribe, getSearchSnapshot, getServerSearchSnapshot);
  const params = new URLSearchParams(search);
  const autoEnter =
    params.get("studio") === "1" ||
    params.get("studio") === "enter" ||
    params.get("studio") === "return" ||
    params.get("simulateAssetError") === "1" ||
    params.get("simulateRendererError") === "1";
  const simulateAssetError = params.get("simulateAssetError") === "1";
  const simulateRendererError = params.get("simulateRendererError") === "1";

  const [manuallyClosed, setManuallyClosed] = useState<boolean>(false);
  const [manuallyOpened, setManuallyOpened] = useState<boolean>(false);
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const launchButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(false);

  const isEntered = (autoEnter && !manuallyClosed) || manuallyOpened;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isEntered) {
      if (!dialog.open) dialog.showModal();
      dialog.focus({ preventScroll: true });
      return;
    }

    if (dialog.open) dialog.close();
    if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      launchButtonRef.current?.focus({ preventScroll: true });
    }
  }, [isEntered]);

  const closeStudio = useCallback(() => {
    restoreFocusRef.current = true;
    setManuallyClosed(true);
    setManuallyOpened(false);
    setDisclosureOpen(true);
  }, []);

  return (
    <div>
      <details
        className={portfolioStyles.studioDisclosure}
        data-testid="studio-disclosure"
        open={isEntered || disclosureOpen}
        onToggle={(event) => setDisclosureOpen(event.currentTarget.open)}
      >
          <summary>Enter studio <span aria-hidden="true">+</span></summary>
          <div className={portfolioStyles.studioMessage}>
            <p>The studio is not yet available.</p>
            <p>
              Launch the <strong>G1 Interactive 3D Studio Feasibility Proof</strong> to experience the integrated bright white workstation, blue moving chair, resident, and ambient lighting:
            </p>
            <div style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                id="enter-studio-btn"
                data-testid="enter-studio-btn"
                ref={launchButtonRef}
                onClick={() => {
                  setManuallyOpened(true);
                  setManuallyClosed(false);
                  setDisclosureOpen(true);
                }}
                className={portfolioStyles.primaryAction}
                style={{ cursor: "pointer", border: "none" }}
              >
                Launch 3D Studio
              </button>
            </div>
          </div>
      </details>

      <dialog
        ref={dialogRef}
        className={styles.studioDialog}
        data-testid="fullscreen-studio-dialog"
        aria-label="YOR WORLD interactive studio"
        tabIndex={-1}
        onCancel={(event) => {
          event.preventDefault();
          closeStudio();
        }}
      >
        {isEntered && (
          <div className={styles.fullscreenStudioShell}>
            <DynamicWorldRoot
              projects={projects}
              publicationRevision={publicationRevision}
              onClose={closeStudio}
              simulateAssetError={simulateAssetError}
              simulateRendererError={simulateRendererError}
              isFullscreen
            />
            <nav className={styles.studioPortfolioNav} aria-label="Portfolio destinations and studio exit">
              <Link href="/projects" prefetch={false}>Projects</Link>
              <Link href="/about" prefetch={false}>About</Link>
              <Link href="/contact" prefetch={false}>Contact</Link>
              <Link href="/resume" prefetch={false}>Résumé</Link>
              <button type="button" onClick={closeStudio} data-testid="fullscreen-exit-studio-btn">
                Exit Studio
              </button>
            </nav>
          </div>
        )}
      </dialog>
    </div>
  );
}
