import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_SETTINGS,
  setSettingsPersistence,
  useSettingsStore,
} from "./settingsStore";

beforeEach(() => {
  setSettingsPersistence(null);
  useSettingsStore.setState({ ...DEFAULT_SETTINGS, hydrated: false });
});

describe("settingsStore", () => {
  it("starts at defaults and unhydrated", () => {
    const s = useSettingsStore.getState();
    expect(s).toMatchObject(DEFAULT_SETTINGS);
    expect(s.hydrated).toBe(false);
  });

  it("hydrate merges persisted values over defaults and flips hydrated", () => {
    useSettingsStore.getState().hydrate({ playerName: "Ace", defaultLaps: 20 });

    const s = useSettingsStore.getState();
    expect(s.playerName).toBe("Ace");
    expect(s.defaultLaps).toBe(20);
    expect(s.haptics).toBe(DEFAULT_SETTINGS.haptics); // untouched key keeps default
    expect(s.hydrated).toBe(true);
  });

  it("hydrate ignores unknown / undefined keys", () => {
    useSettingsStore.getState().hydrate({
      playerName: "Zed",
      bogus: "nope",
      defaultLaps: undefined,
    } as never);

    const s = useSettingsStore.getState();
    expect(s.playerName).toBe("Zed");
    expect(s.defaultLaps).toBe(DEFAULT_SETTINGS.defaultLaps);
    expect((s as unknown as Record<string, unknown>).bogus).toBeUndefined();
  });

  it("hydrate drops wrong-typed values, falling back to defaults", () => {
    useSettingsStore.getState().hydrate({
      playerName: 5,
      defaultLaps: 999, // not a LAP_OPTION
      haptics: "false",
      mockModeDefault: true,
    } as never);

    const s = useSettingsStore.getState();
    expect(s.playerName).toBe(DEFAULT_SETTINGS.playerName);
    expect(s.defaultLaps).toBe(DEFAULT_SETTINGS.defaultLaps);
    expect(s.haptics).toBe(DEFAULT_SETTINGS.haptics);
    expect(s.mockModeDefault).toBe(true); // the one valid value still applies
  });

  it("hydrate reverts a pre-hydration mutation when the key is absent", () => {
    // A value set before load() must not survive a hydrate that omits that key.
    useSettingsStore.setState({ defaultLaps: 20 });

    useSettingsStore.getState().hydrate({ playerName: "Ace" });

    expect(useSettingsStore.getState().defaultLaps).toBe(DEFAULT_SETTINGS.defaultLaps);
  });

  it("hydrate does not write back through the sink", () => {
    const onSave = vi.fn();
    setSettingsPersistence({ onSave, onClear: vi.fn() });

    useSettingsStore.getState().hydrate({ playerName: "Loaded" });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("each setter updates state and fires onSave with the key/value", () => {
    const onSave = vi.fn();
    setSettingsPersistence({ onSave, onClear: vi.fn() });

    const s = useSettingsStore.getState();
    s.setPlayerName("Ben");
    s.setDefaultLaps(10);
    s.setHaptics(false);
    s.setSound(false);
    s.setReduceMotion(true);
    s.setMockModeDefault(true);

    expect(useSettingsStore.getState()).toMatchObject({
      playerName: "Ben",
      defaultLaps: 10,
      haptics: false,
      sound: false,
      reduceMotion: true,
      mockModeDefault: true,
    });
    expect(onSave.mock.calls).toEqual([
      ["playerName", "Ben"],
      ["defaultLaps", 10],
      ["haptics", false],
      ["sound", false],
      ["reduceMotion", true],
      ["mockModeDefault", true],
    ]);
  });

  it("sets speed unit and calibration through their setters", () => {
    const onSave = vi.fn();
    setSettingsPersistence({ onSave, onClear: vi.fn() });

    const s = useSettingsStore.getState();
    s.setSpeedUnit("kmh");
    s.setSpeedCalibration(1.2);

    expect(useSettingsStore.getState()).toMatchObject({
      speedUnit: "kmh",
      speedCalibration: 1.2,
    });
    expect(onSave.mock.calls).toEqual([
      ["speedUnit", "kmh"],
      ["speedCalibration", 1.2],
    ]);
  });

  it("clamps an out-of-range calibration on set", () => {
    useSettingsStore.getState().setSpeedCalibration(99);
    expect(useSettingsStore.getState().speedCalibration).toBe(2);
  });

  it("hydrate validates speed keys (bad unit dropped, calibration clamped)", () => {
    useSettingsStore.getState().hydrate({
      speedUnit: "lightyears",
      speedCalibration: 99,
    } as never);

    const s = useSettingsStore.getState();
    expect(s.speedUnit).toBe(DEFAULT_SETTINGS.speedUnit);
    expect(s.speedCalibration).toBe(2);
  });

  it("reset restores defaults and fires onClear", () => {
    const onClear = vi.fn();
    setSettingsPersistence({ onSave: vi.fn(), onClear });
    useSettingsStore.getState().setPlayerName("Temp");

    useSettingsStore.getState().reset();

    expect(useSettingsStore.getState()).toMatchObject(DEFAULT_SETTINGS);
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("never throws when the sink is unset (CI path)", () => {
    expect(() => {
      const s = useSettingsStore.getState();
      s.setPlayerName("X");
      s.setHaptics(false);
      s.reset();
    }).not.toThrow();
  });
});
