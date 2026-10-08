"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

// Keep the room, model files, and Three.js out of the initial HTML/download.
const DynamicWorldRoot = dynamic(() => import("./WorldRoot"), {
  ssr: false,
  loading: () => (
    <div className={styles.stageContainer} data-testid="world-loading-placeholder">
      <div style={{ padding: "2rem", color: "#cadbee", textAlign: "center" }}>
        Preparing your studio...
      </div>
    </div>
  ),
});

export function StudioLauncher({
  projects = publishedProjects,
  publicationRevision = 1,
}: {
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

  const [manuallyClosed, setManuallyClosed] = useState(false);
  const [manuallyOpened, setManuallyOpened] = useState(false);
  const [dialogOpened, setDialogOpened] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isEntered = (autoEnter && !manuallyClosed) || manuallyOpened;

  const closeStudio = () => {
    setManuallyClosed(true);
    setManuallyOpened(false);
    setDialogOpened(false);
  };

  // Browser-native modal focus containment and Escape handling.
  // Escape remains owned by WorldRoot: it skips the entrance or settles an
  // interaction. Visitors explicitly exit with the close control.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isEntered || !dialog) return;
    if (!dialog.open) dialog.showModal();
    // The renderer must not measure the dialog while it is display:none.
    const frame = window.requestAnimationFrame(() => setDialogOpened(true));
    return () => {
      window.cancelAnimationFrame(frame);
      if (dialog.open) dialog.close();
    };
  }, [isEntered]);

  return (
    <div className={portfolioStyles.studioEntry}>
      {!isEntered ? (
        <>
          <button
            type="button"
            className={portfolioStyles.studioDirectEntry}
            data-testid="studio-direct-entry"
            onClick={() => {
              setManuallyOpened(true);
              setManuallyClosed(false);
            }}
          >
            <span>ENTER THE 3D STUDIO</span><span aria-hidden="true">↗</span>
          </button>
          <details className={portfolioStyles.studioDisclosure} data-testid="studio-disclosure">
          <summary>
            Enter YOR WORLD <span aria-hidden="true">↗</span>
          </summary>
          <div className={portfolioStyles.studioMessage}>
            <p>The door is ready. Step into the bright interactive studio, meet the resident at the workstation, and explore the objects.</p>
            <p>Choose the 3D experience or continue with the regular portfolio. Motion can be skipped, and the full portfolio remains available without WebGL.</p>
            <button
              type="button"
              id="enter-studio-btn"
              data-testid="enter-studio-btn"
              onClick={() => {
                setManuallyOpened(true);
                setManuallyClosed(false);
              }}
              className={portfolioStyles.primaryAction}
            >
              Open the door <span aria-hidden="true">↗</span>
            </button>
          </div>
          </details>
        </>
      ) : (
        <dialog
          ref={dialogRef}
          className={portfolioStyles.studioFullscreen}
          data-testid="studio-fullscreen"
          aria-label="YOR WORLD interactive 3D studio"
          onCancel={(event) => event.preventDefault()}
        >
          <nav className={portfolioStyles.studioQuickNav} aria-label="Studio navigation">
            <Link href="/projects" onClick={closeStudio} data-testid="studio-projects-link">Projects <span aria-hidden="true">↗</span></Link>
            <Link href="/about" onClick={closeStudio} data-testid="studio-about-link">About <span aria-hidden="true">↗</span></Link>
            <Link href="/contact" onClick={closeStudio} data-testid="studio-contact-link">Contact <span aria-hidden="true">↗</span></Link>
            <Link href="/resume" onClick={closeStudio} data-testid="studio-resume-link">Résumé <span aria-hidden="true">↗</span></Link>
          </nav>
          <button
            type="button"
            onClick={closeStudio}
            className={portfolioStyles.studioExit}
            data-testid="studio-fullscreen-close"
            aria-label="Return to the portfolio"
          >
            <span aria-hidden="true">←</span> Exit studio
          </button>
          {dialogOpened && <DynamicWorldRoot
            projects={projects}
            publicationRevision={publicationRevision}
            onClose={closeStudio}
            simulateAssetError={simulateAssetError}
            simulateRendererError={simulateRendererError}
          />}
        </dialog>
      )}
    </div>
  );
}
