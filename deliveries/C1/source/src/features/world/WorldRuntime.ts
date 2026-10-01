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

export interface WorldRuntimeOptions {
  canvas: HTMLCanvasElement;
  lifecycleManager?: LifecycleManager | undefined;
  experienceController?: ExperienceController | undefined;
  soundEnabled?: boolean | undefined;
  reducedMotion?: boolean | undefined;
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

  public soundEnabled: boolean;
  public reducedMotion: boolean;
  private isDisposed: boolean = false;
  private isPaused: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private webglRendererName: string = "Unknown";
  private sessionToken: number = 0;

  constructor(options: WorldRuntimeOptions) {
    this.canvas = options.canvas;
    this.soundEnabled = options.soundEnabled ?? false;
    this.reducedMotion = options.reducedMotion ?? false;
    this.lifecycleManager = options.lifecycleManager ?? new LifecycleManager();
    this.assetLoader = new AssetLoader("primary-asset-loader");

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0c1017");

    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    this.cameraDirector = new CameraDirector(this.camera, undefined, "primary-camera-director");
    this.cameraDirector.setReducedMotion(this.reducedMotion);

    this.experienceController =
      options.experienceController ??
      new ExperienceController({
        cameraDirector: this.cameraDirector,
        reducedMotion: this.reducedMotion,
      });

    // Attach canvas context loss listeners
    this.canvas.addEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.addEventListener("webglcontextrestored", this.handleContextRestored);

    // Attach document visibility listener
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    this.init(options).catch((err) => {
      console.error("[WorldRuntime] Initialization error:", err);
      this.lifecycleManager.fail(err.message, this.sessionToken);
      if (options.onError) {
        options.onError(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private handleContextLost = (e: Event) => {
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
    this.isPaused = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resume() {
    if (!this.isPaused || this.isDisposed) return;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  private async init(options: WorldRuntimeOptions) {
    const token = this.lifecycleManager.requestEntry();
    this.sessionToken = token;

    // 1. Renderer initialization with fault simulation support
    if (options.simulateRendererError) {
      const err = new Error("Simulated WebGL Renderer Context Failure");
      this.lifecycleManager.fail(err.message, token);
      throw err;
    }

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const gl = this.renderer.getContext();
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      this.webglRendererName = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER) || "WebGL";
    } catch (e) {
      const err = new Error(`WebGL context creation failed: ${(e as Error).message}`);
      this.lifecycleManager.fail(err.message, token);
      throw err;
    }

    if (this.lifecycleManager.isStale(token)) return;

    // 2. Setup Lighting matching accepted palette
    this.setupLighting();

    // 3. Asset Loading via single AssetLoader owner
    this.lifecycleManager.startLoading(token);

    let loadedAssets;
    try {
      loadedAssets = await this.assetLoader.loadSession({
        sessionToken: token,
        simulateAssetError: options.simulateAssetError,
        onProgress: (prog) => {
          this.lifecycleManager.updateLoadingProgress(token, prog);
        },
      });
    } catch (err) {
      if (this.lifecycleManager.isStale(token)) return;
      this.lifecycleManager.fail((err as Error).message, token);
      throw err;
    }

    if (this.lifecycleManager.isStale(token)) return;

    // 4. Integrate Scene Graph per G1 invariants
    this.integratedResult = integrateScene(
      loadedAssets.w1Gltf,
      loadedAssets.avatarGltf,
      loadedAssets.fixtureGltf
    );
    this.scene.add(this.integratedResult.scene);

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

    // 6. Viewport Sizing
    this.resize();

    // 7. Start Animation Loop
    this.lastTime = performance.now();
    this.animate(this.lastTime);

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
    if (this.isDisposed || this.isPaused) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const dt = this.lastTime ? Math.min((currentTime - this.lastTime) / 1000, 0.1) : 0;
    this.lastTime = currentTime;

    if (this.characterDirector) {
      this.characterDirector.advance(dt);
    }

    if (this.experienceController) {
      this.experienceController.advance(dt);
    }

    if (this.renderer && this.integratedResult) {
      this.integratedResult.residentBody.skeleton.update();
      this.renderer.render(this.scene, this.camera);
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
  }

  public setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
    if (this.cameraDirector) {
      this.cameraDirector.setReducedMotion(enabled);
    }
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
    };
  }

  /**
   * Complete teardown and GPU disposal (ASTRA-G1-01).
   */
  public dispose() {
    this.isDisposed = true;
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

    // Traverse scene and recursively dispose GPU resources (ASTRA-G1-01)
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            for (const mat of obj.material) {
              this.disposeMaterial(mat);
            }
          } else {
            this.disposeMaterial(obj.material);
          }
        }
      }
      if (obj instanceof THREE.Light) {
        if (obj.shadow && obj.shadow.map) {
          obj.shadow.map.dispose();
        }
      }
    });

    this.scene.clear();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
  }

  private disposeMaterial(material: THREE.Material) {
    const mat = material as unknown as Record<string, unknown>;
    const textureKeys = [
      "map", "alphaMap", "aoMap", "bumpMap", "displacementMap",
      "emissiveMap", "envMap", "lightMap", "metalnessMap",
      "normalMap", "roughnessMap", "clearcoatMap", "clearcoatRoughnessMap"
    ];
    for (const key of textureKeys) {
      const val = mat[key];
      if (val && typeof (val as { dispose?: () => void }).dispose === "function") {
        (val as { dispose: () => void }).dispose();
      }
    }
    material.dispose();
  }
}
