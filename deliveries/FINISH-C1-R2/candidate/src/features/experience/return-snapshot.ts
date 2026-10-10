import type { CameraId, Preferences, WorldSnapshot } from "@/contracts/experience";
import type { ProjectId } from "@/contracts/content";

export interface ReturnSnapshot {
  returnToStudio: boolean;
  preferences: Preferences;
  world: WorldSnapshot;
  lastProjectId: ProjectId | null;
  previousCamera: CameraId;
  timestamp: number;
}

const STORAGE_KEY = "yor_world_return_snapshot_v1";

// In-memory fallback for environments with blocked/disabled sessionStorage or SSR
let memoryFallback: ReturnSnapshot | null = null;

function isStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return false;
    const testKey = "__yor_storage_test__";
    window.sessionStorage.setItem(testKey, "1");
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function saveReturnSnapshot(data: Partial<Omit<ReturnSnapshot, "preferences">> & { preferences?: Partial<Preferences> | undefined }): void {
  const current = getReturnSnapshot();
  const snapshot: ReturnSnapshot = {
    returnToStudio: true,
    preferences: data.preferences ? {
      version: 1 as const,
      introCompleted: true,
      soundEnabled: false,
      quality: "auto" as const,
      clock24h: true,
      paused: false,
      ...current?.preferences,
      ...data.preferences,
    } : (current?.preferences ?? {
      version: 1,
      introCompleted: true,
      soundEnabled: false,
      quality: "auto",
      clock24h: true,
      paused: false,
    }),
    world: data.world ?? current?.world ?? {
      version: 1,
      lampOn: true,
      blindsOpen: true,
      detailFound: false,
    },
    lastProjectId: data.lastProjectId ?? current?.lastProjectId ?? null,
    previousCamera: data.previousCamera ?? current?.previousCamera ?? "monitor",
    timestamp: Date.now(),
  };

  memoryFallback = snapshot;

  if (isStorageAvailable()) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, jsonStringify(snapshot));
    } catch {
      // Storage quota or restriction; fallback retained
    }
  }
}

export function getReturnSnapshot(): ReturnSnapshot | null {
  if (isStorageAvailable()) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ReturnSnapshot;
        if (parsed && typeof parsed.timestamp === "number") {
          if (parsed.preferences && typeof parsed.preferences.paused === "undefined") {
            parsed.preferences.paused = false;
          }
          return parsed;
        }
      }
    } catch {
      // JSON parse error or access denied
    }
  }
  return memoryFallback;
}

export function hasReturnSnapshot(): boolean {
  return getReturnSnapshot() !== null;
}

export function restoreReturnSnapshot(): ReturnSnapshot | null {
  const snapshot = getReturnSnapshot();
  if (snapshot) {
    clearReturnSnapshot();
  }
  return snapshot;
}

export function clearReturnSnapshot(): void {
  memoryFallback = null;
  if (isStorageAvailable()) {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

function jsonStringify(obj: unknown): string {
  return JSON.stringify(obj);
}
