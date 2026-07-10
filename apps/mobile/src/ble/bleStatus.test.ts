import { describe, expect, it } from "vitest";

import { bleStatusBanner } from "./bleStatus";
import type { BlePhase } from "./types";

describe("bleStatusBanner", () => {
  it("flags Bluetooth-off as an actionable amber banner", () => {
    const banner = bleStatusBanner("poweredOff");
    expect(banner?.tone).toBe("warn");
    expect(banner?.title).toMatch(/bluetooth is off/i);
    expect(banner?.openSettings).toBeFalsy();
    // The Guided Access gotcha is the whole point of surfacing this.
    expect(banner?.body).toMatch(/guided access/i);
  });

  it("offers Open Settings when permission is denied", () => {
    const banner = bleStatusBanner("unauthorized");
    expect(banner?.tone).toBe("danger");
    expect(banner?.openSettings).toBe(true);
    expect(banner?.body).toMatch(/permission/i);
    expect(banner?.body).toMatch(/guided access/i);
  });

  it("explains an unsupported radio (e.g. the Simulator)", () => {
    const banner = bleStatusBanner("unsupported");
    expect(banner?.tone).toBe("danger");
    expect(banner?.title).toMatch(/no bluetooth/i);
  });

  it("offers a retry hint on a generic error", () => {
    const banner = bleStatusBanner("error");
    expect(banner?.tone).toBe("warn");
    expect(banner?.body).toMatch(/try again/i);
  });

  it("explains when bounded scanning cannot find the portal", () => {
    const banner = bleStatusBanner("notFound");
    expect(banner?.title).toMatch(/not found/i);
    expect(banner?.body).toMatch(/scan again/i);
  });

  it("stays silent for the healthy / in-progress phases", () => {
    const quiet: (BlePhase | null)[] = [
      null,
      "idle",
      "scanning",
      "connecting",
      "discovering",
      "authenticating",
      "connected",
      "reconnecting",
      "locked", // the home screen renders its own dedicated "locked" banner
    ];
    for (const phase of quiet) {
      expect(bleStatusBanner(phase)).toBeNull();
    }
  });
});
