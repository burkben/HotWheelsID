import type { ControlStatus } from "@redlineid/protocol";

import type { CatalogCar } from "../catalog/catalog";
import type { BlePhase } from "../ble/types";
import type { CurrentCar, ConnectionState } from "../store/portalStore";
import type { CarRecord } from "../store/persistence/carRepository";
import type { PortalMode } from "./controller";

export type PortalStatusAction = "connect" | "retry" | "disconnect" | "none";

export interface PortalStatusPresentation {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly accessibilityHint: string;
  readonly tone: "idle" | "busy" | "connected" | "error";
  readonly action: PortalStatusAction;
  readonly busy: boolean;
}

export function portalStatusPresentation(input: {
  connection: ConnectionState;
  controlStatus: ControlStatus | null;
  phase: BlePhase | null;
  mode: PortalMode;
  manuallyDisconnected: boolean;
}): PortalStatusPresentation {
  const { connection, controlStatus, phase, mode, manuallyDisconnected } = input;

  if (connection === "connected") {
    const label =
      mode === "demo"
        ? "Demo ready"
        : controlStatus === "carPresent"
          ? "Car on portal"
          : controlStatus === "transitional"
            ? "Reading…"
            : "Connected";
    return {
      label,
      accessibilityLabel: `Portal status: ${label}`,
      accessibilityHint: "Double tap to review disconnecting the portal.",
      tone: "connected",
      action: "disconnect",
      busy: false,
    };
  }

  const busy =
    connection === "connecting" ||
    phase === "scanning" ||
    phase === "connecting" ||
    phase === "discovering" ||
    phase === "authenticating" ||
    phase === "reconnecting";
  if (busy) {
    const label =
      mode === "demo"
        ? "Starting demo…"
        : phase === "reconnecting"
          ? "Retrying…"
          : phase === "authenticating"
            ? "Authenticating…"
            : phase === "discovering"
              ? "Discovering…"
              : phase === "connecting"
                ? "Connecting…"
                : "Scanning…";
    return {
      label,
      accessibilityLabel: `Portal status: ${label}`,
      accessibilityHint: "Connection is in progress.",
      tone: "busy",
      action: "none",
      busy: true,
    };
  }

  if (phase === "notFound") {
    return {
      label: "Portal not found",
      accessibilityLabel: "Portal status: portal not found",
      accessibilityHint: "Double tap to scan again.",
      tone: "error",
      action: "retry",
      busy: false,
    };
  }

  if (
    phase === "error" ||
    phase === "poweredOff" ||
    phase === "unauthorized" ||
    phase === "unsupported" ||
    phase === "locked"
  ) {
    const label =
      phase === "poweredOff"
        ? "Bluetooth off"
        : phase === "unauthorized"
          ? "Permission needed"
          : phase === "unsupported"
            ? "Bluetooth unavailable"
            : phase === "locked"
              ? "Portal unsupported"
              : "Connection error";
    return {
      label,
      accessibilityLabel: `Portal status: ${label}`,
      accessibilityHint: "Double tap to try connecting again after resolving the problem.",
      tone: "error",
      action: "retry",
      busy: false,
    };
  }

  const label = mode === "demo" ? "Demo paused" : manuallyDisconnected ? "Disconnected" : "Ready";
  return {
    label,
    accessibilityLabel: `Portal status: ${label}`,
    accessibilityHint:
      mode === "demo" ? "Double tap to start the demo portal." : "Double tap to connect to the portal.",
    tone: "idle",
    action: "connect",
    busy: false,
  };
}

export interface CarHeroModel {
  readonly uid: string;
  readonly title: string;
  readonly serial: string | null;
  readonly image: string | null;
  readonly isCurrent: boolean;
  readonly bestMph: number;
  readonly lastMph: number | null;
}

export function shortUid(uid: string): string {
  const parts = uid.split(":");
  return parts.length > 2 ? parts.slice(-2).join(":") : uid;
}

export function carHeroModel(input: {
  currentCar: CurrentCar | null;
  lastCar: CurrentCar | null;
  garageCars: readonly CarRecord[];
  catalogCar?: CatalogCar;
  sessionBestMph: number;
  lastMph?: number | null;
}): CarHeroModel | null {
  const { currentCar, lastCar, garageCars, catalogCar, sessionBestMph, lastMph } = input;
  const candidate = currentCar ?? lastCar ?? garageCars[0];
  if (!candidate?.uid) return null;

  const garageCar = garageCars.find((car) => car.uid === candidate.uid);
  return {
    uid: candidate.uid,
    title: catalogCar?.name ?? garageCar?.name ?? shortUid(candidate.uid),
    serial: candidate.serial ?? garageCar?.serial ?? null,
    image: catalogCar?.image ?? null,
    isCurrent: currentCar?.uid === candidate.uid,
    bestMph: Math.max(sessionBestMph, garageCar?.bestMph ?? 0),
    lastMph: lastMph ?? null,
  };
}
