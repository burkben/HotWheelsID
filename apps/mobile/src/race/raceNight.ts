export const DEFAULT_RACER_NAME = "Player 1";

export interface RaceNightRacer {
  readonly id: string;
  readonly name: string;
  /**
   * Tag `uid` of the car assigned to this racer, or `null` to fall back to
   * whichever car is live on the portal when the heat starts. Captured from the
   * portal when the racer is added, and reassignable from the lineup.
   */
  readonly carUid: string | null;
}

export type RaceNightLineup = readonly RaceNightRacer[];

export function currentRacerName(
  lineup: RaceNightLineup,
  draftName: string,
  fallback = DEFAULT_RACER_NAME,
): string {
  return lineup[0]?.name ?? (draftName.trim() || fallback);
}

export function nextUpRacer(lineup: RaceNightLineup): RaceNightRacer | null {
  return lineup[1] ?? null;
}

/**
 * Car the *current* racer should run. Their per-racer assignment wins; if they
 * have none (or the lineup is empty, e.g. a solo race), fall back to the live
 * portal car passed in by the caller.
 */
export function carForCurrentRacer(
  lineup: RaceNightLineup,
  fallbackCarUid: string | null = null,
): string | null {
  return lineup[0]?.carUid ?? fallbackCarUid;
}

export function addRacer(
  lineup: RaceNightLineup,
  draftName: string,
  carUid: string | null = null,
): RaceNightLineup {
  const name = draftName.trim();
  if (!name) return lineup;

  return [...lineup, { id: nextRacerId(lineup), name, carUid }];
}

export function removeRacer(lineup: RaceNightLineup, racerId: string): RaceNightLineup {
  return lineup.filter((racer) => racer.id !== racerId);
}

/** Assign (or clear, with `null`) the car a racer will run. */
export function assignCar(
  lineup: RaceNightLineup,
  racerId: string,
  carUid: string | null,
): RaceNightLineup {
  return lineup.map((racer) => (racer.id === racerId ? { ...racer, carUid } : racer));
}

export function chooseNextRacer(lineup: RaceNightLineup, racerId: string): RaceNightLineup {
  const index = lineup.findIndex((racer) => racer.id === racerId);
  if (index <= 1) return lineup;

  const racer = lineup[index];
  return [lineup[0], racer, ...lineup.slice(1, index), ...lineup.slice(index + 1)];
}

export function advanceLineup(lineup: RaceNightLineup): RaceNightLineup {
  if (lineup.length <= 1) return lineup;

  const [current, ...rest] = lineup;
  return [...rest, current];
}

function nextRacerId(lineup: RaceNightLineup): string {
  let maxId = 0;
  for (const racer of lineup) {
    const match = /^racer-(\d+)$/.exec(racer.id);
    if (!match) continue;
    maxId = Math.max(maxId, Number(match[1]));
  }
  return `racer-${maxId + 1}`;
}
