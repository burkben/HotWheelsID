export const DEFAULT_RACER_NAME = "Player 1";

export interface RaceNightRacer {
  readonly id: string;
  readonly name: string;
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

export function addRacer(lineup: RaceNightLineup, draftName: string): RaceNightLineup {
  const name = draftName.trim();
  if (!name) return lineup;

  return [...lineup, { id: nextRacerId(lineup), name }];
}

export function removeRacer(lineup: RaceNightLineup, racerId: string): RaceNightLineup {
  return lineup.filter((racer) => racer.id !== racerId);
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
