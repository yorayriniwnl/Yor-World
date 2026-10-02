import { Preferences, PreferencesSchema, defaultPreferences } from "../../contracts/experience";

export class PreferencesStore {
  private static readonly STORAGE_KEY = "yor_world_preferences_v1";
  private inMemoryPreferences: Preferences;

  constructor(initial?: Partial<Preferences>) {
    this.inMemoryPreferences = {
      ...defaultPreferences,
      ...(initial || {}),
    };
    this.inMemoryPreferences = this.load();
  }

  /**
   * Safely loads preferences from local storage.
   * Handles storage-denied (SecurityError / private mode) and corrupt data by
   * falling back to defaultPreferences.
   */
  public load(): Preferences {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return this.inMemoryPreferences;
      }

      const raw = window.localStorage.getItem(PreferencesStore.STORAGE_KEY);
      if (!raw) {
        return this.inMemoryPreferences;
      }

      const parsed = JSON.parse(raw);
      const validated = PreferencesSchema.safeParse(parsed);
      if (validated.success) {
        this.inMemoryPreferences = validated.data;
        return validated.data;
      } else {
        console.warn("[PreferencesStore] Corrupt preferences data detected, resetting to default:", validated.error);
        this.save(defaultPreferences);
        return defaultPreferences;
      }
    } catch (err) {
      console.warn("[PreferencesStore] Storage access denied or unavailable, using in-memory:", err);
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

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(PreferencesStore.STORAGE_KEY, JSON.stringify(toSave));
        return true;
      }
    } catch (err) {
      console.warn("[PreferencesStore] Storage save failed (access denied or quota exceeded):", err);
    }
    return false;
  }

  public get(): Preferences {
    return { ...this.inMemoryPreferences };
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
    this.save(defaultPreferences);
    return this.get();
  }
}
