/**
 * Map a BLE adapter {@link BlePhase} to a plain-language banner for the home
 * speedometer screen.
 *
 * The Live screen has a raw event log that explains *why* the radio isn't
 * connected, but the home gauge previously showed **nothing** when Bluetooth was
 * off or unauthorized — the needle just sat dead. That is especially painful
 * under iOS **Guided Access** (the kids'-iPad / kiosk lock): iOS suppresses the
 * system Bluetooth prompt during a Guided Access session, so a portal that can't
 * connect gives zero on-screen feedback. Surfacing these states on the gauge is
 * the fix. See `docs/guides/ios-guided-access.md`.
 *
 * This module is intentionally **pure** (no React Native imports) so it can be
 * unit-tested without a renderer; {@link BleStatusBanner} renders the result.
 */
import type { BlePhase } from "./types";

export type BleBannerTone = "warn" | "danger";

export interface BleBanner {
  /** Visual severity — amber for "easily fixed", red for "needs attention". */
  readonly tone: BleBannerTone;
  readonly title: string;
  readonly body: string;
  /** When true, the UI should offer an "Open Settings" affordance. */
  readonly openSettings?: boolean;
}

/** Shared tip: the BLE/Guided-Access gotcha, appended where it's actionable. */
const GUIDED_ACCESS_TIP =
  "Using Guided Access? Turn Bluetooth on and connect the portal once before you start it — " +
  "iOS hides the Bluetooth prompt during a Guided Access session.";

/**
 * Return the banner for an adapter-problem phase, or `null` when nothing is
 * wrong (idle, scanning, connected, the normal happy path, or a null phase).
 * Only the states the user can act on surface a banner.
 */
export function bleStatusBanner(phase: BlePhase | null): BleBanner | null {
  switch (phase) {
    case "poweredOff":
      return {
        tone: "warn",
        title: "Bluetooth is off",
        body:
          "Turn Bluetooth on in Control Center or Settings, then tap the status pill to retry. " +
          GUIDED_ACCESS_TIP,
      };
    case "unauthorized":
      return {
        tone: "danger",
        title: "Allow Bluetooth",
        body:
          "Redline ID needs Bluetooth permission to reach your portal. Open Settings and turn " +
          "on Bluetooth for Redline ID. " +
          GUIDED_ACCESS_TIP,
        openSettings: true,
      };
    case "unsupported":
      return {
        tone: "danger",
        title: "No Bluetooth radio here",
        body:
          "This device has no usable Bluetooth radio (for example the iOS Simulator). Run on a " +
          "physical iPhone, or switch to Demo to explore the app.",
      };
    case "error":
      return {
        tone: "warn",
        title: "Bluetooth hiccup",
        body: "Something interrupted the Bluetooth connection. Tap the status pill to try again.",
      };
    case "notFound":
      return {
        tone: "warn",
        title: "Portal not found",
        body: "Make sure the portal is powered on and nearby, then tap the status pill to scan again.",
      };
    default:
      return null;
  }
}
