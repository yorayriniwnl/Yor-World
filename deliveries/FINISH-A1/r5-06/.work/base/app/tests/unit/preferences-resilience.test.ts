import { describe, it, expect, vi, afterEach } from "vitest";
import { PreferencesStore } from "../../src/features/experience/preferences-store";
import { defaultPreferences } from "../../src/contracts/experience";

describe("PreferencesStore Resilience (Task C1)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});
