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
  const stageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    stageRef.current?.scrollIntoView({ block: "start" });
    stageRef.current?.focus({ preventScroll: true });
  }, []);
  const optionsRef = useRef<HTMLDetailsElement | null>(null);
  const soundDesiredRef = useRef(false);
  const soundRequestRef = useRef(0);
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
  const [decorativePaused, setDecorativePaused] = useState<boolean>(false);
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

  const initialReducedMotionRef = useRef(reducedMotion);
  const runtimeUnavailable = effectiveTier === "static" || lifecycleState === "FAILURE" || error !== null;

  // Initialize runtime and lifecycle manager
  useEffect(() => {
    if (runtimeUnavailable || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let disposed = false;
    let initialized = false;

    // Cancel a development Strict Mode probe before allocating a GPU context.
    // A disposed context cannot be reconstructed on that same canvas.
    let cleanup: (() => void) | undefined;
    const initialize = () => {
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
          if (disposed || !currentRuntime) return;
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
        canvas,
        lifecycleManager: lm,
        soundEnabled: false,
        reducedMotion: initialReducedMotionRef.current,
        initialTier,
        simulateAssetError,
        simulateRendererError,
        onReady: (diag) => {
          if (disposed) return;
          setDiagnostics(diag);
        },
        onError: (err) => {
          if (disposed) return;
          setError(err.message);
        },
        onStateChange: (state) => {
          if (disposed) return;
          setLifecycleState(state);
        },
      });

      runtimeRef.current = runtime;
      // A stored preference is not a running AudioContext or fresh consent.
      runtime.setSound(false);
      soundDesiredRef.current = false;
      setSoundEnabled(false);
      setExperienceController(runtime.experienceController);

      const unsubExp = runtime.experienceController.subscribe((snap) => {
        setShowLauncher(snap.activePanel === "launcher");
        setShowRoomControls(snap.activePanel === "room-controls");
        setShowReplay(snap.activePanel === "replay");
      });

      const handleResize = () => runtime.resize();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if ((e.target as HTMLElement)?.closest("dialog") || (e.target as HTMLElement)?.tagName === "SELECT") return;
          if (optionsRef.current?.open) {
            optionsRef.current.open = false;
            optionsRef.current.querySelector("summary")?.focus();
          }
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
    };
    const initializeWhenVisible = () => {
      if (disposed || initialized || document.visibilityState === "hidden" || !canvas.isConnected) return;
      initialized = true;
      cleanup = initialize();
    };
    const initializeTimer = window.setTimeout(initializeWhenVisible, 0);
    document.addEventListener("visibilitychange", initializeWhenVisible);
    return () => {
      disposed = true;
      window.clearTimeout(initializeTimer);
      document.removeEventListener("visibilitychange", initializeWhenVisible);
      cleanup?.();
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

  const handleSoundChange = useCallback(async (enabled: boolean) => {
    const audio = audioControllerRef.current;
    const runtime = runtimeRef.current;
    if (!audio || !runtime) return;
    const request = ++soundRequestRef.current;
    soundDesiredRef.current = enabled;
    const actualEnabled = await audio.setEnabled(enabled);
    // Ignore an old activation completing after mute, disposal or reconstruction.
    if (audio !== audioControllerRef.current) return;
    if (request !== soundRequestRef.current) {
      if (!soundDesiredRef.current) await audio.setEnabled(false);
      return;
    }
    soundDesiredRef.current = actualEnabled;
    setSoundEnabled(actualEnabled);
    runtime.setSound(actualEnabled);
    setDiagnostics(runtime.getDiagnostics());
  }, []);

  const handleSoundToggle = useCallback(() => {
    void handleSoundChange(!soundDesiredRef.current);
  }, [handleSoundChange]);

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
    setDecorativePaused(false);
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
              onSoundChange={handleSoundChange}
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
              onSoundChange={handleSoundChange}
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
  const progressPercent = Math.round((loadingProgress?.progress ?? 0) * 100);

  return (
    <div
      className={styles.stageContainer}
      ref={stageRef}
      tabIndex={-1}
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

      <div className={styles.hudOverlay} data-testid="world-primary-controls">
        <div className={styles.primaryControls}>
          <button type="button" onClick={handleGreet} className={styles.hudButton} data-testid="greet-resident-btn" aria-label="Acknowledge and greet resident">Greet</button>
          <button type="button" onClick={handleSkip} className={styles.hudButton} data-testid="skip-motion-btn" aria-label="Instant skip to coding pose (Escape)">Skip (Esc)</button>
          <button type="button" onClick={() => { void experienceController?.send({ type: "OPEN_PANEL", panel: "room-controls" }); }} className={styles.hudButton} data-testid="toggle-room-controls-btn" aria-label="Open accessible studio room controls">Room</button>
          <button type="button" onClick={handleSoundToggle} className={styles.hudButton} data-testid="sound-toggle-btn" aria-pressed={soundEnabled} aria-label={`Sound ${soundEnabled ? "On" : "Off"}`}>Sound: {soundEnabled ? "On" : "Off"}</button>
          {onClose && <button type="button" onClick={onClose} className={styles.hudButton} data-testid="exit-studio-btn" aria-label="Exit 3D Studio and return to portfolio">Exit</button>}
          <details ref={optionsRef} className={styles.optionsDisclosure} data-testid="studio-options">
            <summary className={styles.hudButton} data-testid="studio-options-toggle">Options</summary>
            <section className={styles.optionsPanel} aria-label="Studio presentation options" data-testid="studio-options-panel">
              <div className={styles.optionsHeader}>
                <h2>Studio options</h2>
                <button type="button" className={styles.hudButton} aria-label="Close studio options" onClick={() => {
                  if (!optionsRef.current) return;
                  optionsRef.current.open = false;
                  optionsRef.current.querySelector("summary")?.focus();
                }}>Close</button>
              </div>
              <AccessibilityControls currentTier={qualityPreference} onTierChange={handleQualityChange} reducedMotion={reducedMotion} onReducedMotionToggle={handleReducedMotionToggle} soundEnabled={soundEnabled} onSoundToggle={handleSoundToggle} decorativePaused={decorativePaused} onDecorativePauseToggle={handleDecorativePauseToggle} />
              <div className={styles.hudControls}>
                <button type="button" onClick={handleCancel} className={styles.hudButton} data-testid="cancel-motion-btn" aria-label="Safely cancel motion and return to work">Cancel motion</button>
                <button type="button" onClick={handleReducedMotionToggle} className={styles.hudButton} data-testid="reduced-motion-toggle-btn" aria-label={`Reduced Motion ${reducedMotion ? "On" : "Off"}`}>Reduced Motion: {reducedMotion ? "On" : "Off"}</button>
              </div>
              <div className={styles.hudControls} aria-label="Studio cameras">
                {([
                  ["home-desktop", "camera-home-btn", "Home Camera"],
                  ["monitor", "camera-monitor-btn", "Monitor"],
                  ["reverse-doorway", "camera-reverse-btn", "Reverse Doorway"],
                  ["home-mobile", "camera-mobile-btn", "Mobile View"],
                ] as const).map(([preset, testId, label]) => <button key={preset} type="button" onClick={() => handleCameraChange(preset)} className={`${styles.hudButton} ${activeCamera === preset ? styles.hudButtonActive : ""}`} data-testid={testId} aria-pressed={activeCamera === preset}>{label}</button>)}
              </div>
            </section>
          </details>
          <button type="button" onClick={() => setShowDiagnostics((prev) => !prev)} className={styles.hudButton} data-testid="diagnostics-toggle-btn" aria-expanded={showDiagnostics}>Diagnostics</button>
        </div>
        {isTransition && <span className={styles.transitionIndicator} data-testid="transition-indicator">Transition in progress...</span>}
        {diagnostics && <span className={styles.statusBadge} data-testid="status-badge" data-lifecycle-state={lifecycleState}>{diagnostics.activeClip} / {diagnostics.mode}</span>}
        <span data-testid="lifecycle-badge" hidden>{lifecycleState}</span>
        {showDiagnostics && diagnostics && <pre className={styles.diagnosticsDrawer} data-testid="world-diagnostics">{JSON.stringify(diagnostics, null, 2)}</pre>}
      </div>

      {showRoomControls && experienceController && (
        <div className={styles.modalOverlay} data-testid="room-controls-modal">
          <RoomControls
            controller={experienceController}
            onSoundChange={handleSoundChange}
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

