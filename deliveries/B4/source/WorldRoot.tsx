"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { WorldRuntime } from "./WorldRuntime";
import { WorldFallback } from "./WorldFallback";
import { LifecycleManager } from "./LifecycleManager";
import type { CameraPreset, Diagnostics, WorldLifecycleState } from "./types";
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
  const lifecycleManagerRef = useRef<LifecycleManager | null>(null);

  const [lifecycleState, setLifecycleState] = useState<WorldLifecycleState>("ENTRY_REQUESTED");
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

  const initialReducedMotionRef = useRef(reducedMotion);

  // Initialize runtime and lifecycle manager
  useEffect(() => {
    if (!canvasRef.current) return;

    const lm = new LifecycleManager();
    lifecycleManagerRef.current = lm;

    // Subscribe to lifecycle state changes
    const unsubscribe = lm.subscribe((newState) => {
      setLifecycleState(newState);
      if (newState === "FAILURE") {
        setError(lm.getFailureReason() || "Unknown studio failure");
      }
    });

    const runtime = new WorldRuntime({
      canvas: canvasRef.current,
      lifecycleManager: lm,
      soundEnabled: false,
      reducedMotion: initialReducedMotionRef.current,
      simulateAssetError,
      simulateRendererError,
      onReady: (diag) => {
        setDiagnostics(diag);
      },
      onError: (err) => {
        setError(err.message);
      },
      onStateChange: (state) => {
        setLifecycleState(state);
      },
    });

    runtimeRef.current = runtime;

    const handleResize = () => runtime.resize();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const state = lm.getState();
        if (state === "ENTRANCE" || state === "TRANSITION") {
          runtime.skip();
          setDiagnostics(runtime.getDiagnostics());
        } else if (state === "LOADING") {
          lm.continueWithPortfolio();
          if (onClose) onClose();
        } else if (state === "FAILURE") {
          lm.continueWithPortfolio();
          if (onClose) onClose();
        }
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    // Diagnostics polling interval for live state
    const interval = setInterval(() => {
      if (runtimeRef.current) {
        const diag = runtimeRef.current.getDiagnostics();
        setDiagnostics(diag);
        setLifecycleState(diag.lifecycleState);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      unsubscribe();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      runtime.dispose();
      runtimeRef.current = null;
      lifecycleManagerRef.current = null;
    };
  }, [simulateAssetError, simulateRendererError, onClose]);

  // Synchronize dynamic reducedMotion changes with runtime
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      if (runtimeRef.current) {
        runtimeRef.current.setReducedMotion(e.matches);
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

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

  const handleContinueWithPortfolio = useCallback(() => {
    if (lifecycleManagerRef.current) {
      lifecycleManagerRef.current.continueWithPortfolio();
    }
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const handleRetry = useCallback(() => {
    if (lifecycleManagerRef.current) {
      const canRetry = lifecycleManagerRef.current.retry();
      if (!canRetry) {
        console.warn("[WorldRoot] Max retries reached.");
      }
    }
  }, []);

  if (lifecycleState === "FAILURE" || error) {
    return (
      <WorldFallback
        reason={error || "Interactive 3D Studio encountered an unrecoverable failure."}
        onRetry={handleRetry}
        onDismiss={handleContinueWithPortfolio}
      />
    );
  }

  const isLoading = lifecycleState === "ENTRY_REQUESTED" || lifecycleState === "LOADING";
  const isEntrance = lifecycleState === "ENTRANCE";
  const isTransition = lifecycleState === "TRANSITION";
  const loadingProgress = diagnostics?.loadingProgress;
  const progressPercent = Math.round((loadingProgress?.progress ?? 0) * 100);

  return (
    <div
      className={styles.stageContainer}
      data-testid="world-stage-container"
      data-lifecycle-state={lifecycleState}
      role="region"
      aria-label="Interactive 3D Studio"
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        data-testid="world-canvas"
        aria-label="3D Room view showing resident, workstation, and moving chair"
      />

      {/* Honest Loading Overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay} data-testid="world-loading-overlay">
          <h3 className={styles.loadingHeading}>Loading 3D Studio</h3>
          <p className={styles.loadingStageText} data-testid="world-loading-stage">
            {loadingProgress?.stage || "Preparing asset session..."}
          </p>
          <div
            className={styles.progressBarTrack}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            data-testid="world-loading-progress-bar"
          >
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className={styles.loadingStats} data-testid="world-loading-percentage">
            {progressPercent}% · Required: {loadingProgress?.requiredLoaded ?? 0}/
            {loadingProgress?.requiredTotal ?? 3} · Optional: {loadingProgress?.optionalLoaded ?? 0}/
            {loadingProgress?.optionalTotal ?? 2}
          </div>
          <button
            type="button"
            onClick={handleContinueWithPortfolio}
            className={styles.hudButton}
            data-testid="loading-continue-btn"
          >
            Continue with Portfolio
          </button>
        </div>
      )}

      {/* Entrance Choreography Banner */}
      {isEntrance && (
        <div className={styles.entranceBanner} data-testid="entrance-banner">
          <span>Entering 3D Studio...</span>
          <button
            type="button"
            onClick={handleSkip}
            className={styles.hudButton}
            data-testid="skip-entrance-btn"
            aria-label="Skip entrance travel directly to home camera"
          >
            Skip Entrance (Esc)
          </button>
        </div>
      )}

      {/* Standard World HUD Overlay */}
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
            {isTransition && (
              <span className={styles.transitionIndicator} data-testid="transition-indicator">
                Transition in progress...
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className={styles.hudButton}
              data-testid="diagnostics-toggle-btn"
            >
              Diagnostics
            </button>
            <span data-testid="lifecycle-badge" style={{ display: "none" }}>
              {lifecycleState}
            </span>
            {diagnostics && diagnostics.mode !== "unmounted" && (
              <span className={styles.statusBadge} data-testid="status-badge" data-lifecycle-state={lifecycleState}>
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
