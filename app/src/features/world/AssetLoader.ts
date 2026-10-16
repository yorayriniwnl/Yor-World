import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { LoadingProgress } from "./types";

export interface LoadedAssets {
  w1Gltf: GLTF;
  avatarGltf: GLTF;
  fixtureGltf: GLTF;
  deskmatTexture: THREE.Texture | null;
  wallpaperTexture: THREE.Texture | null;
  interactionGltf: GLTF | null;
}

export interface AssetLoaderOptions {
  sessionToken: number;
  signal?: AbortSignal | undefined;
  simulateAssetError?: boolean | undefined;
  maxRetries?: number | undefined;
  mobile?: boolean | undefined;
  onProgress?: ((progress: LoadingProgress) => void) | undefined;
}

export class AssetLoadingError extends Error {
  public assetName: string;
  public retryCount: number;

  constructor(message: string, assetName: string, retryCount: number) {
    super(message);
    this.name = "AssetLoadingError";
    this.assetName = assetName;
    this.retryCount = retryCount;
  }
}

export class AssetLoader {
  private ownerId: string;
  private maxRetries: number;

  constructor(ownerId: string = "primary-asset-loader") {
    this.ownerId = ownerId;
    this.maxRetries = 3;
  }

  public getOwnerId(): string {
    return this.ownerId;
  }

  public async loadSession(options: AssetLoaderOptions): Promise<LoadedAssets> {
    const { signal, simulateAssetError = false, maxRetries = 3, onProgress } = options;
    this.maxRetries = maxRetries;

    const report = (
      stage: string,
      progress: number,
      reqLoaded: number,
      reqTotal: number,
      optLoaded: number,
      optTotal: number,
      retryCount: number = 0,
      failedAsset?: string
    ) => {
      if (signal?.aborted) return;
      if (onProgress) {
        onProgress({
          stage,
          progress: Math.min(Math.max(progress, 0), 1),
          requiredLoaded: reqLoaded,
          requiredTotal: reqTotal,
          optionalLoaded: optLoaded,
          optionalTotal: optTotal,
          retryCount,
          maxRetries,
          failedAsset,
        });
      }
    };

    report("Initiating asset session...", 0.05, 0, 3, 0, 1, 0);

    if (signal?.aborted) {
      throw new DOMException("Asset loading aborted by user", "AbortError");
    }

    if (simulateAssetError) {
      report("Failed to load required model asset", 0.1, 0, 3, 0, 1, 3, "production-room-full.glb");
      throw new AssetLoadingError(
        "Simulated Asset Loading 404 / Parse Failure (required asset: production-room-full.glb)",
        "production-room-full.glb",
        3
      );
    }

    const gltfLoader = new GLTFLoader();

    // Helper to load with bounded retry
    const loadRequiredGltf = async (url: string, name: string, baseProgress: number, stageName: string): Promise<GLTF> => {
      let attempts = 0;
      while (attempts <= this.maxRetries) {
        if (signal?.aborted) {
          throw new DOMException("Asset loading aborted by user", "AbortError");
        }
        try {
          report(`Loading ${stageName}...`, baseProgress, attempts, 3, 0, 1, attempts);
          const gltf = await gltfLoader.loadAsync(url);
          if (signal?.aborted) {
            throw new DOMException("Asset loading aborted by user", "AbortError");
          }
          return gltf;
        } catch (err) {
          attempts++;
          if (attempts > this.maxRetries || signal?.aborted) {
            report(`Failed to load ${name}`, baseProgress, 0, 3, 0, 1, attempts, name);
            throw new AssetLoadingError(
              `Required asset "${name}" failed to load after ${attempts} attempts: ${(err as Error).message}`,
              name,
              attempts
            );
          }
          // Short delay before bounded retry
          await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
        }
      }
      throw new AssetLoadingError(`Required asset "${name}" exceeded max retries`, name, attempts);
    };

    // 1. Required Asset 1: Production environment
    const w1Gltf = await loadRequiredGltf("/models/production-room-full.glb", "production-room-full.glb", 0.15, "production environment (required)");
    report("Production environment loaded", 0.4, 1, 3, 0, 1, 0);

    // 2. Required Asset 2: Production resident
    const avatarGltf = await loadRequiredGltf("/models/resident-production.glb", "resident-production.glb", 0.45, "resident avatar (required)");
    report("Resident avatar loaded", 0.65, 2, 3, 0, 1, 0);

    // 3. Required Asset 3: Production chair fixture
    const fixtureGltf = await loadRequiredGltf("/models/fixture-production.glb", "fixture-production.glb", 0.7, "chair fixture (required)");
    report("Chair fixture loaded", 0.85, 3, 3, 0, 1, 0);

    if (signal?.aborted) {
      throw new DOMException("Asset loading aborted by user", "AbortError");
    }
    // The deskmat and wallpaper textures are not consumed by the current scene.
    // The interaction GLB only broadens hit areas and loads after the world starts.
    report("Required assets ready. Configuring scene...", 1.0, 3, 3, 0, 1, 0);

    return {
      w1Gltf,
      avatarGltf,
      fixtureGltf,
      deskmatTexture: null,
      wallpaperTexture: null,
      interactionGltf: null,
    };
  }

  public async loadOptionalInteractionAssets(options: Pick<AssetLoaderOptions, "signal" | "mobile" | "onProgress">): Promise<GLTF | null> {
    const { signal, mobile = false, onProgress } = options;
    const reportProcessed = (stage: string) => {
      if (signal?.aborted) return;
      onProgress?.({
        stage,
        progress: 1,
        requiredLoaded: 3,
        requiredTotal: 3,
        optionalLoaded: 1,
        optionalTotal: 1,
        retryCount: 0,
        maxRetries: this.maxRetries,
      });
    };

    if (signal?.aborted) return null;

    const url = mobile ? "/models/interaction-assets-mobile.glb" : "/models/interaction-assets.glb";
    try {
      const response = await fetch(url, signal ? { signal } : {});
      if (!response.ok) throw new Error(`HTTP ${response.status} while loading ${url}`);
      const binary = await response.arrayBuffer();
      if (signal?.aborted) return null;

      const gltf = await new GLTFLoader().parseAsync(binary, "/models/");
      if (signal?.aborted) {
        this.disposeLoadedGltf(gltf);
        return null;
      }

      reportProcessed("Optional interaction targets loaded.");
      return gltf;
    } catch (error) {
      if (!signal?.aborted) {
        console.warn("[AssetLoader] Optional frozen interaction asset unavailable; production mesh and DOM controls remain available.", error);
        reportProcessed("Optional interaction targets unavailable; production mesh fallback active.");
      }
      return null;
    }
  }

  public disposeLoadedGltf(gltf: GLTF): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    gltf.scene.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.geometry?.isBufferGeometry) geometries.add(mesh.geometry);
      if (Array.isArray(mesh.material)) mesh.material.forEach((material) => materials.add(material));
      else if (mesh.material?.isMaterial) materials.add(mesh.material);
    });

    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
  }
}
