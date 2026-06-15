import { beforeEach, describe, expect, it } from "vitest";
import type { ControlStatus, PortalEvent } from "@redlineid/protocol";

import { usePortalStore } from "./portalStore";

const state = () => usePortalStore.getState();
const dispatch = (e: PortalEvent) => state().dispatch(e);
const setConnection = (c: "disconnected" | "connecting" | "connected") =>
  state().setConnection(c);

/** A decoded speed event, mirroring the protocol's `raw = scaleMph / 64` relation. */
const speed = (scaleMph: number): PortalEvent => ({
  kind: "speed",
  raw: scaleMph / 64,
  scaleMph,
});

const control = (status: ControlStatus): PortalEvent => ({
  kind: "control",
  status,
  bytes: new Uint8Array([0x00, 0xfe, 0x00, 0xfe, status === "carPresent" ? 0x02 : 0x00]),
});

beforeEach(() => {
  state().reset();
});

describe("portalStore — connection lifecycle", () => {
  it("starts disconnected and empty", () => {
    const s = state();
    expect(s.connection).toBe("disconnected");
    expect(s.car).toBeNull();
    expect(s.passes).toEqual([]);
    expect(s.bestMph).toBe(0);
    expect(s.lastSpeed).toBeNull();
    expect(s.controlStatus).toBeNull();
  });

  it("moves to connecting/connected without wiping session data", () => {
    dispatch({ kind: "carDetected", uid: "6C:C4:5A:2B:64:81" });
    setConnection("connecting");
    expect(state().connection).toBe("connecting");
    expect(state().car?.uid).toBe("6C:C4:5A:2B:64:81");

    setConnection("connected");
    expect(state().connection).toBe("connected");
    expect(state().car?.uid).toBe("6C:C4:5A:2B:64:81");
  });

  it("disconnecting resets all session state so no data lingers when not connected", () => {
    dispatch({ kind: "carDetected", uid: "6C:C4:5A:2B:64:81" });
    dispatch(speed(120));
    setConnection("connected");
    expect(state().passes.length).toBe(1);

    setConnection("disconnected");
    const s = state();
    expect(s.connection).toBe("disconnected");
    expect(s.car).toBeNull();
    expect(s.passes).toEqual([]);
    expect(s.bestMph).toBe(0);
    expect(s.lastSpeed).toBeNull();
    expect(s.controlStatus).toBeNull();
  });
});

describe("portalStore — car identity", () => {
  it("carDetected sets the uid and preserves an already-known serial", () => {
    dispatch({ kind: "serial", serial: "1102032557" });
    dispatch({ kind: "carDetected", uid: "6C:C4:5A:2B:64:81" });
    expect(state().car).toEqual({ uid: "6C:C4:5A:2B:64:81", serial: "1102032557" });
  });

  it("serial sets the serial and preserves the known uid", () => {
    dispatch({ kind: "carDetected", uid: "6C:C4:5A:2B:64:81" });
    dispatch({ kind: "serial", serial: "1102032557" });
    expect(state().car).toEqual({ uid: "6C:C4:5A:2B:64:81", serial: "1102032557" });
  });

  it("carRemoved clears the car and last speed and marks the portal idle", () => {
    dispatch({ kind: "carDetected", uid: "6C:C4:5A:2B:64:81" });
    dispatch(speed(80));
    dispatch({ kind: "carRemoved" });
    const s = state();
    expect(s.car).toBeNull();
    expect(s.lastSpeed).toBeNull();
    expect(s.controlStatus).toBe("idle");
  });
});

describe("portalStore — control status", () => {
  it("records the most recent control status", () => {
    dispatch(control("carPresent"));
    expect(state().controlStatus).toBe("carPresent");
    dispatch(control("idle"));
    expect(state().controlStatus).toBe("idle");
  });
});

describe("portalStore — speed & passes", () => {
  it("records a pass and tracks last speed for a real reading", () => {
    dispatch(speed(123.4));
    const s = state();
    expect(s.lastSpeed).toEqual({ raw: 123.4 / 64, scaleMph: 123.4 });
    expect(s.passes.length).toBe(1);
    expect(s.passes[0].scaleMph).toBe(123.4);
    expect(s.bestMph).toBe(123.4);
  });

  it("treats sub-1 mph noise as last speed only, not a recorded pass", () => {
    dispatch(speed(0.5));
    const s = state();
    expect(s.passes).toEqual([]);
    expect(s.bestMph).toBe(0);
    expect(s.lastSpeed).toEqual({ raw: 0.5 / 64, scaleMph: 0.5 });
  });

  it("keeps bestMph as the running maximum across passes", () => {
    dispatch(speed(100));
    dispatch(speed(250));
    dispatch(speed(180));
    expect(state().bestMph).toBe(250);
  });

  it("prepends passes newest-first and caps history at 20", () => {
    for (let i = 1; i <= 25; i += 1) dispatch(speed(i));
    const s = state();
    expect(s.passes.length).toBe(20);
    expect(s.passes[0].scaleMph).toBe(25); // newest first
    expect(s.passes[19].scaleMph).toBe(6); // oldest retained (25 - 19)
    expect(s.bestMph).toBe(25);
  });

  it("tags each pass with the car currently on the portal", () => {
    dispatch({ kind: "carDetected", uid: "6C:C4:5A:2B:64:81" });
    dispatch(speed(99));
    expect(state().passes[0].uid).toBe("6C:C4:5A:2B:64:81");
  });
});
