import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { LoadingProgress, ByteProgress, RequiredProgressActivity } from "./types";
import {
  AssetSessionId,
  OptionalAssetResult,
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
  resourceLedger?: SessionResourceLedger | undefined;
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
  optionalSignal?: AbortSignal | undefined;
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
  byteLength: number;
  trustedLength: boolean;
}

interface ByteRead {
  loaded: number;
  total: number;
  isCompressed: boolean;
  trustedLength: boolean;
  eof: boolean;
}

async function fetchWithAbort(
  url: string,
  signal?: AbortSignal,
  onByteProgress?: (progress: ByteRead) => void
): Promise<FetchResult> {
  const response = await fetch(url, signal ? { signal } : undefined);
  if (!response.ok) throw new Error(`HTTP ${response.status} for required asset`);

  const rawEncoding = response.headers.get("content-encoding");
  const encoding = rawEncoding?.trim().toLowerCase();
  const isCompressed = encoding !== undefined && encoding !== "" && encoding !== "identity";
  const hasTransferEncoding = response.headers.get("transfer-encoding") !== null;
  const rawLength = response.headers.get("content-length");
  const normalizedLength = rawLength?.trim();
  const parsedLength = normalizedLength && /^[1-9]\d*$/.test(normalizedLength) ? Number(normalizedLength) : Number.NaN;
  const hasTrustedHeader = response.status === 200
    && encoding === "identity"
    && !hasTransferEncoding
    && Number.isSafeInteger(parsedLength)
    && parsedLength > 0;
  const contentLength = hasTrustedHeader ? parsedLength : 0;

  if (signal?.aborted) throw new DOMException("Asset loading aborted by user", "AbortError");
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    const byteLength = buffer.byteLength;
    onByteProgress?.({ loaded: byteLength, total: contentLength, isCompressed, trustedLength: hasTrustedHeader, eof: true });
    return {
      buffer,
      isCompressed,
      contentLength,
      byteLength,
      trustedLength: hasTrustedHeader && byteLength === contentLength,
    };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  onByteProgress?.({ loaded: 0, total: contentLength, isCompressed, trustedLength: hasTrustedHeader, eof: false });
  try {
    while (true) {
      if (signal?.aborted) {
        try { await reader.cancel(); } catch {}
        throw new DOMException("Asset loading aborted by user", "AbortError");
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.byteLength) {
        chunks.push(value);
        loaded += value.byteLength;
        onByteProgress?.({ loaded, total: contentLength, isCompressed, trustedLength: hasTrustedHeader, eof: false });
      }
    }
  } catch (error) {
    try { await reader.cancel(); } catch {}
    throw error;
  }

  const buffer = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onByteProgress?.({ loaded, total: contentLength, isCompressed, trustedLength: hasTrustedHeader, eof: true });
  return {
    buffer: buffer.buffer,
    isCompressed,
    contentLength,
    byteLength: loaded,
    trustedLength: hasTrustedHeader && loaded === contentLength,
  };
}

const REQUIRED_ASSET_IDS = ["room", "resident", "fixture"] as const;
type RequiredAssetId = typeof REQUIRED_ASSET_IDS[number];

interface AttemptProgress {
  attempt: number;
  loaded: number;
  total: number;
  trustedLength: boolean;
}

export class AssetLoader {
  public readonly ownerId: string;
  public readonly maxRetries = 2;

  constructor(ownerId = "primary-asset-loader") {
    this.ownerId = ownerId;
  }

  public getOwnerId(): string {
    return this.ownerId;
  }

  public async loadSession(options: AssetLoaderOptions): Promise<LoadedAssets> {
    const {
      signal,
      simulateAssetError = false,
      onProgress,
      onOptionalReady,
      onOptionalConsumer,
    } = options;
    const optionalSignal = options.optionalSignal ?? signal;
    const retryLimit = Number.isFinite(options.maxRetries)
      ? Math.min(2, Math.max(0, Math.floor(options.maxRetries!)))
      : 2;
    const sessionId: AssetSessionId = {
      generation: options.sessionGeneration ?? 1,
      token: options.sessionToken,
    };
    const ledger = new SessionResourceLedger(sessionId);
    const abortListener = () => ledger.disposeSoon();
    signal?.addEventListener("abort", abortListener, { once: true });

    let requiredLoaded = 0;
    let optionalLoaded = 0;
    const attemptProgress: AttemptProgress[] = REQUIRED_ASSET_IDS.map(() => ({ attempt: 0, loaded: 0, total: 0, trustedLength: false }));
    let aggregateInvalid = false;
    let lastBytes: ByteProgress = { kind: "indeterminate", reason: "required-headers-unconfirmed" };
    let lastRatio: number | undefined;

    const currentAggregate = (): ByteProgress => {
      const allKnown = attemptProgress.every((entry) => entry.trustedLength && entry.total > 0);
      if (aggregateInvalid || !allKnown) {
        return { kind: "indeterminate", reason: aggregateInvalid ? "untrusted-required-representation" : "required-headers-unconfirmed" };
      }
      const total = attemptProgress.reduce((sum, entry) => sum + entry.total, 0);
      const loaded = attemptProgress.reduce((sum, entry) => sum + entry.loaded, 0);
      if (!Number.isSafeInteger(total) || total <= 0 || !Number.isSafeInteger(loaded) || loaded < 0 || loaded > total) {
        return { kind: "indeterminate", reason: "required-aggregate-invalid" };
      }
      return { kind: "determinate", scope: "required-session", loaded, total };
    };

    const emit = (
      stage: string,
      activity?: RequiredProgressActivity,
      failedAsset?: string,
      attempt = 1,
      retryCount = 0
    ): void => {
      lastBytes = currentAggregate();
      lastRatio = lastBytes.kind === "determinate" ? lastBytes.loaded / lastBytes.total : undefined;
      if (!onProgress || signal?.aborted) return;
      const progress: LoadingProgress = {
        session: sessionId,
        stage,
        progress: lastRatio,
        bytes: lastBytes,
        requiredLoaded,
        requiredTotal: 3,
        optionalLoaded,
        optionalTotal: 2,
        retryCount,
        maxRetries: 2,
        attempt: Math.min(attempt, 3) as 1 | 2 | 3,
        failedAsset,
        activity,
        bytesLoaded: lastBytes.kind === "determinate" ? lastBytes.loaded : undefined,
        bytesTotal: lastBytes.kind === "determinate" ? lastBytes.total : undefined,
      };
      try { onProgress(progress); } catch (error) { console.error("[AssetLoader] Progress consumer failed", error); }
    };

    const emitBytes = (assetIndex: number, attempt: number, read: ByteRead): void => {
      const entry = attemptProgress[assetIndex]!;
      if (entry.attempt !== attempt) {
        entry.attempt = attempt;
        entry.loaded = 0;
        entry.total = 0;
        entry.trustedLength = false;
      }
      entry.loaded = read.loaded;
      const trustedEof = read.eof && read.trustedLength && read.total > 0 && read.loaded === read.total;
      if (trustedEof) {
        entry.total = read.total;
        entry.trustedLength = true;
      } else {
        entry.total = 0;
        entry.trustedLength = false;
      }
      if (read.isCompressed || (read.eof && read.trustedLength && read.loaded !== read.total)) {
        aggregateInvalid = true;
      }
      emit(
        `Downloading ${REQUIRED_ASSET_IDS[assetIndex]} (${attempt}/${retryLimit + 1})...`,
        read.loaded > 0 ? { kind: "required-bytes", assetId: REQUIRED_ASSET_IDS[assetIndex] as RequiredAssetId, loaded: read.loaded } : undefined,
        undefined,
        attempt,
        attempt - 1
      );
    };

    emit("Initiating asset session...");
    if (signal?.aborted) {
      ledger.disposeSoon();
      signal?.removeEventListener("abort", abortListener);
      throw new DOMException("Asset loading aborted by user", "AbortError");
    }

    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    const waitForRetry = (milliseconds: number): Promise<void> => new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Asset loading aborted by user", "AbortError"));
        return;
      }
      const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, milliseconds);
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(new DOMException("Asset loading aborted by user", "AbortError"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });

    const loadRequiredGltf = async (url: string, name: string, stage: string, index: number): Promise<GLTF> => {
      let attempt = 0;
      while (attempt <= retryLimit) {
        if (signal?.aborted) throw new DOMException("Asset loading aborted by user", "AbortError");
        if (attemptProgress[index]!.attempt !== attempt + 1) {
          attemptProgress[index] = { attempt: attempt + 1, loaded: 0, total: 0, trustedLength: false };
        }
        emit(`Loading ${stage} (${attempt + 1}/${retryLimit + 1})...`, undefined, undefined, attempt + 1, attempt);
        try {
          if (simulateAssetError) throw new Error(`Simulated asset failure for ${name}`);
          let gltf: GLTF;
          if (typeof window !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
            const fetched = await fetchWithAbort(url, signal, (read) => emitBytes(index, attempt + 1, read));
            if (signal?.aborted) throw new DOMException("Asset loading aborted by user", "AbortError");
            gltf = await gltfLoader.parseAsync(fetched.buffer, url);
          } else {
            gltf = await gltfLoader.loadAsync(url);
          }
          ledger.registerGltf(gltf);
          if (signal?.aborted) {
            ledger.disposeSoon();
            throw new DOMException("Asset loading aborted by user", "AbortError");
          }
          requiredLoaded += 1;
          const decodeId = `decode:${REQUIRED_ASSET_IDS[index]}` as Extract<RequiredProgressActivity, { kind: "required-stage" }>['id'];
          emit(`${stage} decoded`, { kind: "required-stage", id: decodeId }, undefined, attempt + 1, attempt);
          return gltf;
        } catch (error) {
          if (signal?.aborted || (error as Error).name === "AbortError") throw new DOMException("Asset loading aborted by user", "AbortError");
          attempt += 1;
          if (attempt > retryLimit) {
            emit(`Failed to load ${name}`, undefined, name, attempt, attempt - 1);
            throw new AssetLoadingError(`Required asset "${name}" failed to load after ${attempt} attempts: ${(error as Error).message}`, name, attempt);
          }
          attemptProgress[index] = { attempt: attempt + 1, loaded: 0, total: 0, trustedLength: false };
          const delay = attempt === 1 ? 500 : 1500;
          emit(`Retrying ${name} (${attempt}/${retryLimit})...`, undefined, name, attempt + 1, attempt);
          await waitForRetry(delay);
        }
      }
      throw new AssetLoadingError(`Required asset "${name}" exceeded the retry ceiling`, name, attempt);
    };

    let w1Gltf: GLTF;
    let avatarGltf: GLTF;
    let fixtureGltf: GLTF;
    try {
      w1Gltf = await loadRequiredGltf("/models/production-room-full.glb", "production-room-full.glb", "production environment", 0);
      emit("Production environment decoded");
      avatarGltf = await loadRequiredGltf("/models/resident-production.glb", "resident-production.glb", "resident avatar", 1);
      emit("Resident avatar decoded");
      fixtureGltf = await loadRequiredGltf("/models/fixture-production.glb", "fixture-production.glb", "chair fixture", 2);
      emit("All required assets decoded");
    } catch (error) {
      ledger.disposeSoon();
      signal?.removeEventListener("abort", abortListener);
      throw error;
    }

    if (signal?.aborted) {
      ledger.disposeSoon();
      signal.removeEventListener("abort", abortListener);
      throw new DOMException("Asset loading aborted by user", "AbortError");
    }
    signal?.removeEventListener("abort", abortListener);

    const loadOptionalTexture = async (id: "deskmat" | "wallpaper", url: string): Promise<void> => {
      try {
        if (optionalSignal?.aborted) return;
        let texture: THREE.Texture;
        if (typeof window !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
          const { buffer } = await fetchWithAbort(url, optionalSignal);
          if (optionalSignal?.aborted) return;
          const objectUrl = URL.createObjectURL(new Blob([buffer]));
          ledger.registerObjectUrl(objectUrl);
          try { texture = await textureLoader.loadAsync(objectUrl); }
          finally { ledger.revokeObjectUrl(objectUrl); }
        } else {
          texture = await textureLoader.loadAsync(url);
        }
        ledger.registerTexture(texture);
        if (optionalSignal?.aborted) {
          ledger.disposeTexture(texture);
          return;
        }

        let adopted = false;
        try {
          const result: OptionalAssetResult = { session: sessionId, id, kind: "texture", resource: texture };
          if (onOptionalConsumer) adopted = onOptionalConsumer(result) === "adopted";
          else if (onOptionalReady) {
            onOptionalReady(id === "deskmat" ? { deskmatTexture: texture } : { wallpaperTexture: texture });
            adopted = true;
          }
        } catch (error) {
          ledger.disposeTexture(texture);
          throw error;
        }
        if (!adopted) {
          ledger.disposeTexture(texture);
          return;
        }
        optionalLoaded += 1;
        emit(`${id === "deskmat" ? "Deskmat" : "Wallpaper"} optional texture adopted`);
      } catch {
        console.warn(`[AssetLoader] Optional asset ${id} failed; retaining the base material.`);
      }
    };

    const optionalWork = (async () => {
      await loadOptionalTexture("deskmat", "/textures/deskmat-topography.png");
      await loadOptionalTexture("wallpaper", "/textures/monitor-wallpaper.png");
    })();
    void optionalWork;

    return {
      w1Gltf,
      avatarGltf,
      fixtureGltf,
      deskmatTexture: null,
      wallpaperTexture: null,
      interactionGltf: null,
      resourceLedger: ledger,
    };
  }
}
