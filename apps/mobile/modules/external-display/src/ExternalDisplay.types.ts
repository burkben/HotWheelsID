/** Size and state of the attached external display, as reported by iOS. */
export interface ExternalDisplayInfo {
  /**
   * A dedicated external-display scene is attached and showing the TV stage.
   * False while mirroring, or when nothing is plugged in / AirPlayed.
   */
  readonly connected: boolean;
  /** Whether this platform/build can drive a dedicated external scene at all. */
  readonly supported: boolean;
  /** Screen size in points, or 0 when nothing is attached. */
  readonly width: number;
  readonly height: number;
  /** The display's name as iOS reports it, when it has one. */
  readonly name: string | null;
}

export type ExternalDisplayListener = (info: ExternalDisplayInfo) => void;

export interface ExternalDisplaySubscription {
  remove: () => void;
}

/** The module name the native side mounts as a second React surface. */
export const TV_ROOT_MODULE_NAME = "RedlineTV";

export const DISCONNECTED: ExternalDisplayInfo = {
  connected: false,
  supported: false,
  width: 0,
  height: 0,
  name: null,
};
