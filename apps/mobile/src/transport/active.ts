/**
 * Single-active-transport guard.
 *
 * The mock generator and the real BLE client both feed the *same* Zustand store.
 * Running both at once would double-dispatch events and fight over the
 * connection state. This tiny module enforces that only one transport is live:
 * claiming the slot stops whoever held it previously.
 *
 * It deliberately has no imports so both `mock/` and `ble/` can depend on it
 * without creating a cycle.
 */
type StopFn = () => void | Promise<void>;

/**
 * Optional capabilities a transport exposes while it owns the active slot. Lets
 * other screens (e.g. Race) drive the live transport without re-creating it —
 * keeping the single-connection invariant intact.
 */
export interface ActiveTransportControls {
  /** Fire a single synthetic pass. Mock-only; real BLE has no such hook. */
  triggerPass?: (scaleMph?: number) => void;
}

let activeStop: StopFn | null = null;
let activeControls: ActiveTransportControls = {};

/**
 * Mark `stop` as the active transport's teardown. If a *different* transport was
 * already active, its `stop` is invoked first (fire-and-forget) so it tears down
 * cleanly before the new one takes over. Optional `controls` advertise extra
 * capabilities (e.g. the mock's `triggerPass`) for the lifetime of the claim.
 */
export function claimActiveTransport(stop: StopFn, controls: ActiveTransportControls = {}): void {
  if (activeStop && activeStop !== stop) {
    const previous = activeStop;
    activeStop = stop; // reassign first so the previous stop()'s release() no-ops
    activeControls = controls;
    try {
      void previous();
    } catch {
      // best-effort teardown; the incoming transport takes over regardless
    }
    return;
  }
  activeStop = stop;
  activeControls = controls;
}

/** Release the slot if `stop` still owns it (called from a transport's stop()). */
export function releaseActiveTransport(stop: StopFn): void {
  if (activeStop === stop) {
    activeStop = null;
    activeControls = {};
  }
}

/**
 * Controls advertised by the currently-active transport. Empty when nothing is
 * active or when the active transport is real BLE (which has no `triggerPass`).
 */
export function getActiveTransportControls(): ActiveTransportControls {
  return activeControls;
}
