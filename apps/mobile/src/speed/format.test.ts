import { describe, expect, it } from "vitest";

import {
  CALIBRATION_STEP,
  DEFAULT_SPEED_DISPLAY,
  KMH_PER_MPH,
  MAX_CALIBRATION,
  MIN_CALIBRATION,
  clampCalibration,
  convertSpeed,
  formatBestSpeed,
  formatCalibration,
  formatSpeedValue,
  speedUnitLabel,
  type SpeedDisplay,
} from "./format";

describe("clampCalibration", () => {
  it("passes values inside the range through", () => {
    expect(clampCalibration(1)).toBe(1);
    expect(clampCalibration(1.25)).toBe(1.25);
  });

  it("clamps to the supported bounds", () => {
    expect(clampCalibration(0.1)).toBe(MIN_CALIBRATION);
    expect(clampCalibration(99)).toBe(MAX_CALIBRATION);
  });

  it("repairs non-finite values to 1", () => {
    expect(clampCalibration(NaN)).toBe(1);
    expect(clampCalibration(Infinity)).toBe(1);
    expect(clampCalibration(-Infinity)).toBe(1);
  });
});

describe("convertSpeed", () => {
  it("is the identity for the default display", () => {
    expect(convertSpeed(240)).toBe(240);
    expect(convertSpeed(240, DEFAULT_SPEED_DISPLAY)).toBe(240);
  });

  it("applies a calibration trim in mph", () => {
    expect(convertSpeed(200, { unit: "mph", calibration: 1.1 })).toBeCloseTo(220, 6);
  });

  it("converts to km/h with the exact factor", () => {
    expect(convertSpeed(100, { unit: "kmh", calibration: 1 })).toBeCloseTo(100 * KMH_PER_MPH, 6);
  });

  it("combines calibration and km/h", () => {
    expect(convertSpeed(100, { unit: "kmh", calibration: 1.5 })).toBeCloseTo(
      100 * 1.5 * KMH_PER_MPH,
      6,
    );
  });

  it("clamps an out-of-range calibration before converting", () => {
    expect(convertSpeed(100, { unit: "mph", calibration: 10 })).toBe(100 * MAX_CALIBRATION);
  });
});

describe("speedUnitLabel", () => {
  it("maps units to display captions", () => {
    expect(speedUnitLabel("mph")).toBe("mph");
    expect(speedUnitLabel("kmh")).toBe("km/h");
  });
});

describe("formatSpeedValue", () => {
  it("rounds to a whole number", () => {
    expect(formatSpeedValue(239.6)).toBe("240");
  });

  it("reflects the chosen unit", () => {
    const kmh: SpeedDisplay = { unit: "kmh", calibration: 1 };
    expect(formatSpeedValue(100, kmh)).toBe(Math.round(100 * KMH_PER_MPH).toString());
  });
});

describe("formatBestSpeed", () => {
  it("shows an em dash when nothing is recorded", () => {
    expect(formatBestSpeed(0)).toBe("\u2014");
    expect(formatBestSpeed(-5)).toBe("\u2014");
  });

  it("formats a recorded best in the chosen unit", () => {
    expect(formatBestSpeed(180)).toBe("180");
    expect(formatBestSpeed(180, { unit: "kmh", calibration: 1 })).toBe(
      Math.round(180 * KMH_PER_MPH).toString(),
    );
  });
});

describe("formatCalibration", () => {
  it("renders a ×N.NN trim label", () => {
    expect(formatCalibration(1)).toBe("\u00d71.00");
    expect(formatCalibration(1.15)).toBe("\u00d71.15");
  });

  it("clamps before formatting", () => {
    expect(formatCalibration(99)).toBe(`\u00d7${MAX_CALIBRATION.toFixed(2)}`);
  });
});

describe("calibration step", () => {
  it("is a sensible increment", () => {
    expect(CALIBRATION_STEP).toBeGreaterThan(0);
    expect(CALIBRATION_STEP).toBeLessThan(MAX_CALIBRATION - MIN_CALIBRATION);
  });
});
