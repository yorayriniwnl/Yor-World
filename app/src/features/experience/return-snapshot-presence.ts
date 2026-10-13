export const RETURN_SNAPSHOT_STORAGE_KEY = "yor_world_return_snapshot_v1";

let memorySnapshotAvailable = false;

export function markReturnSnapshotAvailable(): void {
  memorySnapshotAvailable = true;
}

export function markReturnSnapshotUnavailable(): void {
  memorySnapshotAvailable = false;
}

/**
 * Cheap, schema-free probe for deciding whether the validated snapshot module
 * needs to be loaded. The in-memory marker preserves same-tab recovery when
 * sessionStorage is blocked.
 */
export function hasPotentialReturnSnapshot(): boolean {
  if (memorySnapshotAvailable) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(RETURN_SNAPSHOT_STORAGE_KEY) !== null;
  } catch {
    return memorySnapshotAvailable;
  }
}
