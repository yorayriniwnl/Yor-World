"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { WorldRuntime } from "./WorldRuntime";
import { WorldFallback } from "./WorldFallback";
import type { CameraPreset, Diagnostics } from "./types";
import styles from "./world.module.css";

export interface WorldRootProps {
  onClose?: (() => void) | undefined;
  simulateAssetError?: boolean | undefined;
  simulateRendererError?: boolean | undefined;
}

export default function WorldRoot({
  onClose,
  simulateAssetError = false,
  simulateRendererError = false,
}: WorldRootProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<WorldRuntime | null>(null);

  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  });
  const [activeCamera, setActiveCamera] = useState<CameraPreset>("home-desktop");
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Initialize runtime
  useEffect(() => {
    if (!canvasRef.current) return;

    const runtime = new WorldRuntime({
      canvas: canvasRef.current,
      soundEnabled: false,
      reducedMotion,
      simulateAssetError,
      simulateRendererError,
      onReady: (diag) => {
        setDiagnostics(diag);
      },
      onError: (err) => {
        setError(err.message);
      },
    });

    runtimeRef.current = runtime;

    const handleResize = () => runtime.resize();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        runtime.skip();
        setDiagnostics(runtime.getDiagnostics());
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    // Diagnostics polling interval for live state
    const interval = setInterval(() => {
      if (runtimeRef.current) {
        setDiagnostics(runtimeRef.current.getDiagnostics());
      }
    }, 100);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, [simulateAssetError, simulateRendererError]);

  // Synchronize reducedMotion changes with runtime
  useEffect(() => {
    if (runtimeRef.current) {
      runtimeRef.current.setReducedMotion(reducedMotion);
    }
  }, [reducedMotion]);

  const handleGreet = useCallback(() => {
    if (runtimeRef.current) {
      runtimeRef.current.greet();
      setDiagnostics(runtimeRef.current.getDiagnostics());
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (runtimeRef.current) {
      runtimeRef.current.cancel();
      setDiagnostics(runtimeRef.current.getDiagnostics());
    }
  }, []);

  const handleSkip = useCallback(() => {
    if (runtimeRef.current) {
      runtimeRef.current.skip();
      setDiagnostics(runtimeRef.current.getDiagnostics());
    }
  }, []);

  const handleCameraChange = useCallback((preset: CameraPreset) => {
    if (runtimeRef.current) {
      runtimeRef.current.setCamera(preset);
      setActiveCamera(preset);
      setDiagnostics(runtimeRef.current.getDiagnostics());
    }
  }, []);

  const handleSoundToggle = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (runtimeRef.current) runtimeRef.current.setSound(next);
      return next;
    });
  }, []);

  const handleReducedMotionToggle = useCallback(() => {
    setReducedMotion((prev) => {
      const next = !prev;
      if (runtimeRef.current) runtimeRef.current.setReducedMotion(next);
      return next;
    });
  }, []);

  if (error) {
    return <WorldFallback reason={error} onDismiss={onClose} />;
  }

  return (
    <div
      className={styles.stageContainer}
      data-testid="world-stage-container"
      role="region"
      aria-label="Interactive 3D Studio"
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        data-testid="world-canvas"
        aria-label="3D Room view showing resident, workstation, and moving chair"
      />

      <div className={styles.hudOverlay}>
        <div className={styles.hudTopBar}>
          <div className={styles.hudControls}>
            <button
              type="button"
              onClick={handleGreet}
              className={styles.hudButton}
              data-testid="greet-resident-btn"
              aria-label="Acknowledge and greet resident"
            >
              Greet Resident
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.hudButton}
              data-testid="cancel-motion-btn"
              aria-label="Safely cancel motion and return to work"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className={styles.hudButton}
              data-testid="skip-motion-btn"
              aria-label="Instant skip to coding pose (Escape)"
            >
              Skip (Esc)
            </button>
          </div>

          <div className={styles.hudControls}>
            <button
              type="button"
              onClick={handleSoundToggle}
              className={`${styles.hudButton} ${soundEnabled ? styles.hudButtonActive : ""}`}
              data-testid="sound-toggle-btn"
              aria-label={`Sound ${soundEnabled ? "On" : "Off"}`}
            >
              Sound: {soundEnabled ? "On" : "Off"}
            </button>
            <button
              type="button"
              onClick={handleReducedMotionToggle}
              className={`${styles.hudButton} ${reducedMotion ? styles.hudButtonActive : ""}`}
              data-testid="reduced-motion-toggle-btn"
              aria-label={`Reduced Motion ${reducedMotion ? "On" : "Off"}`}
            >
              Reduced Motion: {reducedMotion ? "On" : "Off"}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={styles.hudButton}
                data-testid="exit-studio-btn"
                aria-label="Exit 3D Studio and return to portfolio"
              >
                Exit Studio
              </button>
            )}
          </div>
        </div>

        <div className={styles.hudTopBar}>
          <div className={styles.hudControls}>
            <button
              type="button"
              onClick={() => handleCameraChange("home-desktop")}
              className={`${styles.hudButton} ${activeCamera === "home-desktop" ? styles.hudButtonActive : ""}`}
              data-testid="camera-home-btn"
            >
              Home Camera
            </button>
            <button
              type="button"
              onClick={() => handleCameraChange("monitor")}
              className={`${styles.hudButton} ${activeCamera === "monitor" ? styles.hudButtonActive : ""}`}
              data-testid="camera-monitor-btn"
            >
              Monitor
            </button>
            <button
              type="button"
              onClick={() => handleCameraChange("reverse-doorway")}
              className={`${styles.hudButton} ${activeCamera === "reverse-doorway" ? styles.hudButtonActive : ""}`}
              data-testid="camera-reverse-btn"
            >
              Reverse Doorway
            </button>
            <button
              type="button"
              onClick={() => handleCameraChange("home-mobile")}
              className={`${styles.hudButton} ${activeCamera === "home-mobile" ? styles.hudButtonActive : ""}`}
              data-testid="camera-mobile-btn"
            >
              Mobile View
            </button>
          </div>

          <div className={styles.hudControls}>
            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className={styles.hudButton}
              data-testid="diagnostics-toggle-btn"
            >
              Diagnostics
            </button>
            {diagnostics && (
              <span className={styles.statusBadge} data-testid="status-badge">
                {diagnostics.activeClip} · {diagnostics.mode}
              </span>
            )}
          </div>
        </div>

        {showDiagnostics && diagnostics && (
          <pre className={styles.diagnosticsDrawer} data-testid="world-diagnostics">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
