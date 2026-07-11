import { currentLapElapsed, type RaceState } from "./raceEngine";

export interface RaceHostSnapshot {
  readonly phaseLabel: string;
  readonly racer: string;
  readonly lap: string;
  readonly primaryLabel: string;
  readonly primaryValue: string;
  readonly lastLap: string;
  readonly bestLap: string;
}

export function formatRaceTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds - minutes * 60).toFixed(2).padStart(5, "0")}`;
  }
  return `${seconds.toFixed(2)}s`;
}

export function raceHostSnapshot(race: RaceState, nowMs: number): RaceHostSnapshot {
  const racer = race.player || "Race night";
  const lastLap = race.lapTimes.at(-1);
  const bestLap = race.lapTimes.length > 0 ? Math.min(...race.lapTimes) : undefined;
  const inProgressLap = race.lastGateAt == null ? 0 : 1;
  const lapNumber = Math.min(race.lapTimes.length + inProgressLap, race.targetLaps);

  if (race.phase === "countdown") {
    return {
      phaseLabel: "Get ready",
      racer,
      lap: `0 / ${race.targetLaps}`,
      primaryLabel: "Starting",
      primaryValue: "3 · 2 · 1",
      lastLap: "—",
      bestLap: "—",
    };
  }

  if (race.phase === "racing") {
    return {
      phaseLabel: race.lastGateAt == null ? "Cross the line to start" : "Race live",
      racer,
      lap: `${lapNumber} / ${race.targetLaps}`,
      primaryLabel: race.lastGateAt == null ? "Timer armed" : "This lap",
      primaryValue:
        race.lastGateAt == null ? "READY" : formatRaceTime(currentLapElapsed(race, nowMs)),
      lastLap: lastLap == null ? "—" : formatRaceTime(lastLap),
      bestLap: bestLap == null ? "—" : formatRaceTime(bestLap),
    };
  }

  if (race.phase === "finished" && race.result) {
    return {
      phaseLabel: "Finished",
      racer: race.result.player,
      lap: `${race.result.lapCount} / ${race.targetLaps}`,
      primaryLabel: "Total time",
      primaryValue: formatRaceTime(race.result.totalTime),
      lastLap: formatRaceTime(race.result.lapTimes.at(-1) ?? Number.NaN),
      bestLap: formatRaceTime(race.result.bestLap),
    };
  }

  return {
    phaseLabel: "Ready for race night",
    racer,
    lap: `0 / ${race.targetLaps}`,
    primaryLabel: "Host display",
    primaryValue: "READY",
    lastLap: "—",
    bestLap: "—",
  };
}
