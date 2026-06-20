/**
 * Speed display: units + calibration (Phase 5 — "calibrate speed to real-world units").
 *
 * The portal's decoded speed is "scale mph" (raw × 64) and is *relative until
 * calibrated against a known speed* (see `@redlineid/protocol` decode.ts and the
 * empirical `GATE_SPEED_CONSTANT`). These pure helpers turn a canonical scale-mph
 * value into what the UI shows, given the user's chosen unit and a calibration trim.
 *
 * Presentation only: everything stored on disk (passes, bests, race results) and
 * every threshold (gauge zones, achievements) stays in canonical scale mph. So the
 * default (mph, ×1.00) renders byte-identical to before, and changing unit or trim
 * never rewrites stored data or moves an achievement goalpost.
 */

export type SpeedUnit = "mph" | "kmh";

export interface SpeedDisplay {
  readonly unit: SpeedUnit;
  /** Multiplier applied to the canonical scale-mph value before unit conversion. */
  readonly calibration: number;
}

/** Identity display — mph at trim ×1.00 (what the app shipped with). */
export const DEFAULT_SPEED_DISPLAY: SpeedDisplay = { unit: "mph", calibration: 1 };

/** Exact international mile → kilometre factor. */
export const KMH_PER_MPH = 1.609344;

export const MIN_CALIBRATION = 0.5;
export const MAX_CALIBRATION = 2;
export const CALIBRATION_STEP = 0.05;

/** Clamp/repair a calibration trim to the supported range (NaN/∞ → 1). */
export function clampCalibration(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_CALIBRATION, Math.max(MIN_CALIBRATION, value));
}

/** Short unit caption for the current unit, e.g. under a readout. */
export function speedUnitLabel(unit: SpeedUnit): string {
  return unit === "kmh" ? "km/h" : "mph";
}

/** Convert a canonical scale-mph value to the chosen unit and calibration. */
export function convertSpeed(
  scaleMph: number,
  display: SpeedDisplay = DEFAULT_SPEED_DISPLAY,
): number {
  const calibrated = scaleMph * clampCalibration(display.calibration);
  return display.unit === "kmh" ? calibrated * KMH_PER_MPH : calibrated;
}

/** Whole-number speed in the chosen unit (a live readout or pass row). */
export function formatSpeedValue(
  scaleMph: number,
  display: SpeedDisplay = DEFAULT_SPEED_DISPLAY,
): string {
  return Math.round(convertSpeed(scaleMph, display)).toString();
}

/**
 * Whole-number speed for a "best" stat, or an em dash when nothing's recorded
 * (canonical value ≤ 0) — mirrors the prior garage/history behaviour.
 */
export function formatBestSpeed(
  scaleMph: number,
  display: SpeedDisplay = DEFAULT_SPEED_DISPLAY,
): string {
  return scaleMph > 0 ? formatSpeedValue(scaleMph, display) : "—";
}

/** A trim label like `×1.00` for the Settings control. */
export function formatCalibration(value: number): string {
  return `\u00d7${clampCalibration(value).toFixed(2)}`;
}
