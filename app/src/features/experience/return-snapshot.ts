import { z } from "zod";
import { CameraIdSchema, PreferencesSchema, WorldSnapshotSchema, defaultPreferences, defaultWorldSnapshot, type CameraId } from "@/contracts/experience";
import { ProjectIdSchema } from "@/contracts/content";

export const ReturnSnapshotSchema = z.strictObject({
  returnToStudio: z.literal(true),
  preferences: PreferencesSchema,
  world: WorldSnapshotSchema,
  lastProjectId: ProjectIdSchema.nullable(),
  previousCamera: CameraIdSchema,
  timestamp: z.number().finite().nonnegative(),
});
export type ReturnSnapshot = z.infer<typeof ReturnSnapshotSchema>;
export const RETURN_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const RETURN_SNAPSHOT_STORAGE_KEY = "yor_world_return_snapshot_v1";
let memoryFallback: ReturnSnapshot | null = null;

export function validateReturnSnapshot(value: unknown, now = Date.now()): ReturnSnapshot | null {
  const parsed = ReturnSnapshotSchema.safeParse(value);
  if (!parsed.success || parsed.data.timestamp > now + 60_000 || now - parsed.data.timestamp > RETURN_SNAPSHOT_MAX_AGE_MS) return null;
  return parsed.data;
}

export function getRestorableCamera(snapshot: ReturnSnapshot): CameraId {
  return ["hallway", "entry", "reveal", "greeting"].includes(snapshot.previousCamera) ? "home-desktop" : snapshot.previousCamera;
}

export function saveReturnSnapshot(data: Partial<ReturnSnapshot>): void {
  const current = getReturnSnapshot();
  const snapshot = validateReturnSnapshot({
    returnToStudio: true,
    preferences: data.preferences ?? current?.preferences ?? { ...defaultPreferences, introCompleted: true },
    world: data.world ?? current?.world ?? defaultWorldSnapshot,
    lastProjectId: data.lastProjectId ?? current?.lastProjectId ?? null,
    previousCamera: data.previousCamera ?? current?.previousCamera ?? "home-desktop",
    timestamp: Date.now(),
  });
  if (!snapshot) return;
  memoryFallback = snapshot;
  try { window.sessionStorage.setItem(RETURN_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* blocked storage retains this tab's memory snapshot */ }
}

export function getReturnSnapshot(): ReturnSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(RETURN_SNAPSHOT_STORAGE_KEY);
    if (raw === null) return validateReturnSnapshot(memoryFallback);
    const snapshot = validateReturnSnapshot(JSON.parse(raw));
    // Corrupt/stale stored data cannot resurrect an older memory snapshot.
    if (!snapshot) memoryFallback = null;
    return snapshot;
  } catch (error) {
    if (error instanceof SyntaxError) { memoryFallback = null; return null; }
    return validateReturnSnapshot(memoryFallback);
  }
}

export function hasReturnSnapshot(): boolean { return getReturnSnapshot() !== null; }

// Retain the existing consuming API. History restoration uses the validated reader.
export function restoreReturnSnapshot(): ReturnSnapshot | null {
  const snapshot = getReturnSnapshot();
  if (snapshot) clearReturnSnapshot();
  return snapshot;
}

export function clearReturnSnapshot(): void {
  memoryFallback = null;
  try { window.sessionStorage.removeItem(RETURN_SNAPSHOT_STORAGE_KEY); } catch { /* storage may be blocked */ }
}
