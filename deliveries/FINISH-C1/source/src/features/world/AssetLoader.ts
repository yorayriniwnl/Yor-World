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

export interface OptionalAssetsUpdate {
  deskmatTexture?: THREE.Texture | null;
  wallpaperTexture?: THREE.Texture | null;
  interactionGltf?: GLTF | null;
}

export interface AssetLoaderOptions {
  sessionToken: number;
  signal?: AbortSignal | undefined;
  simulateAssetError?: boolean | undefined;
  maxRetries?: number | undefined;
  mobile?: boolean | undefined;
  onProgress?: ((progress: LoadingProgress) => void) | undefined;
  onOptionalReady?: ((optional: OptionalAssetsUpdate) => void) | undefined;
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

async function fetchWithAbort(
  url: string,
  signal?: AbortSignal,
  onByteProgress?: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  const contentLength = res.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  if (!res.body || total <= 0) {
    const buf = await res.arrayBuffer();
    if (onByteProgress && total > 0) onByteProgress(total, total);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      if (onByteProgress) onByteProgress(loaded, total);
    }
  }
  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    combined.set(c, offset);
    offset += c.length;
  }
  return combined.buffer;
}

export class AssetLoader {
  private ownerId: string;
  private maxRetries: number;

  constructor(ownerId: string = "primary-asset-loader") {
    this.ownerId = ownerId;
    this.maxRetries = 2; // Default 2 automatic retries (3 attempts total)
  }

  public getOwnerId(): string {
    return this.ownerId;
  }

  public async loadSession(options: AssetLoaderOptions): Promise<LoadedAssets> {
    const { signal, simulateAssetError = false, maxRetries = 2, onProgress, onOptionalReady } = options;
    this.maxRetries = maxRetries;
    let optionalLoadedCount = 0;

    const report = (
      stage: string,
      reqLoaded: number,
      reqTotal: number,
      optLoaded: number,
      optTotal: number,
      retryCount: number = 0,
      failedAsset?: string,
      bytesLoaded?: number,
      bytesTotal?: number
    ) => {
      if (signal?.aborted) return;
      if (onProgress) {
        const progress =
          bytesTotal && bytesTotal > 0 && typeof bytesLoaded === "number"
            ? Math.min(Math.max(bytesLoaded / bytesTotal, 0), 1)
            : -1; // -1 represents truthful indeterminate progress (no arbitrary weights)
        onProgress({
          stage,
          progress,
          requiredLoaded: reqLoaded,
          requiredTotal: reqTotal,
          optionalLoaded: optLoaded,
          optionalTotal: optTotal,
          retryCount,
          maxRetries: this.maxRetries,
          failedAsset,
          bytesLoaded,
          bytesTotal,
        });
      }
    };

    report("Initiating asset session...", 0, 3, 0, 3, 0);

    if (signal?.aborted) {
      throw new DOMException("Asset loading aborted by user", "AbortError");
    }

    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();

    // Helper to load with bounded retry (at most maxRetries automatic retries)
    const loadRequiredGltf = async (
      url: string,
      name: string,
      stageName: string,
      reqIndex: number
    ): Promise<GLTF> => {
      let attempts = 0;
      while (attempts <= this.maxRetries) {
        if (signal?.aborted) {
          throw new DOMException("Asset loading aborted by user", "AbortError");
        }
        try {
          if (simulateAssetError) {
            throw new Error(`Simulated asset failure for ${name}`);
          }
          report(`Loading ${stageName}...`, reqIndex, 3, optionalLoadedCount, 3, attempts);
          let gltf: GLTF;
          if (typeof window !== "undefined") {
            const buffer = await fetchWithAbort(url, signal, (loaded, total) => {
              if (total > 0) {
                report(`Loading ${stageName}...`, reqIndex, 3, optionalLoadedCount, 3, attempts, undefined, loaded, total);
              }
            });
            if (signal?.aborted) {
              throw new DOMException("Asset loading aborted by user", "AbortError");
            }
            gltf = await gltfLoader.parseAsync(buffer, url);
          } else {
            gltf = await gltfLoader.loadAsync(url);
          }
          if (signal?.aborted) {
            throw new DOMException("Asset loading aborted by user", "AbortError");
          }
          return gltf;
        } catch (err) {
          if (signal?.aborted || (err as Error).name === "AbortError") {
            throw new DOMException("Asset loading aborted by user", "AbortError");
          }
          attempts++;
          if (attempts > this.maxRetries) {
            report(`Failed to load ${name}`, reqIndex, 3, optionalLoadedCount, 3, attempts, name);
            throw new AssetLoadingError(
              `Required asset "${name}" failed to load after ${attempts} attempts: ${(err as Error).message}`,
              name,
              attempts
            );
          }
          // Bounded backoff before automatic retry
          const backoffMs = Math.min(150 * Math.pow(2, attempts - 1), 600);
          await new Promise<void>((resolve, reject) => {
            if (signal?.aborted) {
              reject(new DOMException("Asset loading aborted by user", "AbortError"));
              return;
            }
            const timer = setTimeout(() => resolve(), backoffMs);
            const onAbort = () => {
              clearTimeout(timer);
              reject(new DOMException("Asset loading aborted by user", "AbortError"));
            };
            signal?.addEventListener("abort", onAbort, { once: true });
          });
        }
      }
      throw new AssetLoadingError(`Required asset "${name}" exceeded max retries`, name, attempts);
    };

    // 1. Required Asset 1: Production environment
    const w1Gltf = await loadRequiredGltf(
      "/models/production-room-full.glb",
      "production-room-full.glb",
      "production environment (required)",
      0
    );
    report("Production environment loaded", 1, 3, optionalLoadedCount, 3, 0);

    // 2. Required Asset 2: Production resident
    const avatarGltf = await loadRequiredGltf(
      "/models/resident-production.glb",
      "resident-production.glb",
      "resident avatar (required)",
      1
    );
    report("Resident avatar loaded", 2, 3, optionalLoadedCount, 3, 0);

    // 3. Required Asset 3: Production chair fixture
    const fixtureGltf = await loadRequiredGltf(
      "/models/fixture-production.glb",
      "fixture-production.glb",
      "chair fixture (required)",
      2
    );
    report("All required assets ready. Configuring scene...", 3, 3, optionalLoadedCount, 3, 0);

    // Essential Group A is fully ready!
    // Optional Group B starts in background without blocking world entrance readiness.
    let deskmatTexture: THREE.Texture | null = null;
    let wallpaperTexture: THREE.Texture | null = null;
    let interactionGltf: GLTF | null = null;

    const loadOptionalAssets = async () => {
      // 1. Deskmat texture
      try {
        if (!signal?.aborted) {
          if (typeof window !== "undefined") {
            const buf = await fetchWithAbort("/textures/deskmat-topography.png", signal);
            const blob = new Blob([buf]);
            const objectUrl = URL.createObjectURL(blob);
            deskmatTexture = await textureLoader.loadAsync(objectUrl);
            URL.revokeObjectURL(objectUrl);
          } else {
            deskmatTexture = await textureLoader.loadAsync("/textures/deskmat-topography.png");
          }
          optionalLoadedCount++;
          report("Optional deskmat texture processed", 3, 3, optionalLoadedCount, 3, 0);
          onOptionalReady?.({ deskmatTexture });
        }
      } catch {
        console.warn("[AssetLoader] Optional asset deskmat-topography.png failed to load; using fallback material.");
      }

      // 2. Wallpaper texture
      try {
        if (!signal?.aborted) {
          if (typeof window !== "undefined") {
            const buf = await fetchWithAbort("/textures/monitor-wallpaper.png", signal);
            const blob = new Blob([buf]);
            const objectUrl = URL.createObjectURL(blob);
            wallpaperTexture = await textureLoader.loadAsync(objectUrl);
            URL.revokeObjectURL(objectUrl);
          } else {
            wallpaperTexture = await textureLoader.loadAsync("/textures/monitor-wallpaper.png");
          }
          optionalLoadedCount++;
          report("Optional wallpaper texture processed", 3, 3, optionalLoadedCount, 3, 0);
          onOptionalReady?.({ wallpaperTexture });
        }
      } catch {
        console.warn("[AssetLoader] Optional asset monitor-wallpaper.png failed to load; using fallback material.");
      }

      // 3. Interaction GLTF
      try {
        if (!signal?.aborted) {
          const url = options.mobile
            ? "/models/interaction-assets-mobile.glb"
            : "/models/interaction-assets.glb";
          if (typeof window !== "undefined") {
            const buf = await fetchWithAbort(url, signal);
            interactionGltf = await gltfLoader.parseAsync(buf, url);
          } else {
            interactionGltf = await gltfLoader.loadAsync(url);
          }
          optionalLoadedCount++;
          report("Optional interaction assets processed", 3, 3, optionalLoadedCount, 3, 0);
          onOptionalReady?.({ interactionGltf });
        }
      } catch {
        console.warn("[AssetLoader] Optional frozen interaction asset unavailable; production mesh and DOM controls remain available.");
      }
    };

    void loadOptionalAssets();

    return {
      w1Gltf,
      avatarGltf,
      fixtureGltf,
      deskmatTexture,
      wallpaperTexture,
      interactionGltf,
    };
  }
}
