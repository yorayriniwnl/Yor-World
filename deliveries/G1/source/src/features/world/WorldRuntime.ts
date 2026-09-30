import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { integrateScene, IntegratedSceneResult } from "./SceneIntegrator";
import { CharacterDirector } from "./CharacterDirector";
import { CameraDirector } from "./CameraDirector";
import type { CameraPreset, Diagnostics } from "./types";

export interface WorldRuntimeOptions {
  canvas: HTMLCanvasElement;
  soundEnabled?: boolean | undefined;
  reducedMotion?: boolean | undefined;
  simulateAssetError?: boolean | undefined;
  simulateRendererError?: boolean | undefined;
  onReady?: ((diagnostics: Diagnostics) => void) | undefined;
  onError?: ((err: Error) => void) | undefined;
}

export class WorldRuntime {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private characterDirector: CharacterDirector | null = null;
  private cameraDirector: CameraDirector | null = null;
  private integratedResult: IntegratedSceneResult | null = null;

  public soundEnabled: boolean;
  public reducedMotion: boolean;
  private isDisposed: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private webglRendererName: string = "Unknown";

  constructor(options: WorldRuntimeOptions) {
    this.canvas = options.canvas;
    this.soundEnabled = options.soundEnabled ?? false;
    this.reducedMotion = options.reducedMotion ?? false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0c1017");

    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    this.cameraDirector = new CameraDirector(this.camera, "home-desktop");
    this.cameraDirector.setReducedMotion(this.reducedMotion);

    this.init(options).catch((err) => {
      console.error("[WorldRuntime] Initialization error:", err);
      if (options.onError) {
        options.onError(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private async init(options: WorldRuntimeOptions) {
    // 1. Renderer initialization with fault simulation support
    if (options.simulateRendererError) {
      throw new Error("Simulated WebGL Renderer Context Failure");
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
      throw new Error(`WebGL context creation failed: ${(e as Error).message}`);
    }

    // 2. Lighting setup matching main reference palette
    this.setupLighting();

    // 3. Asset Loading with fault simulation support
    if (options.simulateAssetError) {
      throw new Error("Simulated Asset Loading 404 / Parse Failure");
    }

    const loader = new GLTFLoader();
    const [w1Gltf, avatarGltf, fixtureGltf] = await Promise.all([
      loader.loadAsync("/models/room-blockout.glb"),
      loader.loadAsync("/models/avatar-proof.glb"),
      loader.loadAsync("/models/fixture-proof.glb"),
    ]);

    if (this.isDisposed) return;

    // 4. Integrate Scene Graph per G1 invariants
    this.integratedResult = integrateScene(w1Gltf, avatarGltf, fixtureGltf);
    this.scene.add(this.integratedResult.scene);

    // 5. Initialize Directors
    this.characterDirector = new CharacterDirector(
      this.integratedResult.avatarMixer,
      this.integratedResult.chairMixer,
      this.integratedResult.avatarActions,
      this.integratedResult.chairActions,
      this.integratedResult.bodyTurn,
      this.integratedResult.chairRoot
    );

    // 6. Handle Viewport Sizing
    this.resize();

    // 7. Start Animation Loop
    this.lastTime = performance.now();
    this.animate(this.lastTime);

    // Notify ready
    if (options.onReady) {
      options.onReady(this.getDiagnostics());
    }
  }

  private setupLighting() {
    // Ambient / Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x687c9a, 2.1);
    this.scene.add(hemiLight);

    // Main Directional Workstation Light (warm task light)
    const whiteDir = new THREE.DirectionalLight(0xfff5e8, 3.1);
    whiteDir.position.set(-2, 4, 3);
    whiteDir.castShadow = true;
    whiteDir.shadow.mapSize.set(1024, 1024);
    this.scene.add(whiteDir);

    // Cyan Fill / Accent
    const cyanLight = new THREE.PointLight(0x78e4ff, 15, 8);
    cyanLight.position.set(2, 2, -1);
    this.scene.add(cyanLight);

    // Pink / Violet Hex Cluster Accent
    const pinkLight = new THREE.PointLight(0xffa4e6, 14, 8);
    pinkLight.position.set(-1, 2.1, -1.6);
    this.scene.add(pinkLight);
  }

  private animate = (currentTime: number) => {
    if (this.isDisposed) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const dt = this.lastTime ? Math.min((currentTime - this.lastTime) / 1000, 0.1) : 0;
    this.lastTime = currentTime;

    if (this.characterDirector) {
      this.characterDirector.advance(dt);
    }

    if (this.renderer && this.integratedResult) {
      this.integratedResult.residentBody.skeleton.update();
      this.renderer.render(this.scene, this.camera);
    }
  };

  public resize() {
    if (!this.canvas || !this.renderer) return;
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
    return this.characterDirector ? this.characterDirector.playGreeting() : 0;
  }

  public cancel(): number {
    return this.characterDirector ? this.characterDirector.cancel() : 0;
  }

  public skip(): number {
    return this.characterDirector ? this.characterDirector.settle() : 0;
  }

  public setCamera(preset: CameraPreset) {
    if (this.cameraDirector) {
      this.cameraDirector.setPreset(preset);
    }
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
    };

    const camDiag = this.cameraDirector?.getDiagnostics() ?? {
      preset: "home-desktop" as CameraPreset,
      position: [0, 0, 0] as [number, number, number],
      fov: 60,
    };

    const residentPos = this.integratedResult?.resident
      ? (this.integratedResult.resident.getWorldPosition(new THREE.Vector3()).toArray() as [number, number, number])
      : [0, 0, 0];

    const chairPos = this.integratedResult?.chairRoot
      ? (this.integratedResult.chairRoot.getWorldPosition(new THREE.Vector3()).toArray() as [number, number, number])
      : [0, 0, 0];

    return {
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
    };
  }

  public dispose() {
    this.isDisposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
