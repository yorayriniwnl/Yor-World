import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioController } from "../../src/features/experience/audio";
import { PreferencesStore } from "../../src/features/experience/preferences-store";
import { ExperienceController } from "../../src/features/experience/controller";
import { defaultPreferences, defaultWorldSnapshot } from "../../src/contracts/experience";
import { clearReturnSnapshot, clearReturnSnapshotIfMatches, getReturnSnapshot, saveReturnSnapshot, validateReturnSnapshot, RETURN_SNAPSHOT_MAX_AGE_MS, RETURN_SNAPSHOT_STORAGE_KEY } from "../../src/features/experience/return-snapshot";
import { hasPotentialReturnSnapshot } from "../../src/features/experience/return-snapshot-presence";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
function deferred() { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done; }); return { promise, resolve }; }
afterEach(() => { clearReturnSnapshot(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("validated return restoration and denied storage", () => {
  it("rejects corrupt, stale, future and half-validated payloads", () => {
    const now = Date.now();
    const valid = { returnToStudio: true, preferences: defaultPreferences, world: defaultWorldSnapshot, lastProjectId: "helios", previousCamera: "monitor", timestamp: now };
    expect(validateReturnSnapshot(valid, now)).not.toBeNull();
    for (const patch of [{ timestamp: now - RETURN_SNAPSHOT_MAX_AGE_MS - 1 }, { timestamp: now + 60_001 }, { previousCamera: "unknown" }, { preferences: { ...defaultPreferences, soundEnabled: "yes" } }, { world: { ...defaultWorldSnapshot, lampOn: null } }, { returnToStudio: false }, { timestamp: NaN }]) expect(validateReturnSnapshot({ ...valid, ...patch }, now)).toBeNull();
  });
  it("restores safe room/preferences, preserves sound desire and discards transient panels/animations", async () => {
    const controller = new ExperienceController();
    await controller.send({ type: "OPEN_PANEL", panel: "launcher" });
    expect(controller.restoreSnapshot({ returnToStudio: true, preferences: { ...defaultPreferences, soundEnabled: true, quality: "low", introCompleted: true }, world: { ...defaultWorldSnapshot, lampOn: false, blindsOpen: false, detailFound: true }, lastProjectId: "helios", previousCamera: "greeting", timestamp: Date.now() })).toBe(true);
    const state = controller.getSnapshot();
    expect(state.phase).toBe("explore"); expect(state.activePanel).toBeNull(); expect(state.activeProject).toBeNull(); expect(state.currentIntent).toBeNull(); expect(state.characterAction).toBe("coding_idle"); expect(state.activeCamera).toBe("home-desktop");
    expect(state.preferences.soundEnabled).toBe(true); expect(state.preferences.quality).toBe("low"); expect(state.world).toEqual({ version: 1, lampOn: false, blindsOpen: false, detailFound: true });
  });
  it("blocked local/session storage retains same-tab preferences and return data", () => {
    const blocked = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("SecurityError"); }, removeItem() { throw new Error("SecurityError"); } };
    vi.stubGlobal("window", { localStorage: blocked, sessionStorage: blocked });
    new PreferencesStore().update({ quality: "medium", introCompleted: true });
    expect(new PreferencesStore().get()).toMatchObject({ quality: "medium", introCompleted: true });
    expect(hasPotentialReturnSnapshot()).toBe(false);
    saveReturnSnapshot({ world: { ...defaultWorldSnapshot, lampOn: false }, lastProjectId: "helios" });
    expect(hasPotentialReturnSnapshot()).toBe(true);
    expect(getReturnSnapshot()?.world.lampOn).toBe(false);
    clearReturnSnapshot();
    expect(hasPotentialReturnSnapshot()).toBe(false);
  });
  it("detects a stored snapshot without loading its validator", () => {
    const sessionStorage = storage(); vi.stubGlobal("window", { sessionStorage });
    expect(hasPotentialReturnSnapshot()).toBe(false);
    sessionStorage.setItem(RETURN_SNAPSHOT_STORAGE_KEY, "pending validation");
    expect(hasPotentialReturnSnapshot()).toBe(true);
  });
  it("corrupt session data cannot resurrect a prior valid memory snapshot", () => {
    const sessionStorage = storage(); vi.stubGlobal("window", { sessionStorage });
    saveReturnSnapshot({ lastProjectId: "helios" });
    sessionStorage.setItem(RETURN_SNAPSHOT_STORAGE_KEY, "broken JSON");
    expect(getReturnSnapshot()).toBeNull();
  });
  it("keeps a validated snapshot readable until the matching snapshot is successfully consumed", () => {
    const sessionStorage = storage(); vi.stubGlobal("window", { sessionStorage });
    saveReturnSnapshot({ lastProjectId: "helios" });
    const pendingRestore = getReturnSnapshot();
    expect(pendingRestore?.lastProjectId).toBe("helios");
    expect(getReturnSnapshot()?.lastProjectId).toBe("helios");

    saveReturnSnapshot({ lastProjectId: "zenith" });
    expect(clearReturnSnapshotIfMatches(pendingRestore!)).toBe(false);
    expect(getReturnSnapshot()?.lastProjectId).toBe("zenith");
    const current = getReturnSnapshot()!;
    expect(clearReturnSnapshotIfMatches(current)).toBe(true);
    expect(getReturnSnapshot()).toBeNull();
  });
  it.each(["blindsOpen", "detailFound"] as const)("does not clear a newer same-timestamp snapshot that differs only in world.%s", (field) => {
    const sessionStorage = storage(); vi.stubGlobal("window", { sessionStorage });
    vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    saveReturnSnapshot({ lastProjectId: "helios" });
    const pendingRestore = getReturnSnapshot()!;
    const newerWorld = { ...pendingRestore.world, [field]: !pendingRestore.world[field] };

    saveReturnSnapshot({ world: newerWorld, lastProjectId: "helios" });
    const newerSnapshot = getReturnSnapshot()!;

    expect(newerSnapshot.timestamp).toBe(pendingRestore.timestamp);
    expect(newerSnapshot.world).not.toEqual(pendingRestore.world);
    expect(clearReturnSnapshotIfMatches(pendingRestore)).toBe(false);
    expect(getReturnSnapshot()).toEqual(newerSnapshot);
  });
});

describe("actual audio request cancellation", () => {
  it("a pending resume followed by mute never publishes sound on", async () => {
    const pending = deferred();
    class Context { state = "suspended"; resume = vi.fn(async () => { await pending.promise; this.state = "running"; }); suspend = vi.fn(async () => { this.state = "suspended"; }); close = vi.fn(async () => { this.state = "closed"; }); }
    const context = new Context(); vi.stubGlobal("AudioContext", function () { return context; });
    const audio = new AudioController(); const changes: boolean[] = []; audio.subscribe((value) => changes.push(value));
    const activation = audio.setEnabled(true); await audio.setEnabled(false); pending.resolve(); await activation;
    expect(audio.isEnabled()).toBe(false); expect(context.state).toBe("suspended"); expect(changes).not.toContain(true);
  });
  it("dispose during activation closes exactly once and suppresses late publication", async () => {
    const pending = deferred();
    class Context { state = "suspended"; resume = vi.fn(async () => { await pending.promise; }); close = vi.fn(async () => { this.state = "closed"; }); }
    const context = new Context(); vi.stubGlobal("AudioContext", function () { return context; });
    const audio = new AudioController(); const activation = audio.setEnabled(true); audio.dispose(); audio.dispose(); pending.resolve();
    expect(await activation).toBe(false); expect(audio.isEnabled()).toBe(false); expect(context.close).toHaveBeenCalledTimes(1);
  });
  it("denied resume remains muted", async () => {
    class Context { state = "suspended"; resume = vi.fn(async () => { throw new Error("Denied"); }); close = vi.fn(async () => {}); }
    vi.stubGlobal("AudioContext", Context); const audio = new AudioController(); expect(await audio.setEnabled(true)).toBe(false); expect(audio.isEnabled()).toBe(false);
  });
  it("keeps the explicit sound preference enabled when playback activation is denied", async () => {
    class Context { state = "suspended"; resume = vi.fn(async () => { throw new Error("Denied"); }); close = vi.fn(async () => {}); }
    vi.stubGlobal("AudioContext", Context);
    const audio = new AudioController();
    const experience = new ExperienceController();
    expect(await audio.setEnabled(true)).toBe(false);
    await experience.send({ type: "SET_SOUND", enabled: true });
    expect(audio.isEnabled()).toBe(false);
    expect(experience.getSnapshot().preferences.soundEnabled).toBe(true);
  });
});
