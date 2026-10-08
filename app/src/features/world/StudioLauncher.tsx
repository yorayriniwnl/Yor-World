"use client";

import React, { useState, useSyncExternalStore, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
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
    <div className={styles.stageContainer} data-testid="world-loading-placeholder">
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

  const isEntered = (autoEnter && !manuallyClosed) || manuallyOpened;
  const disclosureRef = useRef<HTMLDetailsElement>(null);
  const wasEntered = useRef(false);
  useEffect(() => {
    if (wasEntered.current && !isEntered) disclosureRef.current?.querySelector("summary")?.focus();
    wasEntered.current = isEntered;
  }, [isEntered]);
  const stageHost = typeof document === "undefined" ? null : document.getElementById("studio-stage-host");

  return (
    <div>
      {!isEntered ? (
        <details ref={disclosureRef} className={portfolioStyles.studioDisclosure} data-testid="studio-disclosure">
          <summary>Enter studio <span aria-hidden="true">+</span></summary>
          <div className={portfolioStyles.studioMessage}>
            <p>Explore the interactive studio. Sound starts muted, and you can skip the entrance or return to the portfolio at any time.</p>
            <p>
              Step inside the bright white workstation, meet the resident, and discover the projects through the objects in the room.
            </p>
            <div style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                id="enter-studio-btn"
                data-testid="enter-studio-btn"
                onClick={() => {
                  setManuallyOpened(true);
                  setManuallyClosed(false);
                }}
                className={portfolioStyles.primaryAction}
                style={{ cursor: "pointer", border: "none" }}
              >
                Launch 3D Studio
              </button>
            </div>
          </div>
        </details>
      ) : stageHost ? createPortal(
        <DynamicWorldRoot
          projects={projects}
          publicationRevision={publicationRevision}
          onClose={() => {
            setManuallyClosed(true);
            setManuallyOpened(false);
          }}
          simulateAssetError={simulateAssetError}
          simulateRendererError={simulateRendererError}
        />, stageHost
      ) : null}
    </div>
  );
}
