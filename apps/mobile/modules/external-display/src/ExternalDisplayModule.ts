/**
 * JS face of the `external-display` local module.
 *
 * The native half only exists on iOS, and only in a build that has been through
 * `expo prebuild` — Expo Go, the web bundle and Android all resolve
 * `requireOptionalNativeModule` to `null`. Every accessor below therefore
 * degrades to "unsupported, not connected" instead of throwing, so the TV stage
 * stays usable as an in-app screen (over plain AirPlay mirroring) everywhere.
 */
import { requireOptionalNativeModule } from "expo";
import type { NativeModule } from "expo";

import {
  DISCONNECTED,
  type ExternalDisplayInfo,
  type ExternalDisplayListener,
  type ExternalDisplaySubscription,
} from "./ExternalDisplay.types";

type ExternalDisplayEvents = {
  onDisplayChange: (info: ExternalDisplayInfo) => void;
};

declare class ExternalDisplayNativeModule extends NativeModule<ExternalDisplayEvents> {
  getDisplayInfo(): ExternalDisplayInfo;
}

const native = requireOptionalNativeModule<ExternalDisplayNativeModule>("ExternalDisplay");

function getDisplayInfo(): ExternalDisplayInfo {
  if (!native) return DISCONNECTED;
  try {
    return native.getDisplayInfo();
  } catch {
    // A malformed/failed native call must never take the app down over a
    // secondary display; fall back to "nothing attached".
    return DISCONNECTED;
  }
}

function isSupported(): boolean {
  return native != null;
}

function addDisplayListener(listener: ExternalDisplayListener): ExternalDisplaySubscription {
  if (!native) return { remove: () => {} };
  const subscription = native.addListener("onDisplayChange", listener);
  return { remove: () => subscription.remove() };
}

export default { getDisplayInfo, isSupported, addDisplayListener };
