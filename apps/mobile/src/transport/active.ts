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

let activeStop: StopFn | null = null;

/**
 * Mark `stop` as the active transport's teardown. If a *different* transport was
 * already active, its `stop` is invoked first (fire-and-forget) so it tears down
 * cleanly before the new one takes over.
 */
export function claimActiveTransport(stop: StopFn): void {
  if (activeStop && activeStop !== stop) {
    const previous = activeStop;
    activeStop = stop; // reassign first so the previous stop()'s release() no-ops
    try {
      void previous();
    } catch {
      // best-effort teardown; the incoming transport takes over regardless
    }
    return;
  }
  activeStop = stop;
}

/** Release the slot if `stop` still owns it (called from a transport's stop()). */
export function releaseActiveTransport(stop: StopFn): void {
  if (activeStop === stop) {
    activeStop = null;
  }
}
