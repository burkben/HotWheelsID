/**
 * Persistence seam for **Settings** — durable app preferences (ADR-0006, Phase 3).
 *
 * Stored as a tiny key/value table: one row per setting, value JSON-encoded. Per-key
 * UPSERTs (rather than a single JSON blob) keep writes independent and make a partial
 * load resilient — an unknown or corrupt row is skipped without losing the rest.
 *
 * As with the other repositories, the contract + a pure {@link InMemorySettingsRepository}
 * live here so the Settings screen and unit tests stay free of native modules. The
 * `expo-sqlite` implementation is in `sqliteSettingsRepository.ts`, imported solely by
 * the app bootstrap.
 */
import type { SettingsState } from "../settingsStore";

export interface SettingsRepository {
  /** Open/create the backing store. Safe to call once at startup. */
  init(): Promise<void>;
  /** Load every persisted setting (known keys only). */
  load(): Promise<Partial<SettingsState>>;
  /** Persist a single setting (insert or replace). */
  save<K extends keyof SettingsState>(key: K, value: SettingsState[K]): Promise<void>;
  /** Forget all persisted settings (revert to defaults on next load). */
  clear(): Promise<void>;
}

/**
 * Zero-dependency repository used by tests/CI and whenever the native SQLite module
 * is unavailable. Holds the settings in a plain object.
 */
export class InMemorySettingsRepository implements SettingsRepository {
  private values: Partial<SettingsState> = {};

  async init(): Promise<void> {}

  async load(): Promise<Partial<SettingsState>> {
    return { ...this.values };
  }

  async save<K extends keyof SettingsState>(key: K, value: SettingsState[K]): Promise<void> {
    this.values[key] = value;
  }

  async clear(): Promise<void> {
    this.values = {};
  }
}
