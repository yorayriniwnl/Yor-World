import { describe, it, expect, vi, afterEach } from "vitest";
import { PreferencesStore, resetDocumentScopedFallback } from "../../src/features/experience/preferences-store";
import { defaultPreferences } from "../../src/contracts/experience";

describe("PreferencesStore Resilience (Task C1)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetDocumentScopedFallback();
  });

  it("handles valid preferences update and persistence cleanly", () => {
    const store = new PreferencesStore();
    const updated = store.update({ clock24h: false, soundEnabled: true });
    expect(updated.clock24h).toBe(false);
    expect(updated.soundEnabled).toBe(true);
    expect(updated.version).toBe(1);
  });

  it("falls back safely to defaultPreferences when stored data is corrupt JSON", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue("{invalid-json-data:::"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 1,
      key: vi.fn(),
    };
    vi.stubGlobal("localStorage", mockStorage);

    const store = new PreferencesStore();
    const prefs = store.load();

    expect(prefs).toEqual(defaultPreferences);
  });

  it("falls back safely to defaultPreferences when stored data violates Zod schema", () => {
    const corruptData = JSON.stringify({
      version: 999, // invalid version
      introCompleted: "not-a-boolean",
      soundEnabled: true,
      quality: "ultra-extreme", // invalid tier
      clock24h: null,
    });

    const mockStorage = {
      getItem: vi.fn().mockReturnValue(corruptData),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 1,
      key: vi.fn(),
    };
    vi.stubGlobal("localStorage", mockStorage);

    const store = new PreferencesStore();
    const prefs = store.load();

    expect(prefs).toEqual(defaultPreferences);
  });

  it("operates gracefully in-memory without crashing when localStorage throws SecurityError", () => {
    const mockStorage = {
      getItem: vi.fn().mockImplementation(() => {
        throw new Error("SecurityError: Storage access is denied");
      }),
      setItem: vi.fn().mockImplementation(() => {
        throw new Error("SecurityError: Storage access is denied");
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    vi.stubGlobal("localStorage", mockStorage);

    const store = new PreferencesStore();
    // Does not throw
    const prefs = store.get();
    expect(prefs).toEqual(defaultPreferences);

    // Update in-memory does not throw
    const updated = store.update({ clock24h: false });
    expect(updated.clock24h).toBe(false);
  });

  it("persists paused preference updates cleanly", () => {
    const store = new PreferencesStore();
    const updated = store.update({ paused: true });
    expect(updated.paused).toBe(true);
    expect(store.getPreferences().paused).toBe(true);
  });

  it("handles storage-denied environment using document-scoped fallback", () => {
    const mockDenial = {
      getItem: vi.fn().mockImplementation(() => { throw new Error("SecurityError: localStorage denied"); }),
      setItem: vi.fn().mockImplementation(() => { throw new Error("SecurityError: localStorage denied"); }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    vi.stubGlobal("localStorage", mockDenial);

    const store1 = new PreferencesStore();
    expect(store1.load().paused).toBe(false);
    store1.setPaused(true);
    expect(store1.getPreferences().paused).toBe(true);

    const store2 = new PreferencesStore();
    expect(store2.load().paused).toBe(true);
  });

  it("keeps pause in document memory when the localStorage property getter itself throws", () => {
    vi.stubGlobal("localStorage", undefined);
    const blockedWindow = {};
    Object.defineProperty(blockedWindow, "localStorage", {
      configurable: true,
      get() { throw new DOMException("denied", "SecurityError"); },
    });
    vi.stubGlobal("window", blockedWindow);

    const first = new PreferencesStore();
    first.setPaused(true);
    const nextRuntimeStore = new PreferencesStore();
    expect(nextRuntimeStore.get().paused).toBe(true);
  });

  it("reads an older version-1 localStorage record without inventing non-default values", () => {
    const legacy = {
      version: 1,
      introCompleted: true,
      soundEnabled: false,
      quality: "low",
      clock24h: false,
    };
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(JSON.stringify(legacy)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 1,
      key: vi.fn(),
    });
    expect(new PreferencesStore().get()).toEqual({ ...legacy, paused: false });
  });

});
