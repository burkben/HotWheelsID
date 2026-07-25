/**
 * External display (TV) plumbing for JS.
 *
 * The native side (`modules/external-display`) hands iOS a *real* second scene
 * when a TV is attached over AirPlay or a cable, and mounts a second React
 * surface into it — see `docs/adr/0015-external-display-tv-mode.md`. This module
 * is the thin, platform-safe wrapper the UI talks to; on Android, web, Expo Go
 * and the Simulator the module is simply absent and everything reports
 * "unsupported / not connected" rather than throwing.
 */
import { useSyncExternalStore } from "react";

import ExternalDisplay, {
  type ExternalDisplayInfo,
} from "../../modules/external-display";

export type { ExternalDisplayInfo };

/** Whether this build can drive a dedicated (non-mirrored) external screen. */
export function isExternalDisplaySupported(): boolean {
  return ExternalDisplay.isSupported();
}

/**
 * Live external-display state.
 *
 * The native module is an external store, so it is read through
 * `useSyncExternalStore`: React re-reads the snapshot right after subscribing,
 * which closes the gap where a TV attaches between the first render and the
 * listener being attached — without folding native events into local state.
 */
export function useExternalDisplay(): ExternalDisplayInfo {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function subscribe(onStoreChange: () => void): () => void {
  const subscription = ExternalDisplay.addDisplayListener(onStoreChange);
  return () => subscription.remove();
}

/**
 * `useSyncExternalStore` compares snapshots by identity, and the native call
 * returns a fresh object every time, so the last value is cached and only
 * replaced when a field actually changed. Returning a new object each read
 * would re-render forever.
 */
let cached: ExternalDisplayInfo | null = null;

function getSnapshot(): ExternalDisplayInfo {
  const next = ExternalDisplay.getDisplayInfo();
  if (cached === null || !sameInfo(cached, next)) cached = next;
  return cached;
}

function sameInfo(a: ExternalDisplayInfo, b: ExternalDisplayInfo): boolean {
  return (
    a.connected === b.connected &&
    a.supported === b.supported &&
    a.width === b.width &&
    a.height === b.height &&
    a.name === b.name
  );
}
