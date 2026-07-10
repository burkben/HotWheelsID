import type { CatalogCar } from "../catalog/catalog";
import { shortUid } from "../garage/format";
import type { ConnectionState } from "../store/portalStore";
import { formatLapTime } from "../share/summary";
import type { RaceResult } from "./raceEngine";

export type RaceMode = "solo" | "raceNight";

export interface PortalReadiness {
  readonly label: string;
  readonly detail: string;
  readonly ready: boolean;
  readonly tone: "ready" | "busy" | "disconnected";
}

export interface RaceCarPresentation {
  readonly uid: string | null;
  readonly name: string;
  readonly image: string | null;
  readonly identified: boolean;
}

export function portalReadiness(connection: ConnectionState): PortalReadiness {
  switch (connection) {
    case "connected":
      return {
        label: "Portal ready",
        detail: "Passes will be recorded automatically.",
        ready: true,
        tone: "ready",
      };
    case "connecting":
      return {
        label: "Connecting",
        detail: "Wait for the portal connection before starting.",
        ready: false,
        tone: "busy",
      };
    case "disconnected":
    default:
      return {
        label: "Portal disconnected",
        detail: "Connect the portal or start Demo on the Speed tab.",
        ready: false,
        tone: "disconnected",
      };
  }
}

export function canStartRace(
  mode: RaceMode,
  connection: ConnectionState,
  lineupLength: number,
): boolean {
  return connection === "connected" && (mode === "solo" || lineupLength > 0);
}

export function presentRaceCar(
  uid: string | null | undefined,
  catalogCar: CatalogCar | undefined,
  emptyLabel = "Car on portal at start",
): RaceCarPresentation {
  if (!uid) {
    return { uid: null, name: emptyLabel, image: null, identified: false };
  }
  return {
    uid,
    name: catalogCar?.name ?? shortUid(uid),
    image: catalogCar?.image ?? null,
    identified: catalogCar != null,
  };
}

export function resultPrimaryActionLabel(
  mode: RaceMode,
  lineupLength: number,
  nextRacerName: string | null,
): string {
  if (mode === "raceNight" && lineupLength > 1 && nextRacerName) {
    return `Advance to ${nextRacerName}`;
  }
  return "Race again";
}

export function countdownAnnouncement(count: number): string {
  return count > 0 ? count.toString() : "Go";
}

export function lapAnnouncement(
  lapNumber: number,
  lapTime: number,
  isBest: boolean,
): string {
  return `Lap ${lapNumber}, ${formatLapTime(lapTime)}${isBest ? ", new best time" : ""}`;
}

export function finishAnnouncement(result: RaceResult, nextRacerName: string | null): string {
  const next = nextRacerName ? ` Up next, ${nextRacerName}.` : "";
  return (
    `${result.player} finished ${result.lapCount} laps in ${formatLapTime(result.totalTime)}. ` +
    `Best lap ${formatLapTime(result.bestLap)}.${next}`
  );
}
