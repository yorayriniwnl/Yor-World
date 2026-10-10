"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { WorldRuntime } from "./WorldRuntime";
import { WorldFallback } from "./WorldFallback";
import { LifecycleManager } from "./LifecycleManager";
import type { CameraPreset, Diagnostics, WorldLifecycleState } from "./types";
import styles from "./world.module.css";
import { RoomControls } from "../room/room-controls";
import { Launcher } from "../monitor/launcher";
import { StaticFallback } from "../room/static-fallback";
import { AccessibilityControls } from "../portfolio/accessibility-controls";
import { AudioController } from "../experience/audio";
import { AdaptiveQualityController, chooseInitialTier } from "../room/quality-policy";
import type { QualityTier } from "../../contracts/experience";
import type { ExperienceController } from "../experience/controller";
import { preferencesStore } from "../experience/preferences-store";
import type { PublishedProject } from "@/contracts/content";
import { publishedProjects } from "@/features/portfolio/public-content";
import { useRouter } from "next/navigation";
import { RuntimeQualitySampler } from "./RuntimeQualitySampler";
import { readDeviceCapabilities } from "./device-capabilities";

export interface WorldRootProps {
  projects?: readonly PublishedProject[];
  publicationRevision?: number;
  onClose?: (() => void) | undefined;
  simulateAssetError?: boolean | undefined;
  simulateRendererError?: boolean | undefined;
}

export default function WorldRoot({
  projects = publishedProjects,
  publicationRevision = 1,
  onClose,
  simulateAssetError = false,
  simulateRendererError = false,
}: WorldRootProps) {
  const router = useRouter();
  const soundToggleRef = useRef<() => void>(() => {});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<WorldRuntime | null>(null);
  const lifecycleManagerRef = useRef<LifecycleManager | null>(null);
  const audioControllerRef = useRef<AudioController | null>(null);
  const qualityControllerRef = useRef<AdaptiveQualityController | null>(null);
  const failureRetryCountRef = useRef(0);
  const failureRetryLimitRef = useRef(3);
  const [failureRetryExhausted, setFailureRetryExhausted] = useState(false);
  const [runtimeGeneration, setRuntimeGeneration] = useState(0);

  const [lifecycleState, setLifecycleState] = useState<WorldLifecycleState>("ENTRY_REQUESTED");
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [qualityPreference, setQualityPreference] = useState<QualityTier | "auto">("auto");
  const qualityPreferenceRef = useRef(qualityPreference);
  const [effectiveTier, setEffectiveTier] = useState<QualityTier>("high");
  const [decorativePaused, setDecorativePaused] = useState<boolean>(() => preferencesStore.getPreferences().paused);
  const [showRoomControls, setShowRoomControls] = useState<boolean>(false);
  const [showLauncher, setShowLauncher] = useState<boolean>(false);
  const [showReplay, setShowReplay] = useState(false);
  const [experienceController, setExperienceController] = useState<ExperienceController | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  });
  const [activeCamera, setActiveCamera] = useState<CameraPreset>("home-desktop");
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  useEffect(() => {
    const unsub = preferencesStore.subscribe((prefs) => {
      setDecorativePaused(prefs.paused);
      if (runtimeRef.current) {
        runtimeRef.current.setDecorativePaused(prefs.paused);
      }
    });
    return unsub;
  }, []);

  const initialReducedMotionRef = useRef(reducedMotion);
  const runtimeUnavailable = effectiveTier === "static" || lifecycleState === "FAILURE" || error !== null;

  // Initialize runtime and lifecycle manager
  useEffect(() => {
    if (runtimeUnavailable || !canvasRef.current) return;

    const capabilities = {
      ...readDeviceCapabilities(),
      prefersReducedMotion: initialReducedMotionRef.current,
      userPreference: qualityPreferenceRef.current,
    };
    const initialTier = chooseInitialTier(capabilities);
    setEffectiveTier(initialTier);
    if (initialTier === "static") {
      setLifecycleState("STATIC");
      return;
    }

    const lm = new LifecycleManager();
    failureRetryLimitRef.current = lm.maxRetries;
    lifecycleManagerRef.current = lm;

    // Subscribe to lifecycle state changes
    const unsubscribe = lm.subscribe((newState) => {
      setLifecycleState(newState);
      if (newState === "FAILURE") {
        setError(lm.getFailureReason() || "Unknown studio failure");
      }
    });

    audioControllerRef.current = new AudioController();

    const qc = new AdaptiveQualityController(
      capabilities,
      {
        onTierChange: (newTier) => {
          setEffectiveTier(newTier);
          if (runtimeRef.current) {
            runtimeRef.current.setQualityTier(newTier);
          }
        },
      }
    );
    qualityControllerRef.current = qc;
    const sampler = new RuntimeQualitySampler(qc);

    const runtime = new WorldRuntime({
      onFrameDuration: (durationMs, timestamp) => {
        const currentRuntime = runtimeRef.current;
        if (!currentRuntime) return;
        const snapshot = currentRuntime.experienceController.getSnapshot();
        sampler.recordFrame(durationMs, timestamp, {
          visible: document.visibilityState !== "hidden", lifecycle: lm.getState(), phase: snapshot.phase,
          camera: currentRuntime.cameraDirector?.getCurrentPreset() ?? snapshot.activeCamera, panel: snapshot.activePanel,
        });
      },
      onSamplingPause: () => sampler.pause(),
      projects,
      onNavigatePublic: (href) => router.push(href),
      onToggleSound: () => soundToggleRef.current(),
      canvas: canvasRef.current,
      lifecycleManager: lm,
      soundEnabled: false,
      reducedMotion: initialReducedMotionRef.current,
      initialTier,
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
    setExperienceController(runtime.experienceController);

    const unsubExp = runtime.experienceController.subscribe((snap) => {
      if (snap.activePanel === "launcher") {
        setShowLauncher(true);
      } else if (snap.activePanel === "room-controls") {
        setShowRoomControls(true);
      } else if (snap.activePanel === "replay") {
        setShowReplay(true);
      } else if (snap.activePanel === null) {
        setShowLauncher(false);
        setShowReplay(false);
      }
    });

    const handleResize = () => runtime.resize();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const state = lm.getState();
        if (state === "ENTRANCE" || state === "TRANSITION") {
          runtime.skip();
          setDiagnostics(runtime.getDiagnostics());
        } else if (state === "HOME") {
          runtime.escape();
          setActiveCamera("home-desktop");
          setDiagnostics(runtime.getDiagnostics());
          setShowRoomControls(false);
          setShowLauncher(false);
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
      sampler.stop();
      clearInterval(interval);
      unsubscribe();
      unsubExp();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      runtime.dispose();
      audioControllerRef.current?.dispose();
      audioControllerRef.current = null;
      qualityControllerRef.current = null;
      runtimeRef.current = null;
      lifecycleManagerRef.current = null;
      setExperienceController(null);
    };
  }, [simulateAssetError, simulateRendererError, onClose, projects, router, runtimeGeneration, runtimeUnavailable]);

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

  const handleSoundToggle = useCallback(async () => {
    if (!audioControllerRef.current) return;
    const nextDesired = !soundEnabled;
    const actualEnabled = await audioControllerRef.current.setEnabled(nextDesired);
    setSoundEnabled(actualEnabled);
    if (runtimeRef.current) {
      runtimeRef.current.setSound(actualEnabled);
    }
  }, [soundEnabled]);

  useEffect(() => {
    soundToggleRef.current = () => { void handleSoundToggle(); };
  }, [handleSoundToggle]);

  const handleQualityChange = useCallback((tier: QualityTier | "auto") => {
    qualityPreferenceRef.current = tier;
    setQualityPreference(tier);
    if (qualityControllerRef.current) {
      qualityControllerRef.current.setUserPreference(tier);
      const newTier = qualityControllerRef.current.getTier();
      setEffectiveTier(newTier);
      if (runtimeRef.current) {
        runtimeRef.current.setQualityTier(newTier);
      }
    }
  }, []);

  const handleDecorativePauseToggle = useCallback(() => {
    setDecorativePaused((prev) => {
      const next = !prev;
      preferencesStore.setPaused(next);
      if (runtimeRef.current) {
        runtimeRef.current.setDecorativePaused(next);
      }
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
    const retryingFailure = lifecycleState === "FAILURE" || error !== null;
    if (retryingFailure) {
      if (failureRetryCountRef.current >= failureRetryLimitRef.current) return;
      failureRetryCountRef.current++;
      setFailureRetryExhausted(failureRetryCountRef.current >= failureRetryLimitRef.current);
    }
    // STATIC Retry is explicit user intent to reenter AUTO, not an adaptive upgrade.
    const preference = effectiveTier === "static" ? "auto" : qualityPreferenceRef.current;
    qualityPreferenceRef.current = preference;
    setQualityPreference(preference);
    setEffectiveTier(chooseInitialTier({ ...readDeviceCapabilities(), userPreference: preference }));
    initialReducedMotionRef.current = reducedMotion;
    setError(null);
    setDiagnostics(null);
    setLifecycleState("ENTRY_REQUESTED");
    setSoundEnabled(false);
    setShowRoomControls(false);
    setShowLauncher(false);
    setShowReplay(false);
    setShowDiagnostics(false);
    setActiveCamera("home-desktop");
    setRuntimeGeneration((generation) => generation + 1);
  }, [effectiveTier, error, lifecycleState, reducedMotion]);

  if (effectiveTier === "static") {
    return (
      <div className={styles.stageContainer} data-testid="world-static-container">
        <StaticFallback
          projects={projects}
          reason="Accessible Static Presentation active. Interactive 3D graphics are bypassed."
          onRetry={handleRetry}
          onContinue={handleContinueWithPortfolio}
        />
        {showLauncher && (
          <div className={styles.modalOverlay} data-testid="monitor-launcher-modal">
            <div style={{ maxWidth: "840px", width: "100%", maxHeight: "90vh", display: "flex" }}>
              <Launcher
                projects={projects}
                publicationRevision={publicationRevision}
                reducedMotion={reducedMotion}
                isOpen={showLauncher}
                onClose={() => {
                  setShowLauncher(false);
                  if (experienceController) {
                    experienceController.send({ type: "ESCAPE" });
                  }
                }}
              />
            </div>
          </div>
        )}
        {showRoomControls && experienceController && (
          <div className={styles.modalOverlay} data-testid="room-controls-modal">
            <RoomControls
              controller={experienceController}
              onClose={() => { setShowRoomControls(false); void experienceController.send({ type: "ESCAPE" }); }}
            />
          </div>
        )}
      </div>
    );
  }

  if (lifecycleState === "FAILURE" || error) {
    return (
      <div className={styles.stageContainer} data-testid="world-failure-container">
        <WorldFallback
          reason={error || "Interactive 3D Studio encountered an unrecoverable failure."}
          onRetry={failureRetryExhausted ? undefined : handleRetry}
          onDismiss={handleContinueWithPortfolio}
        />
        {showLauncher && (
          <div className={styles.modalOverlay} data-testid="monitor-launcher-modal">
            <div style={{ maxWidth: "840px", width: "100%", maxHeight: "90vh", display: "flex" }}>
              <Launcher
                projects={projects}
                publicationRevision={publicationRevision}
                reducedMotion={reducedMotion}
                isOpen={showLauncher}
                onClose={() => {
                  setShowLauncher(false);
                  if (experienceController) {
                    experienceController.send({ type: "ESCAPE" });
                  }
                }}
              />
            </div>
          </div>
        )}
        {showRoomControls && experienceController && (
          <div className={styles.modalOverlay} data-testid="room-controls-modal">
            <RoomControls
              controller={experienceController}
              onClose={() => { setShowRoomControls(false); void experienceController.send({ type: "ESCAPE" }); }}
            />
          </div>
        )}
      </div>
    );
  }

  const isLoading = lifecycleState === "ENTRY_REQUESTED" || lifecycleState === "LOADING";
  const isEntrance = lifecycleState === "ENTRANCE";
  const isTransition = lifecycleState === "TRANSITION";
  const loadingProgress = diagnostics?.loadingProgress;
  const isDeterminate = loadingProgress?.bytes?.kind === "determinate" && (loadingProgress?.bytes?.total ?? 0) > 0;
  const progressPercent = isDeterminate
    ? Math.min(100, Math.max(0, Math.round((loadingProgress?.progress ?? 0) * 100)))
    : 0;

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
            {loadingProgress?.optionalTotal ?? 3}
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
        <div className={styles.accessibilityControls}>
          <AccessibilityControls
            currentTier={qualityPreference}
            onTierChange={handleQualityChange}
            reducedMotion={reducedMotion}
            onReducedMotionToggle={handleReducedMotionToggle}
            soundEnabled={soundEnabled}
            onSoundToggle={handleSoundToggle}
            decorativePaused={decorativePaused}
            onDecorativePauseToggle={handleDecorativePauseToggle}
          />
        </div>

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
            <button
              type="button"
              onClick={() => setShowRoomControls((prev) => !prev)}
              className={`${styles.hudButton} ${showRoomControls ? styles.hudButtonActive : ""}`}
              data-testid="toggle-room-controls-btn"
              aria-label="Toggle accessible studio room controls"
            >
              Room Controls
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
            {diagnostics && (
              <>
                <span className={styles.statusBadge} data-testid="status-badge" data-lifecycle-state={lifecycleState}>
                  {diagnostics.activeClip} · {diagnostics.mode}
                </span>
                <span data-testid="lifecycle-badge" style={{ display: "none" }}>
                  {lifecycleState}
                </span>
              </>
            )}
          </div>
        </div>

        {showDiagnostics && diagnostics && (
          <pre className={styles.diagnosticsDrawer} data-testid="world-diagnostics">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        )}
      </div>

      {showRoomControls && experienceController && (
        <div className={styles.modalOverlay} data-testid="room-controls-modal">
          <RoomControls
            controller={experienceController}
            onClose={() => { setShowRoomControls(false); void experienceController.send({ type: "ESCAPE" }); }}
          />
        </div>
      )}

      {showLauncher && (
        <div className={styles.modalOverlay} data-testid="monitor-launcher-modal">
          <div style={{ maxWidth: "840px", width: "100%", maxHeight: "90vh", display: "flex" }}>
            <Launcher
              projects={projects}
              publicationRevision={publicationRevision}
              reducedMotion={reducedMotion}
              isOpen={showLauncher}
              onClose={() => {
                setShowLauncher(false);
                if (experienceController) {
                  experienceController.send({ type: "ESCAPE" });
                }
              }}
            />
          </div>
        </div>
      )}
      {showReplay && experienceController && (
        <div className={styles.modalOverlay}>
          <section role="dialog" aria-modal="true" aria-label="Studio entrance replay" className={styles.fallbackBanner}>
            <h2>Explore the studio again</h2>
            <button type="button" className={styles.hudButton} onClick={() => {
              setShowReplay(false);
              void experienceController.send({ type: "ENTER", replay: true });
            }}>Replay Entrance</button>
            <button type="button" className={styles.hudButton} onClick={handleContinueWithPortfolio}>Return to Portfolio</button>
            <button type="button" className={styles.hudButton} onClick={() => {
              setShowReplay(false);
              void experienceController.send({ type: "ESCAPE" });
            }}>Close</button>
          </section>
        </div>
      )}
    </div>
  );
}

