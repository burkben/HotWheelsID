import { describe, expect, it, vi } from "vitest";

import type { BlePortalCallbacks } from "../ble/types";
import { PortalController } from "./controller";

function harness(canBle: boolean) {
  const live = { start: vi.fn(), stop: vi.fn() };
  const demo = { start: vi.fn(), stop: vi.fn(), triggerPass: vi.fn() };
  let callbacks: Pick<BlePortalCallbacks, "onPhase" | "onLog"> | null = null;
  const createBle = vi.fn((next: Pick<BlePortalCallbacks, "onPhase" | "onLog">) => {
    callbacks = next;
    return live;
  });
  const createMock = vi.fn(() => demo);
  const persistDemoDefault = vi.fn();
  const prewarmLive = vi.fn();
  const controller = new PortalController({
    canBle,
    createBle,
    createMock,
    persistDemoDefault,
    prewarmLive,
  });
  return {
    controller,
    live,
    demo,
    createBle,
    createMock,
    persistDemoDefault,
    prewarmLive,
    callbacks: () => callbacks,
  };
}

describe("PortalController", () => {
  it("auto-starts live BLE after settings hydrate on a capable device", async () => {
    const h = harness(true);
    await h.controller.configure(false);
    expect(h.prewarmLive).toHaveBeenCalledTimes(1);
    expect(h.createBle).toHaveBeenCalledTimes(1);
    expect(h.live.start).toHaveBeenCalledTimes(1);
    expect(h.createMock).not.toHaveBeenCalled();
    expect(h.controller.getState()).toMatchObject({ ready: true, mode: "live" });
  });

  it("honors persisted demo mode without constructing BLE", async () => {
    const h = harness(true);
    await h.controller.configure(true);
    expect(h.createMock).toHaveBeenCalledTimes(1);
    expect(h.demo.start).toHaveBeenCalledTimes(1);
    expect(h.createBle).not.toHaveBeenCalled();
    // CoreBluetooth still warms once so Guided Access cannot suppress a later
    // permission prompt. This does not create the transport or start a scan.
    expect(h.prewarmLive).toHaveBeenCalledTimes(1);
  });

  it("forces demo on a non-BLE environment and does not overwrite the preference", async () => {
    const h = harness(false);
    await h.controller.configure(false);
    expect(h.controller.getState().mode).toBe("demo");
    expect(h.createMock).toHaveBeenCalledTimes(1);
    expect(h.createBle).not.toHaveBeenCalled();
    expect(h.prewarmLive).not.toHaveBeenCalled();
    expect(h.persistDemoDefault).not.toHaveBeenCalled();
  });

  it("stops the old transport before switching mode and persists the choice", async () => {
    const h = harness(true);
    await h.controller.configure(false);
    await h.controller.setMode("demo");
    expect(h.live.stop).toHaveBeenCalledTimes(1);
    expect(h.demo.start).toHaveBeenCalledTimes(1);
    expect(h.persistDemoDefault).toHaveBeenCalledWith(true);
  });

  it("keeps a manual disconnect stopped until explicit connect", async () => {
    const h = harness(true);
    await h.controller.configure(false);
    await h.controller.disconnect();
    expect(h.live.stop).toHaveBeenCalledTimes(1);
    expect(h.controller.getState().manuallyDisconnected).toBe(true);

    await h.controller.connect();
    expect(h.live.start).toHaveBeenCalledTimes(2);
    expect(h.controller.getState().manuallyDisconnected).toBe(false);
  });

  it("restarts a terminal transport on retry and clears old logs", async () => {
    const h = harness(true);
    await h.controller.configure(false);
    h.callbacks()?.onLog?.({ id: 1, at: 1, level: "error", message: "failed" });
    expect(h.controller.getState().logs).toHaveLength(1);

    await h.controller.retry();
    expect(h.live.stop).toHaveBeenCalledTimes(1);
    expect(h.live.start).toHaveBeenCalledTimes(2);
    expect(h.controller.getState().logs).toEqual([]);
  });

  it("ignores callbacks from a superseded transport", async () => {
    const h = harness(true);
    await h.controller.configure(false);
    const stale = h.callbacks();
    await h.controller.setMode("demo");
    stale?.onPhase?.("error");
    expect(h.controller.getState().phase).toBeNull();
  });
});
