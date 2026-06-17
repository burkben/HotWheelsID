import { describe, expect, it } from "vitest";

import {
  formatClock,
  formatDuration,
  formatMphLabel,
  formatPassMph,
  formatSessionDate,
  passCountLabel,
} from "./format";

describe("history/format", () => {
  it("formatDuration renders mm ss, seconds-only, and in-progress", () => {
    expect(formatDuration(0, null)).toBe("in progress");
    expect(formatDuration(0, 45_000)).toBe("45s");
    expect(formatDuration(0, 123_000)).toBe("2m 03s");
    expect(formatDuration(1_000, 0)).toBe("0s"); // clamps negative
  });

  it("formatClock zero-pads h:m:s from the same Date fields", () => {
    const at = new Date(2026, 5, 17, 9, 4, 7).getTime();
    expect(formatClock(at)).toBe("09:04:07");
  });

  it("formatSessionDate uses a 12-hour clock with month + day", () => {
    const midnight = new Date(2026, 0, 5, 0, 8).getTime();
    expect(formatSessionDate(midnight)).toBe("Jan 5 · 12:08 AM");
    const noon = new Date(2026, 11, 31, 12, 0).getTime();
    expect(formatSessionDate(noon)).toBe("Dec 31 · 12:00 PM");
    const afternoon = new Date(2026, 5, 17, 14, 34).getTime();
    expect(formatSessionDate(afternoon)).toBe("Jun 17 · 2:34 PM");
  });

  it("formatPassMph rounds to a whole number", () => {
    expect(formatPassMph(18.7)).toBe("19");
    expect(formatPassMph(0)).toBe("0");
  });

  it("formatMphLabel shows an em dash for a passless session", () => {
    expect(formatMphLabel(0)).toBe("—");
    expect(formatMphLabel(18.7)).toBe("19");
  });

  it("passCountLabel pluralizes", () => {
    expect(passCountLabel(0)).toBe("0 passes");
    expect(passCountLabel(1)).toBe("1 pass");
    expect(passCountLabel(5)).toBe("5 passes");
  });
});
