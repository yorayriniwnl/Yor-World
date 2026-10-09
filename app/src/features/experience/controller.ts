import type {
  ExperienceIntent,
  ExperienceSnapshot,
  ExperiencePhase,
  CameraId,
  CharacterAction,
  SingleOwners,
} from "../../contracts/experience";
import { CancellationCoordinator } from "./cancellation-coordinator";
import { IntentArbitrator } from "./intent-arbitration";
import { PreferencesStore } from "./preferences-store";
import { PaintingController } from "../room/painting-controller";
import { EnvironmentController } from "../room/environment-controller";
import { GreetingController } from "../character/greeting-controller";
import { getRestorableCamera, validateReturnSnapshot, type ReturnSnapshot } from "./return-snapshot";

export interface NavigationAdapter {
  openProject: (projectId: string) => void;
  openRoute: (path: string) => void;
}

export interface CameraDirectorAdapter {
  transitionTo: (preset: CameraId | string, signalOrDuration?: number | AbortSignal, durationMs?: number) => Promise<void>;
  setCameraPreset: (preset: CameraId | string, immediate?: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  getCurrentPreset: () => string;
}

export interface CharacterDirectorAdapter {
  playGreeting: () => number;
  cancel: () => number;
  settle: () => number;
  mode: string;
  currentClip: string;
}

export interface ExperienceDependencies {
  navigation?: NavigationAdapter;
  cameraDirector?: CameraDirectorAdapter;
  characterDirector?: CharacterDirectorAdapter;
  preferencesStore?: PreferencesStore;
  paintingController?: PaintingController;
  environmentController?: EnvironmentController;
  greetingController?: GreetingController;
  initialPhase?: ExperiencePhase;
  reducedMotion?: boolean;
}

export class ExperienceController {
  public readonly ownerId = "primary-experience-controller";
  private phase: ExperiencePhase = "explore";
  private activeProject: string | null = null;
  private activePanel: "launcher" | "room-controls" | "replay" | null = null;
  private currentIntent: ExperienceIntent | null = null;
  private suspended = false;
  private paused = false;
  private reducedMotion = false;
  private activeCamera: CameraId = "home-desktop";

  public readonly cancellation: CancellationCoordinator;
  public readonly arbitrator: IntentArbitrator;
  public readonly preferencesStore: PreferencesStore;
  public readonly painting: PaintingController;
  public readonly environment: EnvironmentController;
  public readonly greeting: GreetingController;

  private navigation: NavigationAdapter;
  private cameraDirector?: CameraDirectorAdapter | undefined;
  private characterDirector?: CharacterDirectorAdapter | undefined;

  private listeners = new Set<(snapshot: ExperienceSnapshot) => void>();
  private isDisposed = false;

  public readonly singleOwners: SingleOwners = Object.freeze({
    rendererOwner: "primary-renderer-lifecycle",
    cameraOwner: "primary-camera-director",
    characterActionOwner: "primary-character-director",
    transitionOwner: "primary-transition-coordinator",
    experienceControllerOwner: "primary-experience-controller",
  });

  constructor(deps: ExperienceDependencies = {}) {
    this.cancellation = new CancellationCoordinator();
    this.arbitrator = new IntentArbitrator();
    this.preferencesStore = deps.preferencesStore ?? new PreferencesStore();
    this.painting = deps.paintingController ?? new PaintingController();
    this.environment = deps.environmentController ?? new EnvironmentController();
    this.greeting = deps.greetingController ?? new GreetingController();

    this.navigation = deps.navigation ?? {
      openProject: () => {},
      openRoute: () => {},
    };

    this.cameraDirector = deps.cameraDirector;
    this.characterDirector = deps.characterDirector;
    if (this.characterDirector) {
      this.greeting.setCharacterDirector(this.characterDirector);
    }

    this.reducedMotion = deps.reducedMotion ?? false;
    this.phase = deps.initialPhase ?? "explore";

    // Painting listeners update snapshot
    this.painting.subscribe((pState) => {
      if (pState.detailFound && !this.environment.getState().detailFound) {
        this.environment.setDetailFound(true);
      }
      this.notify();
    });

    // Environment listeners update snapshot
    this.environment.subscribe(() => {
      this.notify();
    });
  }

  public restoreSnapshot(snapshot: ReturnSnapshot): boolean {
    const validated = validateReturnSnapshot(snapshot);
    if (!validated || this.isDisposed) return false;
    this.cancellation.abortCurrent("RESTORE_SAFE_SNAPSHOT");
    this.greeting.settle();
    this.preferencesStore.save(validated.preferences);
    this.environment.restore(validated.world);
    this.activeCamera = getRestorableCamera(validated);
    this.cameraDirector?.setCameraPreset(this.activeCamera, true);
    this.activeProject = null;
    this.activePanel = null;
    this.currentIntent = null;
    this.phase = "explore";
    this.notify();
    return true;
  }

  public subscribe(listener: (snapshot: ExperienceSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    if (this.isDisposed) return;
    const snap = this.getSnapshot();
    for (const l of this.listeners) {
      try {
        l(snap);
      } catch (err) {
        console.error("[ExperienceController] Error in listener:", err);
      }
    }
  }

  public getSnapshot(): ExperienceSnapshot {
    const env = this.environment.getState();
    const paint = this.painting.getState();
    const prefs = this.preferencesStore.get();

    let charAction: CharacterAction = "coding_idle";
    if (this.characterDirector) {
      const clip = this.characterDirector.currentClip;
      if (clip === "notice_visitor") charAction = "notice_visitor";
      else if (clip === "turn_to_visitor") charAction = "turn_to_visitor";
      else if (clip === "greeting_nod") charAction = "greeting_nod";
      else if (clip === "return_to_work") charAction = "return_to_work";
      else if (clip === "attention_glance") charAction = "attention_glance";
      else if (clip === "mouse_idle") charAction = "mouse_idle";
      else if (clip === "breathing_idle") charAction = "breathing_idle";
    }

    return {
      phase: this.phase,
      activeProject: this.activeProject,
      activePanel: this.activePanel,
      world: {
        version: 1,
        lampOn: env.lampOn,
        blindsOpen: env.blindsOpen,
        detailFound: env.detailFound || paint.detailFound,
      },
      preferences: prefs,
      currentTransitionId: this.cancellation.getCurrentId(),
      currentIntent: this.currentIntent,
      suspended: this.suspended,
      paused: this.paused,
      activeCamera: this.activeCamera,
      characterAction: charAction,
      paintingAngleDeg: paint.angleDeg,
      singleOwners: this.singleOwners,
    };
  }

  /**
   * Main dispatch method for all interaction intents.
   * Performs arbitration, priority preemption, cancellation, and execution.
   */
  public async send(intent: ExperienceIntent): Promise<void> {
    if (this.isDisposed) {
      console.warn("[ExperienceController] Cannot process intent; controller is disposed.");
      return;
    }

    const decision = this.arbitrator.arbitrate(
      intent,
      this.currentIntent,
      this.greeting.isBusy()
    );

    if (!decision.accepted) {
      return;
    }

    // If preemption is required, abort current active transition immediately
    if (decision.preemptsCurrent) {
      this.cancellation.abortCurrent("SUPERSEDED_BY_NEW_INTENT");
      if (this.greeting.isBusy()) {
        this.greeting.settle();
      }
    }

    this.currentIntent = intent;
    this.notify();

    switch (intent.type) {
      case "ESCAPE":
        await this.handleEscape();
        break;

      case "SKIP":
        await this.handleSkip();
        break;

      case "GREET":
        if (decision.glanceOnly) {
          this.greeting.startGlance();
        } else {
          this.greeting.startGreeting();
        }
        break;

      case "OPEN_PROJECT":
        await this.handleOpenProject(intent.projectId);
        break;

      case "NAVIGATE":
        await this.handleNavigate(intent.path, intent.camera);
        break;

      case "OPEN_PANEL":
        this.activePanel = intent.panel;
        this.phase = "panel";
        if (intent.panel === "launcher") {
          this.activeCamera = "monitor";
          if (this.cameraDirector) this.cameraDirector.setCameraPreset("monitor");
        } else if (intent.panel === "replay") {
          this.activeCamera = "reveal";
          if (this.cameraDirector) this.cameraDirector.setCameraPreset("reveal");
        }
        this.notify();
        break;

      case "ENTER":
        if (intent.replay) {
          await this.handleReplayEntrance();
        }
        break;

      case "SET_LAMP":
        this.environment.setLamp(intent.enabled);
        break;

      case "SET_BLINDS":
        this.environment.setBlinds(intent.open);
        break;

      case "SET_SOUND":
        this.preferencesStore.update({ soundEnabled: intent.enabled });
        this.notify();
        break;

      case "SET_QUALITY":
        this.preferencesStore.update({ quality: intent.quality });
        this.notify();
        break;

      case "SET_CLOCK_FORMAT":
        this.preferencesStore.update({ clock24h: intent.clock24h });
        this.notify();
        break;

      case "SET_PAUSED":
        this.paused = intent.paused;
        this.notify();
        break;

      case "HIDE":
        this.suspended = true;
        this.notify();
        break;

      case "SHOW":
        this.suspended = false;
        this.notify();
        break;

      case "RENDERER_FAILED":
        this.handleRendererFailed(intent.code);
        break;

      default:
        break;
    }

    // If no transition is pending, clear current intent
    if (intent.type !== "OPEN_PROJECT" && intent.type !== "ENTER" && intent.type !== "NAVIGATE") {
      this.currentIntent = null;
      this.notify();
    }
  }

  private async handleEscape(): Promise<void> {
    this.cancellation.abortCurrent("ESCAPE_REQUESTED");

    // Close any open panels
    this.activePanel = null;
    this.activeProject = null;

    // Settle character immediately to rest coding pose within <=50ms
    this.greeting.settle();

    // Reset camera to home
    this.activeCamera = "home-desktop";
    if (this.cameraDirector) {
      this.cameraDirector.setCameraPreset("home-desktop");
    }

    // Safe base-state restoration: return phase to explore
    this.phase = "explore";
    this.currentIntent = null;
    this.notify();
  }

  private async handleSkip(): Promise<void> {
    this.cancellation.abortCurrent("ESCAPE_REQUESTED");
    this.greeting.settle();
    this.activeCamera = "home-desktop";
    if (this.cameraDirector) {
      this.cameraDirector.setCameraPreset("home-desktop");
    }
    this.phase = "explore";
    this.currentIntent = null;
    this.notify();
  }

  private async handleFocusMonitor(): Promise<void> {
    const token = this.cancellation.startTransition("focus_monitor");
    this.phase = "focus";
    this.activeCamera = "monitor";

    if (this.cameraDirector && !this.reducedMotion) {
      try {
        await this.cameraDirector.transitionTo("monitor", 0.8);
      } catch {
        // Aborted
      }
    } else if (this.cameraDirector) {
      this.cameraDirector.setCameraPreset("monitor");
    }

    // Stale check
    if (!this.cancellation.isCurrent(token.id, token.signal)) {
      return; // obsolete async completion rejected
    }

    this.activePanel = "launcher";
    this.phase = "panel";
    this.currentIntent = null;
    this.notify();
  }

  private async handleOpenProject(projectId: string): Promise<void> {
    if (this.greeting.isBusy()) {
      this.greeting.settle();
    }
    const token = this.cancellation.startTransition(`open_project_${projectId}`);
    this.activeProject = projectId;
    this.phase = "focus";

    // Determine target camera preset for this project
    let targetCamera: CameraId = "monitor";
    if (projectId === "helios") targetCamera = "pc";
    else if (projectId === "zenith") targetCamera = "energy";
    else if (projectId === "ai-vs-real") targetCamera = "scanner";
    else if (projectId === "talks") targetCamera = "microphone";

    this.activeCamera = targetCamera;
    this.notify();

    // Bounded transition delay: max 1.4 seconds
    const duration = this.reducedMotion ? 0.0 : 1.2;

    try {
      if (this.cameraDirector && duration > 0) {
        await this.cameraDirector.transitionTo(targetCamera, duration);
      } else if (this.cameraDirector) {
        this.cameraDirector.setCameraPreset(targetCamera);
      }

      // Check if aborted or superseded during camera movement
      if (!this.cancellation.isCurrent(token.id, token.signal)) {
        return; // Obsolete work MUST NEVER navigate!
      }

      // Safe navigation execution
      this.navigation.openProject(projectId);
      this.phase = "explore";
      this.activeProject = null;
      this.currentIntent = null;
      this.notify();
    } catch {
      // Transition was aborted; do nothing
    }
  }

  private async handleNavigate(path: string, camera: CameraId | null): Promise<void> {
    const token = this.cancellation.startTransition(`navigate_${path}`);

    if (camera) {
      this.activeCamera = camera;
      if (this.cameraDirector) {
        this.cameraDirector.setCameraPreset(camera);
      }
    }

    this.phase = "static";
    this.notify();

    if (!this.cancellation.isCurrent(token.id, token.signal)) {
      return;
    }

    this.navigation.openRoute(path);
    this.currentIntent = null;
  }

  private async handleReplayEntrance(): Promise<void> {
    const token = this.cancellation.startTransition("replay_entrance");
    this.phase = "intro";
    this.activeCamera = "entry";
    this.activePanel = null;
    this.greeting.settle();
    this.notify();

    if (this.cameraDirector && !this.reducedMotion) {
      try {
        await this.cameraDirector.transitionTo("home-desktop", 2.0);
      } catch {
        // Aborted
      }
    }

    if (!this.cancellation.isCurrent(token.id, token.signal)) {
      return;
    }

    this.phase = "explore";
    this.activeCamera = "home-desktop";
    this.currentIntent = null;
    this.notify();
  }

  private handleRendererFailed(code: string): void {
    this.cancellation.abortCurrent("RENDERER_FAILED");
    this.phase = "static";
    this.activePanel = null;
    this.activeProject = null;
    this.currentIntent = null;
    console.error(`[ExperienceController] Renderer failed (${code}), falling back to static presentation.`);
    this.notify();
  }

  public tiltPainting(deg: number): boolean {
    if (this.currentIntent && this.arbitrator.getIntentPriority(this.currentIntent) < 5) {
      return false;
    }
    if (!this.arbitrator.canTiltPainting()) {
      return false;
    }
    this.painting.setAngle(deg);
    return true;
  }

  public setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    this.environment.setReducedMotion(enabled);
    if (this.cameraDirector) {
      this.cameraDirector.setReducedMotion(enabled);
    }
    this.notify();
  }

  public advance(dt: number): void {
    if (this.suspended || this.paused) return;
    this.painting.advance(dt);
    this.environment.advance(dt);
    this.greeting.update();
  }

  public stop(): void {
    this.isDisposed = true;
    this.cancellation.dispose();
    this.greeting.settle();
    this.listeners.clear();
  }
}

export function createExperienceController(dependencies: ExperienceDependencies = {}): ExperienceController {
  return new ExperienceController(dependencies);
}
