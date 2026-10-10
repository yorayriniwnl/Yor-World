import * as THREE from "three";
import { integrateScene, IntegratedSceneResult } from "./SceneIntegrator";
import { CharacterDirector } from "./CharacterDirector";
import { CameraDirector } from "./CameraDirector";
import { AssetLoader } from "./AssetLoader";
import { EntranceCoordinator } from "./EntranceCoordinator";
import { TransitionCoordinator } from "./TransitionCoordinator";
import { LifecycleManager } from "./LifecycleManager";
import { ExperienceController } from "../experience/controller";
import type { CameraPreset, Diagnostics, WorldLifecycleState } from "./types";
import { WORLD_RENDERED_FRAME_EVENT, type RenderedWorldFrame } from "./types";
import type { QualityTier } from "../../contracts/experience";
import type { PublishedProject } from "../../contracts/content";
import { publishedProjects } from "../portfolio/public-content";
import { WorldInteractionBinding } from "./WorldInteractionBinding";
import { saveReturnSnapshot } from "../experience/return-snapshot";
import { RuntimeMaterialQuality, installOptionalTextureOnScene } from "./RuntimeMaterialQuality";
import { LowQualityBatch } from "./LowQualityBatch";
import { isSoftwareRenderer } from "./device-capabilities";
import { configureProductionLighting } from "./ProductionLighting";
import { preferencesStore } from "../experience/preferences-store";
import { SessionResourceLedger } from "./asset-resources";
import type { AssetSessionId, OptionalAssetResult } from "./asset-resources";

export interface WorldRuntimeOptions {
  onFrameDuration?: ((durationMs: number, timestamp: number) => void) | undefined;
  onSamplingPause?: (() => void) | undefined;
  projects?: readonly PublishedProject[] | undefined;
  onNavigatePublic?: ((href: string) => void) | undefined;
  onToggleSound?: (() => void) | undefined;
  canvas: HTMLCanvasElement;
  lifecycleManager?: LifecycleManager | undefined;
  experienceController?: ExperienceController | undefined;
  soundEnabled?: boolean | undefined;
  reducedMotion?: boolean | undefined;
  initialTier?: QualityTier | undefined;
  initialPaused?: boolean | undefined;
  simulateAssetError?: boolean | undefined;
  simulateRendererError?: boolean | undefined;
  onReady?: ((diagnostics: Diagnostics) => void) | undefined;
  onError?: ((err: Error) => void) | undefined;
  onStateChange?: ((state: WorldLifecycleState) => void) | undefined;
}

export class WorldRuntime {
  public readonly rendererOwnerId: string = "primary-renderer-lifecycle";
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Single owners for each domain
  public characterDirector: CharacterDirector | null = null;
  public cameraDirector: CameraDirector | null = null;
  public experienceController: ExperienceController;
  private assetLoader: AssetLoader;
  private entranceCoordinator: EntranceCoordinator | null = null;
  private transitionCoordinator: TransitionCoordinator | null = null;
  public lifecycleManager: LifecycleManager;

  private integratedResult: IntegratedSceneResult | null = null;
  private interactionBinding: WorldInteractionBinding | null = null;
  private materialQuality: RuntimeMaterialQuality | null = null;
  private lowQualityBatch: LowQualityBatch | null = null;
  private readonly onFrameDuration: WorldRuntimeOptions["onFrameDuration"];
  private readonly onSamplingPause: WorldRuntimeOptions["onSamplingPause"];

  public soundEnabled: boolean;
  public reducedMotion: boolean;
  public qualityTier: QualityTier = "high";
  public isDecorativePaused: boolean = false;
  private resourceLedger: SessionResourceLedger | null = null;
  private readonly pendingOptionalTextures = new Map<"deskmat" | "wallpaper", THREE.Texture>();
  private optionalTextureTargets: Partial<Record<"deskmat" | "wallpaper", readonly string[]>> = {};
  private isDisposed: boolean = false;
  private isPaused: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private webglRendererName: string = "Unknown";
  private softwareRenderer = false;
  private sessionToken: number = 0;
  private renderedFrames = 0;
  private lastRenderedAt = 0;
  private readonly loadingAbort = new AbortController();
  private readonly optionalAbort = new AbortController();
  private unsubscribeLifecycle: (() => void) | null = null;

  constructor(options: WorldRuntimeOptions) {
    this.onFrameDuration = options.onFrameDuration;
    this.onSamplingPause = options.onSamplingPause;
    this.canvas = options.canvas;
    this.soundEnabled = options.soundEnabled ?? preferencesStore.getPreferences().soundEnabled;
    this.reducedMotion = options.reducedMotion ?? false;
    this.qualityTier = options.initialTier ?? "high";
    this.isDecorativePaused = options.initialPaused ?? false;
    this.lifecycleManager = options.lifecycleManager ?? new LifecycleManager();
    this.unsubscribeLifecycle = this.lifecycleManager.subscribe((state, previousState) => {
      if (state === "HOME" && previousState === "ENTRANCE" && this.lifecycleManager.getEntranceDiagnostics().skipped) {
        this.optionalAbort.abort();
      }
      if (state === "FAILURE" || state === "STATIC") {
        this.loadingAbort.abort();
        this.optionalAbort.abort();
        this.resourceLedger?.disposeSoon();
        this.resourceLedger = null;
        this.pendingOptionalTextures.clear();
      }
    });
    this.assetLoader = new AssetLoader("primary-asset-loader");

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0c1017");

    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    this.cameraDirector = new CameraDirector(this.camera, undefined, "primary-camera-director");
    this.cameraDirector.setReducedMotion(this.reducedMotion);

    this.experienceController =
      options.experienceController ??
      new ExperienceController({
        preferencesStore,
        cameraDirector: this.cameraDirector,
        reducedMotion: this.reducedMotion,
        navigation: {
          openProject: (id) => {
            const project = (options.projects ?? publishedProjects).find((item) => item.id === id && item.id !== "candidatex");
            if (!project) return;
            const snapshot = this.experienceController.getSnapshot();
            saveReturnSnapshot({ preferences: snapshot.preferences, world: snapshot.world, lastProjectId: project.id, previousCamera: snapshot.activeCamera });
            options.onNavigatePublic?.(`/projects/${project.slug}`);
          },
          openRoute: (href) => {
            if (["/", "/about", "/about#skills", "/about#research", "/contact", "/resume", "/projects"].includes(href)) options.onNavigatePublic?.(href);
          },
        },
      });

    if (options.initialPaused === undefined) {
      this.isDecorativePaused = this.experienceController.getSnapshot().preferences.paused;
    }

    // Attach canvas context loss listeners
    this.canvas.addEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.addEventListener("webglcontextrestored", this.handleContextRestored);

    // Attach document visibility listener
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    this.init(options).catch((err) => {
      if (this.isDisposed || this.lifecycleManager.isStale(this.sessionToken)) return;
      this.resourceLedger?.disposeSoon();
      this.resourceLedger = null;
      this.pendingOptionalTextures.clear();
      console.error("[WorldRuntime] Initialization error:", err);
      this.lifecycleManager.fail(err.message, this.sessionToken);
      if (options.onError) {
        options.onError(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private handleContextLost = (e: Event) => {
    this.pause();
    e.preventDefault();
    console.warn("[WorldRuntime] WebGL context lost.");
    this.lifecycleManager.fail("WebGL graphics context was lost.", this.sessionToken);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  };

  private handleContextRestored = () => {
    console.info("[WorldRuntime] WebGL context restored. Re-initialization required.");
  };

  private handleVisibilityChange = () => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "hidden") {
      this.pause();
    } else {
      this.resume();
    }
  };

  public pause() {
    this.onSamplingPause?.();
    this.isPaused = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resume() {
    if (!this.isPaused || !this.canRender()) return;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.scheduleAnimationFrame();
  }

  private scheduleAnimationFrame() {
    // Visibility can resume while assets are pending. Initialization and resume
    // share this owner, and only an integrated scene may start a render loop.
    if (this.animationFrameId !== null || !this.integratedResult || this.isPaused) return;
    if (!this.canRender()) { this.pause(); return; }
    const frameId = requestAnimationFrame((currentTime) => {
      // A canceled callback must not take ownership from a later resume.
      if (this.animationFrameId !== frameId) return;
      this.animationFrameId = null;
      this.animate(currentTime);
    });
    this.animationFrameId = frameId;
  }

  private canRender(): boolean {
    return !this.isDisposed && this.qualityTier !== "static" && this.canvas.isConnected
      && !this.lifecycleManager.isStale(this.sessionToken)
      && ["LOADING", "ENTRANCE", "HOME", "TRANSITION"].includes(this.lifecycleManager.getState())
      && (typeof document === "undefined" || document.visibilityState !== "hidden");
  }

  private async init(options: WorldRuntimeOptions) {
    const token = this.lifecycleManager.requestEntry();
    this.sessionToken = token;
    const sessionId = this.lifecycleManager.getSessionId();
    this.lifecycleManager.startLoading(token);

    // 1. Renderer initialization with fault simulation support
    if (options.simulateRendererError) {
      const err = new Error("Simulated WebGL Renderer Context Failure");
      this.lifecycleManager.fail(err.message, token);
      throw err;
    }

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: this.qualityTier !== "low",
        // Continuous rendering supplies screenshots; preserving every frame adds GPU copies.
        preserveDrawingBuffer: false,
      });
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.renderer.shadowMap.enabled = this.qualityTier !== "low" && this.qualityTier !== "static";
      this.renderer.shadowMap.type = this.qualityTier === "high" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

      const gl = this.renderer.getContext();
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      this.webglRendererName = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER) || "WebGL";
      this.softwareRenderer = isSoftwareRenderer(this.webglRendererName);
      const maxDpr = this.qualityTier === "high" ? 1.5 : this.qualityTier === "medium" ? 1.25 : this.softwareRenderer ? 0.3 : 1;
      this.renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, maxDpr));
    } catch (e) {
      const err = new Error(`WebGL context creation failed: ${(e as Error).message}`);
      this.lifecycleManager.fail(err.message, token);
      throw err;
    }

    if (this.lifecycleManager.isStale(token)) return;

    // 2. Setup Lighting matching accepted palette
    this.setupLighting();

    // 3. Asset Loading via single AssetLoader owner
    let loadedAssets;
    try {
      loadedAssets = await this.assetLoader.loadSession({
        sessionToken: token,
        sessionGeneration: sessionId.generation,
        signal: this.loadingAbort.signal,
        optionalSignal: this.optionalAbort.signal,
        simulateAssetError: options.simulateAssetError,
        mobile: typeof window !== "undefined" && window.innerWidth < 640,
        onProgress: (prog) => {
          this.lifecycleManager.updateLoadingProgress(prog.session.token, prog);
        },
        onOptionalConsumer: (result) => this.consumeOptionalAsset(result, sessionId),
      });
    } catch (err) {
      if (this.lifecycleManager.isStale(token)) return;
      // Lifecycle failure/portfolio exit owns the user-facing reason. Its abort is
      // a consequence of that terminal transition, not a new loader failure.
      if (["FAILURE", "STATIC"].includes(this.lifecycleManager.getState())) return;
      this.lifecycleManager.fail((err as Error).message, token);
      throw err;
    }

    this.resourceLedger = loadedAssets.resourceLedger ?? new SessionResourceLedger(sessionId);
    if (!loadedAssets.resourceLedger) {
      this.resourceLedger.registerGltf(loadedAssets.w1Gltf);
      this.resourceLedger.registerGltf(loadedAssets.avatarGltf);
      this.resourceLedger.registerGltf(loadedAssets.fixtureGltf);
    }
    if (!this.lifecycleManager.isCurrentSession(sessionId) || this.isDisposed) {
      this.resourceLedger.disposeSoon();
      this.resourceLedger = null;
      this.pendingOptionalTextures.clear();
      return;
    }

    // 4. Integrate Scene Graph per G1 invariants
    this.integratedResult = integrateScene(
      loadedAssets.w1Gltf,
      loadedAssets.avatarGltf,
      loadedAssets.fixtureGltf
    );
    this.lifecycleManager.recordRequiredStage(sessionId, "integration", "Integrating required scene assets...");
    this.scene.add(this.integratedResult.scene);
    configureProductionLighting(this.integratedResult.scene);
    // Preserve loader clip provenance for conservative static-batch exclusions.
    for (const gltf of [loadedAssets.w1Gltf, loadedAssets.avatarGltf, loadedAssets.fixtureGltf]) {
      gltf.scene.animations = gltf.animations;
    }

    // 5. Initialize Directors
    this.characterDirector = new CharacterDirector(
      this.integratedResult.avatarMixer,
      this.integratedResult.chairMixer,
      this.integratedResult.avatarActions,
      this.integratedResult.chairActions,
      this.integratedResult.bodyTurn,
      this.integratedResult.chairRoot,
      "primary-character-director"
    );
    this.characterDirector.setDecorativePaused(this.isDecorativePaused);

    this.entranceCoordinator = new EntranceCoordinator(
      this.cameraDirector!,
      this.characterDirector,
      "primary-entrance-coordinator"
    );

    this.transitionCoordinator = new TransitionCoordinator(
      this.cameraDirector!,
      this.characterDirector,
      "primary-transition-coordinator"
    );

    if (this.characterDirector) {
      this.experienceController.greeting.setCharacterDirector(this.characterDirector);
    }
    this.interactionBinding = new WorldInteractionBinding({
      canvas: this.canvas, camera: this.camera, scene: this.integratedResult.scene,
      interactionScene: loadedAssets.interactionGltf?.scene,
      controller: this.experienceController,
      enabled: () => this.lifecycleManager.getState() === "HOME" && this.experienceController.getSnapshot().phase === "explore",
      reducedMotion: () => this.reducedMotion,
      onToggleSound: options.onToggleSound,
    });
    if (loadedAssets.interactionGltf) this.scene.add(loadedAssets.interactionGltf.scene);
    this.materialQuality = new RuntimeMaterialQuality(this.scene);
    this.applySceneQuality(this.qualityTier);
    this.installBufferedOptionalTextures();

    // 6. Viewport Sizing
    this.resize();

    // 7. Start Animation Loop
    this.lastTime = performance.now();
    this.scheduleAnimationFrame();

    // 8. Start Entrance Choreography
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    this.lifecycleManager.startEntrance(token, this.reducedMotion);

    if (this.reducedMotion) {
      if (this.entranceCoordinator) {
        this.entranceCoordinator.skip(isMobile);
      }
    } else {
      this.entranceCoordinator
        .playEntrance({
          sessionToken: token,
          isMobile,
          reducedMotion: false,
          durationSec: 5.0,
          onPhaseChange: () => {
            if (this.entranceCoordinator) {
              this.lifecycleManager.updateEntranceDiagnostics(token, this.entranceCoordinator.getDiagnostics());
            }
          },
        })
        .then(() => {
          if (!this.lifecycleManager.isStale(token)) {
            this.lifecycleManager.completeEntrance(token);
          }
        })
        .catch((e) => {
          console.error("[WorldRuntime] Entrance error:", e);
        });
    }

    // Notify ready
    if (options.onReady) {
      options.onReady(this.getDiagnostics());
    }
  }

  private setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x687c9a, 2.1);
    this.scene.add(hemiLight);

    const whiteDir = new THREE.DirectionalLight(0xfff5e8, 3.1);
    whiteDir.position.set(-2, 4, 3);
    whiteDir.castShadow = true;
    whiteDir.shadow.mapSize.set(1024, 1024);
    this.scene.add(whiteDir);

    const cyanLight = new THREE.PointLight(0x78e4ff, 15, 8);
    cyanLight.position.set(2, 2, -1);
    this.scene.add(cyanLight);

    const pinkLight = new THREE.PointLight(0xffa4e6, 14, 8);
    pinkLight.position.set(-1, 2.1, -1.6);
    this.scene.add(pinkLight);
  }

  private animate = (currentTime: number) => {
    if (this.isPaused || !this.canRender()) { this.pause(); return; }
    this.scheduleAnimationFrame();

    const durationMs = this.lastTime ? currentTime - this.lastTime : 0;
    if (durationMs > 0) this.onFrameDuration?.(durationMs, currentTime);
    if (this.isPaused || !this.canRender()) { this.pause(); return; }
    const dt = Math.min(durationMs / 1000, 0.1);
    this.lastTime = currentTime;

    if (this.characterDirector) {
      this.characterDirector.advance(dt);
    }

    if (this.experienceController) {
      this.experienceController.advance(dt);
    }

    if (this.renderer && this.integratedResult) {
      this.renderer.render(this.scene, this.camera);
      this.renderedFrames++;
      this.lastRenderedAt = currentTime;
      this.canvas.dataset.renderedFrames = String(this.renderedFrames);
      const frame: RenderedWorldFrame = {
        frame: this.renderedFrames, timestamp: currentTime, durationMs, qualityTier: this.qualityTier,
        activeClip: this.characterDirector?.currentClip ?? "none", activeClipTimeSec: this.characterDirector?.currentTime ?? 0,
        characterMode: this.characterDirector?.mode ?? "unmounted",
        cameraPreset: this.cameraDirector?.getCurrentPreset() ?? "home-desktop", lifecycleState: this.lifecycleManager.getState(),
        optionalTextureTargets: this.optionalTextureTargets,
        renderCalls: this.renderer.info.render.calls, renderedTriangles: this.renderer.info.render.triangles,
      };
      this.canvas.dispatchEvent(new CustomEvent(WORLD_RENDERED_FRAME_EVENT, { detail: frame }));
    }
  };

  public resize() {
    if (!this.canvas || !this.renderer || this.isDisposed) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth || window.innerWidth;
    const height = parent.clientHeight || window.innerHeight;

    this.renderer.setSize(width, height, false);
    if (this.cameraDirector) {
      this.cameraDirector.resize(width, height);
    }
  }

  public greet(): number {
    const state = this.lifecycleManager.getState();
    if (state === "ENTRANCE") {
      this.skip();
    } else if (state !== "HOME" && state !== "TRANSITION") {
      return 0;
    }
    this.lifecycleManager.startTransition(this.sessionToken);
    const rev = this.characterDirector ? this.characterDirector.playGreeting() : 0;
    setTimeout(() => {
      if (this.lifecycleManager.getState() === "TRANSITION") {
        this.lifecycleManager.completeTransition(this.sessionToken);
      }
    }, 4000);
    return rev;
  }

  public cancel(): number {
    const state = this.lifecycleManager.getState();
    if (state === "ENTRANCE") {
      return this.skip();
    }
    return this.characterDirector ? this.characterDirector.cancel() : 0;
  }

  public skip(): number {
    if (this.lifecycleManager.getState() === "LOADING") this.cancelLoading();
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    if (this.entranceCoordinator) {
      this.entranceCoordinator.skip(isMobile);
    }
    if (this.transitionCoordinator) {
      this.transitionCoordinator.skip();
    }
    this.lifecycleManager.skip(this.sessionToken);
    return this.characterDirector ? this.characterDirector.settle() : 0;
  }

  public escape(): number {
    if (this.lifecycleManager.getState() === "LOADING") this.cancelLoading();
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    if (this.entranceCoordinator) {
      this.entranceCoordinator.skip(isMobile);
    }
    if (this.transitionCoordinator) {
      this.transitionCoordinator.skip();
    }
    if (this.cameraDirector) {
      this.cameraDirector.setPreset(isMobile ? "home-mobile" : "home-desktop");
    }
    if (this.experienceController) {
      this.experienceController.send({ type: "ESCAPE" });
    }
    this.lifecycleManager.escape(this.sessionToken);
    return this.characterDirector ? this.characterDirector.settle() : 0;
  }

  /** Abort loading immediately; the caller then changes lifecycle state and presents the portfolio. */
  public cancelLoading(): boolean {
    if (this.lifecycleManager.getState() !== "LOADING" || this.loadingAbort.signal.aborted) return false;
    this.loadingAbort.abort();
    this.optionalAbort.abort();
    return true;
  }

  public async setCamera(preset: CameraPreset) {
    const state = this.lifecycleManager.getState();
    if (state === "ENTRANCE") {
      this.skip();
    } else if (state !== "HOME" && state !== "TRANSITION") {
      return;
    }
    this.lifecycleManager.startTransition(this.sessionToken);
    if (this.cameraDirector) {
      this.cameraDirector.setPreset(preset);
    }
    this.lifecycleManager.completeTransition(this.sessionToken);
  }

  public setSound(enabled: boolean) {
    this.soundEnabled = enabled;
    void this.experienceController.send({ type: "SET_SOUND", enabled });
  }

  public setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
    this.experienceController.setReducedMotion(enabled);
    if (this.cameraDirector) {
      this.cameraDirector.setReducedMotion(enabled);
    }
  }

  public setQualityTier(tier: QualityTier) {
    this.qualityTier = tier;
    this.applySceneQuality(tier);
    if (!this.renderer) return;
    if (tier === "high") {
      this.renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else if (tier === "medium") {
      this.renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 1.25));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    } else if (tier === "low") {
      // Reduce real raster work even when device DPR is already 1. CSS/DOM
      // controls and camera framing keep their full logical resolution.
      this.renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, this.softwareRenderer ? 0.3 : 1));
      this.renderer.shadowMap.enabled = false;
    } else if (tier === "static") {
      this.pause();
    }
  }

  private applySceneQuality(tier: QualityTier): void {
    this.materialQuality?.apply(tier);
    // Three's fallback submits each instance separately without this extension.
    if (tier === "low" && this.materialQuality && !this.lowQualityBatch
      && this.renderer?.getContext().getExtension("WEBGL_multi_draw")) {
      this.lowQualityBatch = new LowQualityBatch(this.scene);
    }
    this.lowQualityBatch?.apply(tier);
  }

  private consumeOptionalAsset(result: OptionalAssetResult, expectedSession: AssetSessionId): "adopted" | "rejected" {
    if (this.isDisposed || !this.lifecycleManager.isCurrentSession(expectedSession)
      || result.session.generation !== expectedSession.generation || result.session.token !== expectedSession.token
      || result.kind !== "texture" || (result.id !== "deskmat" && result.id !== "wallpaper")) return "rejected";

    const texture = result.resource;
    texture.colorSpace = THREE.SRGBColorSpace;
    if (!this.integratedResult || !this.materialQuality) {
      const previous = this.pendingOptionalTextures.get(result.id);
      if (previous && previous !== texture) this.resourceLedger?.disposeTexture(previous);
      this.pendingOptionalTextures.set(result.id, texture);
      return "adopted";
    }
    return this.installOptionalTexture(result.id, texture) ? "adopted" : "rejected";
  }

  private installOptionalTexture(id: "deskmat" | "wallpaper", texture: THREE.Texture): boolean {
    if (!this.integratedResult || !this.materialQuality) return false;
    const targets = installOptionalTextureOnScene(id, this.integratedResult.scene, texture, this.materialQuality);
    if (!targets) return false;
    this.optionalTextureTargets = { ...this.optionalTextureTargets, [id]: targets };
    return true;
  }

  private installBufferedOptionalTextures(): void {
    for (const [id, texture] of this.pendingOptionalTextures) {
      try {
        if (!this.installOptionalTexture(id, texture)) this.resourceLedger?.disposeTexture(texture);
      } catch {
        this.resourceLedger?.disposeTexture(texture);
        console.warn(`[WorldRuntime] Optional ${id} texture was rejected; retaining the base material.`);
      }
    }
    this.pendingOptionalTextures.clear();
  }

  public setDecorativePaused(paused: boolean) {
    this.isDecorativePaused = paused;
    this.characterDirector?.setDecorativePaused(paused);
  }

  public getDiagnostics(): Diagnostics {
    const charDiag = this.characterDirector?.getDiagnostics() ?? {
      currentClip: "none",
      currentTime: 0,
      mode: "unmounted",
      queueLength: 0,
      chairYawDeg: 0,
      bodyYawDeg: 0,
      ownerId: "none",
    };

    const camDiag = this.cameraDirector?.getDiagnostics() ?? {
      preset: "home-desktop" as CameraPreset,
      position: [0, 0, 0] as [number, number, number],
      fov: 60,
      ownerId: "none",
    };

    const residentPos = this.integratedResult?.resident
      ? (this.integratedResult.resident.getWorldPosition(new THREE.Vector3()).toArray() as [number, number, number])
      : [0, 0, 0];

    const chairPos = this.integratedResult?.chairRoot
      ? (this.integratedResult.chairRoot.getWorldPosition(new THREE.Vector3()).toArray() as [number, number, number])
      : [0, 0, 0];

    return {
      renderedFrames: this.renderedFrames,
      lastRenderedAt: this.lastRenderedAt,
      renderCalls: this.renderer?.info.render.calls ?? 0,
      renderedTriangles: this.renderer?.info.render.triangles ?? 0,
      renderPixelRatio: this.renderer?.getPixelRatio() ?? 0,
      lifecycleState: this.lifecycleManager.getState(),
      residentCount: this.integratedResult?.nodeCounts.residentCount ?? 0,
      chairCount: this.integratedResult?.nodeCounts.chairRootCount ?? 0,
      movingChairCount: this.integratedResult?.nodeCounts.chairRootCount ?? 0,
      deskCount: this.integratedResult?.nodeCounts.deskCount ?? 0,
      fixtureStaticDiscarded: (this.integratedResult?.nodeCounts.fixtureStaticCount ?? 0) === 0,
      residentPosition: residentPos as [number, number, number],
      chairPosition: chairPos as [number, number, number],
      chairYawDeg: charDiag.chairYawDeg,
      bodyYawDeg: charDiag.bodyYawDeg,
      activeClip: charDiag.currentClip,
      currentTime: charDiag.currentTime,
      cameraPreset: camDiag.preset,
      cameraPosition: camDiag.position,
      cameraFov: camDiag.fov,
      soundEnabled: this.soundEnabled,
      reducedMotion: this.reducedMotion,
      qualityTier: this.qualityTier,
      webglRenderer: this.webglRendererName,
      mode: charDiag.mode,
      loadingProgress: this.lifecycleManager.getLoadingProgress(),
      entrance: this.entranceCoordinator?.getDiagnostics() ?? this.lifecycleManager.getEntranceDiagnostics(),
      singleOwners: {
        rendererOwner: this.rendererOwnerId,
        cameraOwner: this.cameraDirector?.getOwnerId() ?? "none",
        transitionOwner: this.transitionCoordinator?.getOwnerId() ?? "none",
        characterActionOwner: this.characterDirector?.ownerId ?? "none",
        assetLoadingSessionOwner: this.assetLoader.getOwnerId(),
        activeSessionToken: this.sessionToken,
      },
      canvasCount: typeof document !== "undefined" ? document.querySelectorAll("canvas").length : 1,
      experienceSnapshot: this.experienceController?.getSnapshot(),
      interactions: this.interactionBinding?.getDiagnostics(),
    };
  }

  /**
   * Complete teardown and GPU disposal (ASTRA-G1-01).
   */
  public dispose() {
    if (this.isDisposed) return;
    this.onSamplingPause?.();
    this.isDisposed = true;
    this.unsubscribeLifecycle?.();
    this.unsubscribeLifecycle = null;
    this.interactionBinding?.dispose();
    this.interactionBinding = null;
    const lowQualityBatch = this.lowQualityBatch;
    this.lowQualityBatch = null;
    const materialQuality = this.materialQuality;
    this.materialQuality = null;
    this.loadingAbort.abort();
    this.optionalAbort.abort();
    const resourceLedger = this.resourceLedger;
    this.resourceLedger = null;
    this.pendingOptionalTextures.clear();
    this.sessionToken++; // Invalidate stale async operations
    this.lifecycleManager.dispose();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.canvas) {
      this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
      this.canvas.removeEventListener("webglcontextrestored", this.handleContextRestored);
    }

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }

    if (this.experienceController) {
      this.experienceController.stop();
    }

    if (this.characterDirector) {
      this.characterDirector.dispose();
      this.characterDirector = null;
    }

    if (this.cameraDirector) {
      this.cameraDirector.dispose();
      this.cameraDirector = null;
    }

    if (this.entranceCoordinator) {
      this.entranceCoordinator.dispose();
      this.entranceCoordinator = null;
    }

    if (this.transitionCoordinator) {
      this.transitionCoordinator.dispose();
      this.transitionCoordinator = null;
    }

    const scene = this.scene;
    const renderer = this.renderer;
    this.renderer = null;
    // Bulk GPU release happens after the caller has rendered its immediate response.
    setTimeout(() => {
      lowQualityBatch?.dispose();
      materialQuality?.dispose();
      resourceLedger?.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Light && obj.shadow?.map) obj.shadow.map.dispose();
      });
      scene.clear();
      if (renderer) {
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch {}
      }
    }, 0);
  }
}
