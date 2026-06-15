import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PortalEvent } from "@redlineid/protocol";

import { createMockPortal } from "./mockPortal";

type Conn = "disconnected" | "connecting" | "connected";

/** Capture everything a mock portal dispatches so we can assert against the
 *  *decoded* events — proving the mock drives the real protocol pipeline. */
function harness(opts?: { random?: () => number; passIntervalMs?: number }) {
  const events: PortalEvent[] = [];
  const connections: Conn[] = [];
  const portal = createMockPortal({
    dispatch: (e) => events.push(e),
    setConnection: (c) => connections.push(c),
    random: opts?.random ?? (() => 0.5),
    passIntervalMs: opts?.passIntervalMs,
  });
  const speeds = () => events.filter((e) => e.kind === "speed");
  return { events, connections, portal, speeds };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("createMockPortal — connect → detect → stream", () => {
  it("connects, places the demo car, and streams passes decoded by the real protocol", () => {
    const { events, connections, portal, speeds } = harness();
    portal.start();
    expect(connections[0]).toBe("connecting");

    // Connected beat (+600ms) emits a decoded control:idle.
    vi.advanceTimersByTime(600);
    expect(connections).toContain("connected");
    expect(events.find((e) => e.kind === "control")).toMatchObject({ status: "idle" });

    // Car-placed beat (+1200ms): the bytes round-trip to the documented UID + serial.
    vi.advanceTimersByTime(700);
    expect(events.find((e) => e.kind === "carDetected")).toMatchObject({
      kind: "carDetected",
      uid: "6C:C4:5A:2B:64:81",
    });
    expect(events.find((e) => e.kind === "serial")).toMatchObject({ serial: "1102032557" });
    expect(events.some((e) => e.kind === "control" && e.status === "carPresent")).toBe(true);

    // First pass at +2000ms.
    vi.advanceTimersByTime(1000);
    expect(speeds().length).toBeGreaterThan(0);

    portal.stop();
    expect(connections.at(-1)).toBe("disconnected");
  });

  it("auto-runs a self-scheduling pass loop", () => {
    const { portal, speeds } = harness({ passIntervalMs: 1000, random: () => 0.5 });
    portal.start();

    vi.advanceTimersByTime(2000);
    const early = speeds().length;
    expect(early).toBeGreaterThan(0);

    vi.advanceTimersByTime(2000);
    expect(speeds().length).toBeGreaterThan(early);

    portal.stop();
  });

  it("stops cleanly: no further passes after stop()", () => {
    const { portal, speeds } = harness({ passIntervalMs: 1000 });
    portal.start();
    vi.advanceTimersByTime(2500);
    const atStop = speeds().length;

    portal.stop();
    vi.advanceTimersByTime(5000);
    expect(speeds().length).toBe(atStop);
  });
});

describe("createMockPortal — triggerPass", () => {
  it("encodes a requested speed that round-trips back through the decoder", () => {
    const { portal, speeds } = harness();
    portal.start();
    vi.advanceTimersByTime(1300); // connected + car present, before the auto-pass at 2000ms
    const before = speeds().length;

    portal.triggerPass(250);

    const after = speeds();
    expect(after.length).toBe(before + 1);
    const last = after.at(-1)!;
    expect(last.kind).toBe("speed");
    if (last.kind === "speed") expect(last.scaleMph).toBeCloseTo(250, 1);

    portal.stop();
  });

  it("does nothing when fired before start (nothing is running)", () => {
    const { portal, speeds } = harness();
    portal.triggerPass(200);
    expect(speeds()).toEqual([]);
  });
});
