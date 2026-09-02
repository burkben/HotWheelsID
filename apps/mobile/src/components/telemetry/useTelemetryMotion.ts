/**
 * useTelemetryMotion — the single motion gate for the Trackside Telemetry UI.
 *
 * Every decorative animation consults this exactly once so there is one place
 * that decides whether motion happens: the OS Reduce Motion flag OR'd with the
 * in-app `reduceMotion` setting (design-language §8/§11). It also hands out the
 * standard timing/spring configs so motion stays consistent across screens.
 */
import { Easing, type WithTimingConfig } from "react-native-reanimated";
import { useReducedMotion } from "react-native-reanimated";

import { useSettingsStore } from "@/store/settingsStore";

export interface TelemetryMotion {
  /** OS setting OR app setting — when true, decorative motion is skipped. */
  reduceMotion: boolean;
  /** Standard quick timing (tab rails, indicators, row entrances). */
  timing: WithTimingConfig;
  /** Slower timing for larger surfaces. */
  timingSlow: WithTimingConfig;
  /** The only spring in the system — the gauge needle. No visible bounce. */
  needleSpring: { damping: number; stiffness: number; mass: number; overshootClamping: boolean };
}

const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

export function useTelemetryMotion(): TelemetryMotion {
  const osReduce = useReducedMotion();
  const appReduce = useSettingsStore((s) => s.reduceMotion);
  return {
    reduceMotion: osReduce || appReduce,
    timing: { duration: 180, easing: EASE },
    timingSlow: { duration: 220, easing: EASE },
    needleSpring: { damping: 28, stiffness: 260, mass: 0.7, overshootClamping: true },
  };
}
