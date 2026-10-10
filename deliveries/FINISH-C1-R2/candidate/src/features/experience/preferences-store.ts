import { Preferences, PreferencesSchema, defaultPreferences } from "../../contracts/experience";

let storageDenied = false;
let documentScopedFallback: Preferences = { ...defaultPreferences };

export function resetDocumentScopedFallback(): void {
  storageDenied = false;
  documentScopedFallback = { ...defaultPreferences };
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export class PreferencesStore {
  private static readonly STORAGE_KEY = "yor_world_preferences_v1";
  private inMemoryPreferences: Preferences;
  private readonly listeners = new Set<(prefs: Preferences) => void>();

  constructor(initial?: Partial<Preferences>) {
    this.inMemoryPreferences = {
      ...defaultPreferences,
      ...(storageDenied ? documentScopedFallback : {}),
      ...(initial || {}),
    };
    this.inMemoryPreferences = this.load();
  }

  public subscribe(listener: (prefs: Preferences) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const prefs = this.get();
    for (const listener of this.listeners) {
      try {
        listener(prefs);
      } catch (err) {
        console.error("[PreferencesStore] Listener error:", err);
      }
    }
  }

  /**
   * Safely loads preferences from local storage.
   * Handles storage-denied (SecurityError / private mode) and corrupt data by
   * falling back to defaultPreferences or documentScopedFallback when storage is denied.
   */
  public load(): Preferences {
    try {
      const storage = getStorage();
      if (!storage) {
        return { ...this.inMemoryPreferences };
      }

      const raw = storage.getItem(PreferencesStore.STORAGE_KEY);
      if (!raw) {
        return { ...this.inMemoryPreferences };
      }

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !("paused" in parsed)) {
        parsed.paused = false;
      }
      const validated = PreferencesSchema.safeParse(parsed);
      if (validated.success) {
        storageDenied = false;
        this.inMemoryPreferences = validated.data;
        documentScopedFallback = validated.data;
        return validated.data;
      } else {
        console.warn("[PreferencesStore] Corrupt preferences data detected, resetting to default:", validated.error);
        storageDenied = false;
        documentScopedFallback = { ...defaultPreferences };
        this.save(defaultPreferences);
        return defaultPreferences;
      }
    } catch (err) {
      console.warn("[PreferencesStore] Storage access denied or unavailable, using in-memory:", err);
      storageDenied = true;
      this.inMemoryPreferences = { ...documentScopedFallback };
      return this.inMemoryPreferences;
    }
  }

  /**
   * Safely saves preferences. Catches QuotaExceededError or SecurityError.
   */
  public save(prefs: Preferences): boolean {
    const validated = PreferencesSchema.safeParse(prefs);
    const toSave = validated.success ? validated.data : defaultPreferences;
    this.inMemoryPreferences = toSave;
    documentScopedFallback = toSave;

    let saved = false;
    try {
      const storage = getStorage();
      if (storage) {
        storage.setItem(PreferencesStore.STORAGE_KEY, JSON.stringify(toSave));
        saved = true;
        storageDenied = false;
      }
    } catch (err) {
      console.warn("[PreferencesStore] Storage save failed (access denied or quota exceeded):", err);
      storageDenied = true;
    }
    this.notify();
    return saved;
  }

  public get(): Preferences {
    return { ...this.inMemoryPreferences };
  }

  public getPreferences(): Preferences {
    return this.get();
  }

  public setPaused(paused: boolean): Preferences {
    return this.update({ paused });
  }

  public update(patch: Partial<Preferences>): Preferences {
    const updated: Preferences = {
      ...this.inMemoryPreferences,
      ...patch,
      version: 1,
    };
    this.save(updated);
    return this.get();
  }

  public reset(): Preferences {
    storageDenied = false;
    documentScopedFallback = { ...defaultPreferences };
    this.save(defaultPreferences);
    return this.get();
  }
}

export const preferencesStore = new PreferencesStore();
