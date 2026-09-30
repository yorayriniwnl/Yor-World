"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import styles from "./world.module.css";
import portfolioStyles from "@/features/portfolio/portfolio.module.css";

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

export function StudioLauncher() {
  const [isEntered, setIsEntered] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get("studio") === "enter" ||
        params.get("simulateAssetError") === "1" ||
        params.get("simulateRendererError") === "1"
      );
    }
    return false;
  });
  const [simulateAssetError] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("simulateAssetError") === "1";
    }
    return false;
  });
  const [simulateRendererError] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("simulateRendererError") === "1";
    }
    return false;
  });

  return (
    <div>
      {!isEntered ? (
        <details className={portfolioStyles.studioDisclosure} data-testid="studio-disclosure">
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
                onClick={() => setIsEntered(true)}
                className={portfolioStyles.primaryAction}
                style={{ cursor: "pointer", border: "none" }}
              >
                Launch 3D Studio
              </button>
            </div>
          </div>
        </details>
      ) : (
        <DynamicWorldRoot
          onClose={() => setIsEntered(false)}
          simulateAssetError={simulateAssetError}
          simulateRendererError={simulateRendererError}
        />
      )}
    </div>
  );
}
