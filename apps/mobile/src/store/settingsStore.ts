/**
 * Durable app preferences (ADR-0006, Phase 3 Settings).
 *
 * A small render store mirrored to disk through a {@link SettingsPersistence} sink,
 * exactly like the Race/Garage stores: the reducer stays pure (no-op sink in CI),
 * the bootstrap hydrates it from a {@link SettingsRepository} and registers the sink.
 *
 * Backend choice: persisted as a tiny `settings` KV table on the shared
 * `redlineid.db` (migration v4) rather than react-native-mmkv. That keeps Settings
 * on the same already-in-the-binary, no-native-rebuild seam as everything else
 * (activates on a JS reload) and fully Node-testable. MMKV remains a drop-in swap
 * later if a *synchronous* pre-first-paint read is ever needed.
 */
import { create } from "zustand";

import { LAP_OPTIONS } from "../race/raceEngine";
import { clampCalibration, type SpeedUnit } from "../speed/format";

export interface SettingsState {
  /** Default racer name pre-filled on the Race setup screen. */
  playerName: string;
  /** Default lap target (one of the race engine's LAP_OPTIONS). */
  defaultLaps: number;
  /** Master switch for tactile feedback (countdown, laps, passes). */
  haptics: boolean;
  /** Master switch for race sound cues (countdown, laps, finish). */
  sound: boolean;
  /** Force-reduce animations even when the OS setting is off. */
  reduceMotion: boolean;
  /** Open the app in demo (mock portal) mode instead of live BLE. */
  mockModeDefault: boolean;
  /** Unit every speed readout is shown in ("scale" mph or km/h). */
  speedUnit: SpeedUnit;
  /** Calibration trim applied to displayed speeds (display-only; 0.5–2.0). */
  speedCalibration: number;
}

export const DEFAULT_SETTINGS: SettingsState = {
  playerName: "Player 1",
  defaultLaps: 5,
  haptics: true,
  sound: true,
  reduceMotion: false,
  mockModeDefault: false,
  speedUnit: "mph",
  speedCalibration: 1,
};

export const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SettingsState)[];

export function isSettingKey(key: string): key is keyof SettingsState {
  return (SETTINGS_KEYS as string[]).includes(key);
}

/**
 * Validate/coerce one persisted value to its setting's type. Durable rows survive
 * app upgrades and could (in theory) hold a stale or wrong-typed value; anything
 * that doesn't match returns `undefined` so the default stands in for it. This is
 * the single choke point every hydration path (in-memory + SQLite) flows through.
 */
function coerceSetting<K extends keyof SettingsState>(
  key: K,
  value: unknown,
): SettingsState[K] | undefined {
  switch (key) {
    case "playerName":
      return (typeof value === "string" ? value : undefined) as SettingsState[K] | undefined;
    case "defaultLaps":
      return (typeof value === "number" && (LAP_OPTIONS as readonly number[]).includes(value)
        ? value
        : undefined) as SettingsState[K] | undefined;
    case "haptics":
    case "sound":
    case "reduceMotion":
    case "mockModeDefault":
      return (typeof value === "boolean" ? value : undefined) as SettingsState[K] | undefined;
    case "speedUnit":
      return (value === "mph" || value === "kmh" ? value : undefined) as
        | SettingsState[K]
        | undefined;
    case "speedCalibration":
      return (typeof value === "number" && Number.isFinite(value)
        ? clampCalibration(value)
        : undefined) as SettingsState[K] | undefined;
    default:
      return undefined;
  }
}

/** Keep only known keys whose value passes type validation (drops corrupt/legacy). */
function pickKnown(partial: Partial<SettingsState>): Partial<SettingsState> {
  const out: Partial<SettingsState> = {};
  for (const key of SETTINGS_KEYS) {
    const coerced = coerceSetting(key, partial[key]);
    if (coerced !== undefined) (out[key] as SettingsState[typeof key]) = coerced;
  }
  return out;
}

/** Write-through sink registered by the persistence bootstrap. */
export interface SettingsPersistence {
  onSave: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onClear: () => void;
}

let persistence: SettingsPersistence | null = null;

export function setSettingsPersistence(sink: SettingsPersistence | null): void {
  persistence = sink;
}

interface SettingsStore extends SettingsState {
  /** True once the bootstrap has loaded persisted values (defaults until then). */
  hydrated: boolean;
  /** Merge persisted values over defaults; does not write back. */
  hydrate: (partial: Partial<SettingsState>) => void;
  setPlayerName: (value: string) => void;
  setDefaultLaps: (value: number) => void;
  setHaptics: (value: boolean) => void;
  setSound: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  setMockModeDefault: (value: boolean) => void;
  setSpeedUnit: (value: SpeedUnit) => void;
  setSpeedCalibration: (value: number) => void;
  /** Restore defaults and clear durable storage. */
  reset: () => void;
}

function persist<K extends keyof SettingsState>(key: K, value: SettingsState[K]): void {
  persistence?.onSave(key, value);
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  // Reset to defaults first so a key missing from `partial` (unset or dropped by
  // validation) reverts to its default rather than keeping a pre-hydration value.
  hydrate: (partial) => set({ ...DEFAULT_SETTINGS, ...pickKnown(partial), hydrated: true }),

  setPlayerName: (value) => {
    set({ playerName: value });
    persist("playerName", value);
  },
  setDefaultLaps: (value) => {
    set({ defaultLaps: value });
    persist("defaultLaps", value);
  },
  setHaptics: (value) => {
    set({ haptics: value });
    persist("haptics", value);
  },
  setSound: (value) => {
    set({ sound: value });
    persist("sound", value);
  },
  setReduceMotion: (value) => {
    set({ reduceMotion: value });
    persist("reduceMotion", value);
  },
  setMockModeDefault: (value) => {
    set({ mockModeDefault: value });
    persist("mockModeDefault", value);
  },
  setSpeedUnit: (value) => {
    set({ speedUnit: value });
    persist("speedUnit", value);
  },
  setSpeedCalibration: (value) => {
    const next = clampCalibration(value);
    set({ speedCalibration: next });
    persist("speedCalibration", next);
  },

  reset: () => {
    set({ ...DEFAULT_SETTINGS });
    persistence?.onClear();
  },
}));
