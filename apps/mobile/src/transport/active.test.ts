import { describe, expect, it, vi } from "vitest";

import {
  claimActiveTransport,
  getActiveTransportControls,
  releaseActiveTransport,
} from "./active";

describe("active transport guard", () => {
  it("stops the previously-active transport when a new one claims the slot", () => {
    const stopA = vi.fn();
    const stopB = vi.fn();

    claimActiveTransport(stopA);
    expect(stopA).not.toHaveBeenCalled();

    claimActiveTransport(stopB);
    expect(stopA).toHaveBeenCalledTimes(1);
    expect(stopB).not.toHaveBeenCalled();

    releaseActiveTransport(stopB);
  });

  it("re-claiming with the same stop fn does not re-invoke it", () => {
    const stop = vi.fn();
    claimActiveTransport(stop);
    claimActiveTransport(stop);
    expect(stop).not.toHaveBeenCalled();
    releaseActiveTransport(stop);
  });

  it("release only clears the slot when the caller still owns it", () => {
    const stopA = vi.fn();
    const stopB = vi.fn();
    claimActiveTransport(stopA);
    claimActiveTransport(stopB); // A is stopped; B now owns the slot
    stopA.mockClear();

    releaseActiveTransport(stopA); // stale owner — must be a no-op

    const stopC = vi.fn();
    claimActiveTransport(stopC); // B still owned the slot, so it gets stopped
    expect(stopB).toHaveBeenCalledTimes(1);

    releaseActiveTransport(stopC);
  });

  it("exposes the active transport's controls, replacing them on hand-off", () => {
    const stopA = vi.fn();
    const triggerA = vi.fn();
    claimActiveTransport(stopA, { triggerPass: triggerA });
    expect(getActiveTransportControls().triggerPass).toBe(triggerA);

    // A different transport with no controls takes over → controls reset.
    const stopB = vi.fn();
    claimActiveTransport(stopB);
    expect(getActiveTransportControls().triggerPass).toBeUndefined();

    // Releasing the owner clears the slot's controls.
    releaseActiveTransport(stopB);
    expect(getActiveTransportControls()).toEqual({});
  });
});
