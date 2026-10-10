import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { LoadingProgress, ByteProgress } from "./types";
import {
  AssetSessionId,
  OptionalConsumer,
  SessionResourceLedger,
} from "./asset-resources";

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
  sessionGeneration?: number | undefined;
  signal?: AbortSignal | undefined;
  simulateAssetError?: boolean | undefined;
  maxRetries?: number | undefined;
  mobile?: boolean | undefined;
  onProgress?: ((progress: LoadingProgress) => void) | undefined;
  onOptionalReady?: ((optional: OptionalAssetsUpdate) => void) | undefined;
  onOptionalConsumer?: OptionalConsumer | undefined;
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

interface FetchResult {
  buffer: ArrayBuffer;
  isCompressed: boolean;
  contentLength: number;
}

async function fetchWithAbort(
  url: string,
  signal?: AbortSignal,
  onByteProgress?: (loaded: number, total: number, isCompressed: boolean) => void
): Promise<FetchResult> {
  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }

  const contentEncoding = res.headers.get("content-encoding");
  const isCompressed = Boolean(contentEncoding && contentEncoding !== "identity");
  const contentLengthHeader = res.headers.get("content-length");
  const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

  if (!res.body || contentLength <= 0) {
    const buf = await res.arrayBuffer();
    if (onByteProgress && contentLength > 0) {
      onByteProgress(contentLength, contentLength, isCompressed);
    }
    return { buffer: buf, isCompressed, contentLength };
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    if (signal?.aborted) {
      try {
        await reader.cancel();
      } catch {}
      throw new DOMException("Asset loading aborted by user", "AbortError");
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      if (onByteProgress) {
        onByteProgress(loaded, contentLength, isCompressed);
      }
    }
  }

  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    combined.set(c, offset);
    offset += c.length;
  }

  return { buffer: combined.buffer, isCompressed, contentLength };
}

export class AssetLoader {
  public readonly ownerId: string;
  public maxRetries: number;

  constructor(ownerId: string = "primary-asset-loader") {
    this.ownerId = ownerId;
    this.maxRetries = 2; // Exact R2 contract: 2 automatic retries (3 attempts total)
  }

  public getOwnerId(): string {
    return this.ownerId;
  }

  public async loadSession(options: AssetLoaderOptions): Promise<LoadedAssets> {
    const {
      signal,
      simulateAssetError = false,
      maxRetries = 2,
      onProgress,
      onOptionalReady,
      onOptionalConsumer,
    } = options;

    // Ceiling: maximum 2 automatic retries allowed by contract
    this.maxRetries = Math.min(Math.max(maxRetries, 0), 2);

    const sessionId: AssetSessionId = {
      generation: options.sessionGeneration ?? 1,
      token: options.sessionToken,
    };

    const ledger = new SessionResourceLedger(sessionId);

    // Track active abort state
    const abortListener = () => {
      ledger.dispose();
    };
    signal?.addEventListener("abort", abortListener, { once: true });

    let optionalLoadedCount = 0;

    const report = (
      stage: string,
      reqLoaded: number,
      reqTotal: number,
      optLoaded: number,
      optTotal: number,
      retryCount: number = 0,
      failedAsset?: string,
      byteProgress?: ByteProgress
    ) => {
      if (signal?.aborted) return;
      if (onProgress) {
        let numericProgress = -1;
        const bytesShape: ByteProgress = byteProgress ?? {
          kind: "indeterminate",
          reason: "asset-count-only",
        };

        if (bytesShape.kind === "determinate") {
          numericProgress =
            bytesShape.total > 0
              ? Math.min(Math.max(bytesShape.loaded / bytesShape.total, 0), 1)
              : 0;
        }

        const attemptNumber = (Math.min(retryCount + 1, 3)) as 1 | 2 | 3;

        onProgress({
          session: sessionId,
          stage,
          progress: numericProgress,
          bytes: bytesShape,
          requiredLoaded: reqLoaded,
          requiredTotal: reqTotal,
          optionalLoaded: optLoaded,
          optionalTotal: optTotal,
          retryCount,
          maxRetries: this.maxRetries,
          attempt: attemptNumber,
          failedAsset,
          bytesLoaded: bytesShape.kind === "determinate" ? bytesShape.loaded : undefined,
          bytesTotal: bytesShape.kind === "determinate" ? bytesShape.total : undefined,
        });
      }
    };

    report("Initiating asset session...", 0, 3, 0, 2, 0);

    if (signal?.aborted) {
      ledger.dispose();
      throw new DOMException("Asset loading aborted by user", "AbortError");
    }

    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();

    // Helper to load required GLTF with bounded retry (at most 2 automatic retries, 500ms then 1500ms)
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

          report(
            `Loading ${stageName}...`,
            reqIndex,
            3,
            optionalLoadedCount,
            2,
            attempts
          );

          let gltf: GLTF;

          if (typeof window !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
            const { buffer } = await fetchWithAbort(
              url,
              signal,
              (loaded, total, compressed) => {
                // If stream is compressed or sizes do not agree, keep indeterminate
                if (compressed || total <= 0 || loaded > total) {
                  report(
                    `Loading ${stageName}...`,
                    reqIndex,
                    3,
                    optionalLoadedCount,
                    2,
                    attempts,
                    undefined,
                    { kind: "indeterminate", reason: "compressed-or-chunked-stream" }
                  );
                } else {
                  report(
                    `Loading ${stageName}...`,
                    reqIndex,
                    3,
                    optionalLoadedCount,
                    2,
                    attempts,
                    undefined,
                    {
                      kind: "determinate",
                      scope: "required-session",
                      loaded,
                      total,
                    }
                  );
                }
              }
            );

            if (signal?.aborted) {
              throw new DOMException("Asset loading aborted by user", "AbortError");
            }

            gltf = await gltfLoader.parseAsync(buffer, url);
          } else {
            gltf = await gltfLoader.loadAsync(url);
          }

          if (signal?.aborted) {
            ledger.disposeGltf(gltf);
            throw new DOMException("Asset loading aborted by user", "AbortError");
          }

          ledger.registerGltf(gltf);
          return gltf;
        } catch (err) {
          if (signal?.aborted || (err as Error).name === "AbortError") {
            throw new DOMException("Asset loading aborted by user", "AbortError");
          }
          attempts++;
          if (attempts > this.maxRetries) {
            report(`Failed to load ${name}`, reqIndex, 3, optionalLoadedCount, 2, attempts, name);
            throw new AssetLoadingError(
              `Required asset "${name}" failed to load after ${attempts} attempts: ${(err as Error).message}`,
              name,
              attempts
            );
          }

          // Exact R2 contract: 500ms then 1500ms backoff
          const backoffMs = attempts === 1 ? 500 : 1500;

          await new Promise<void>((resolve, reject) => {
            if (signal?.aborted) {
              reject(new DOMException("Asset loading aborted by user", "AbortError"));
              return;
            }
            const timer: ReturnType<typeof setTimeout> = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, backoffMs);
            const onAbort = () => {
              clearTimeout(timer);
              signal?.removeEventListener("abort", onAbort);
              reject(new DOMException("Asset loading aborted by user", "AbortError"));
            };
            
            signal?.addEventListener("abort", onAbort, { once: true });
          });
        }
      }
      throw new AssetLoadingError(`Required asset "${name}" exceeded max retries`, name, attempts);
    };

    let w1Gltf: GLTF;
    let avatarGltf: GLTF;
    let fixtureGltf: GLTF;

    try {
      // 1. Required Asset 1: Production environment
      w1Gltf = await loadRequiredGltf(
        "/models/production-room-full.glb",
        "production-room-full.glb",
        "production environment (required)",
        0
      );
      report("Production environment loaded", 1, 3, optionalLoadedCount, 2, 0);

      // 2. Required Asset 2: Production resident
      avatarGltf = await loadRequiredGltf(
        "/models/resident-production.glb",
        "resident-production.glb",
        "resident avatar (required)",
        1
      );
      report("Resident avatar loaded", 2, 3, optionalLoadedCount, 2, 0);

      // 3. Required Asset 3: Production chair fixture
      fixtureGltf = await loadRequiredGltf(
        "/models/fixture-production.glb",
        "fixture-production.glb",
        "chair fixture (required)",
        2
      );
      report("All required assets ready. Configuring scene...", 3, 3, optionalLoadedCount, 2, 0);
    } catch (err) {
      // Required failure: cleanly dispose all partially loaded required assets!
      ledger.dispose();
      throw err;
    }

    // Essential Group A is fully ready!
    // Optional Group B starts asynchronously in background without blocking world entrance readiness.
    const deskmatTexture: THREE.Texture | null = null;
    const wallpaperTexture: THREE.Texture | null = null;
    const interactionGltf: GLTF | null = null;

    const loadOptionalAssets = async () => {
      // 1. Deskmat texture
      try {
        if (!signal?.aborted) {
          let texture: THREE.Texture;
          if (typeof window !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
            const { buffer } = await fetchWithAbort("/textures/deskmat-topography.png", signal);
            if (signal?.aborted) return;
            const blob = new Blob([buffer]);
            const objectUrl = URL.createObjectURL(blob);
            ledger.registerObjectUrl(objectUrl);
            try {
              texture = await textureLoader.loadAsync(objectUrl);
            } finally {
              ledger.revokeObjectUrl(objectUrl);
            }
          } else {
            texture = await textureLoader.loadAsync("/textures/deskmat-topography.png");
          }

          if (signal?.aborted) {
            texture.dispose();
            return;
          }

          ledger.registerTexture(texture);

          let adopted = false;
          if (onOptionalConsumer) {
            const decision = onOptionalConsumer({
              session: sessionId,
              id: "deskmat",
              kind: "texture",
              resource: texture,
            });
            adopted = decision === "adopted";
          } else if (onOptionalReady) {
            onOptionalReady({ deskmatTexture: texture });
            adopted = true;
          }

          if (!adopted) {
            ledger.disposeTexture(texture);
          } else {
            optionalLoadedCount++;
            report("Optional deskmat texture processed", 3, 3, optionalLoadedCount, 2, 0);
          }
        }
      } catch {
        console.warn("[AssetLoader] Optional asset deskmat-topography.png failed to load; using fallback material.");
      }

      // 2. Wallpaper texture
      try {
        if (!signal?.aborted) {
          let texture: THREE.Texture;
          if (typeof window !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
            const { buffer } = await fetchWithAbort("/textures/monitor-wallpaper.png", signal);
            if (signal?.aborted) return;
            const blob = new Blob([buffer]);
            const objectUrl = URL.createObjectURL(blob);
            ledger.registerObjectUrl(objectUrl);
            try {
              texture = await textureLoader.loadAsync(objectUrl);
            } finally {
              ledger.revokeObjectUrl(objectUrl);
            }
          } else {
            texture = await textureLoader.loadAsync("/textures/monitor-wallpaper.png");
          }

          if (signal?.aborted) {
            texture.dispose();
            return;
          }

          ledger.registerTexture(texture);

          let adopted = false;
          if (onOptionalConsumer) {
            const decision = onOptionalConsumer({
              session: sessionId,
              id: "wallpaper",
              kind: "texture",
              resource: texture,
            });
            adopted = decision === "adopted";
          } else if (onOptionalReady) {
            onOptionalReady({ wallpaperTexture: texture });
            adopted = true;
          }

          if (!adopted) {
            ledger.disposeTexture(texture);
          } else {
            optionalLoadedCount++;
            report("Optional wallpaper texture processed", 3, 3, optionalLoadedCount, 2, 0);
          }
        }
      } catch {
        console.warn("[AssetLoader] Optional asset monitor-wallpaper.png failed to load; using fallback material.");
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
