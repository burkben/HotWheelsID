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
import { useEffect, useState } from "react";

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
 * Seeded synchronously from the native module so a screen mounted *after* the TV
 * was attached still renders the connected state on its first frame, then kept
 * fresh by the `onDisplayChange` event.
 */
export function useExternalDisplay(): ExternalDisplayInfo {
  const [info, setInfo] = useState<ExternalDisplayInfo>(() => ExternalDisplay.getDisplayInfo());

  useEffect(() => {
    // Re-read on mount: the display may have connected between the initial
    // `useState` evaluation and the subscription being attached.
    setInfo(ExternalDisplay.getDisplayInfo());
    const subscription = ExternalDisplay.addDisplayListener(setInfo);
    return () => subscription.remove();
  }, []);

  return info;
}
