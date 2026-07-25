/**
 * Single-elimination tournament bracket over a race-night lineup (Phase 5).
 *
 * Pure and immutable, exactly like {@link ./raceNight} and {@link ./raceEngine}:
 * every function takes a {@link Tournament} and returns a new one, so the UI can
 * keep it in component state and it stays fully Node-testable.
 *
 * The race itself is single-lane and turn-based, so a "match" is decided by the
 * two racers' heat times — the caller reports each racer's total time and the
 * engine advances the winner. Odd fields get byes: the bracket is padded to the
 * next power of two and standard seeding pushes the byes onto the top seeds, so
 * a lineup of any size ≥ 2 produces a valid bracket with no double-byes.
 */

export interface TournamentMatch {
  readonly id: string;
  /** 1-based round number; the final is the highest round. */
  readonly round: number;
  /** Racer id in slot A, or `null` while it waits on a feeding match / bye. */
  readonly a: string | null;
  /** Racer id in slot B, or `null` while it waits on a feeding match / bye. */
  readonly b: string | null;
  /** Winner's racer id once decided (set immediately for a bye). */
  readonly winner: string | null;
}

export interface Tournament {
  /** Racers in seeded (lineup) order. */
  readonly racerIds: readonly string[];
  /** Every match across every round, earliest round first. */
  readonly matches: readonly TournamentMatch[];
  /** Number of rounds (0 when there is no bracket to run). */
  readonly rounds: number;
  /** Champion's racer id once the final is decided, else `null`. */
  readonly championId: string | null;
}

/** Standard bracket seed order for a power-of-two `size` (values are 1-based seeds). */
function seedOrder(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const sum = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s);
      next.push(sum - s);
    }
    seeds = next;
  }
  return seeds;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Write `winnerId` into the parent match's slot (A for even feeders, B for odd). */
function feedParent(
  matches: TournamentMatch[],
  round: number,
  indexInRound: number,
  winnerId: string,
): void {
  const parentRound = round + 1;
  const parents = matches.filter((m) => m.round === parentRound);
  const parent = parents[Math.floor(indexInRound / 2)];
  if (!parent) return;
  const slot = indexInRound % 2 === 0 ? "a" : "b";
  const idx = matches.indexOf(parent);
  matches[idx] = { ...parent, [slot]: winnerId };
}

/** Set a match winner and propagate it into the next round; recompute champion. */
function decide(t: Tournament, matchId: string, winnerId: string): Tournament {
  const matches = t.matches.map((m) => ({ ...m }));
  const target = matches.find((m) => m.id === matchId);
  if (!target || target.winner) return t;
  if (winnerId !== target.a && winnerId !== target.b) return t;

  target.winner = winnerId;
  const indexInRound = matches.filter((m) => m.round === target.round).indexOf(target);
  if (target.round < t.rounds) {
    feedParent(matches, target.round, indexInRound, winnerId);
  }

  const final = matches.find((m) => m.round === t.rounds);
  const championId = final?.winner ?? null;
  return { ...t, matches, championId };
}

/** Seed a fresh single-elimination bracket from `racerIds` (lineup order). */
export function createTournament(racerIds: readonly string[]): Tournament {
  const ids = [...racerIds];
  if (ids.length < 2) {
    return { racerIds: ids, matches: [], rounds: 0, championId: ids[0] ?? null };
  }

  const size = nextPowerOfTwo(ids.length);
  const rounds = Math.log2(size);
  const order = seedOrder(size);
  const racerForSlot = order.map((seed) => ids[seed - 1] ?? null);

  const matches: TournamentMatch[] = [];
  for (let round = 1; round <= rounds; round++) {
    const count = size / 2 ** round;
    for (let m = 0; m < count; m++) {
      if (round === 1) {
        matches.push({
          id: `r${round}-m${m}`,
          round,
          a: racerForSlot[2 * m],
          b: racerForSlot[2 * m + 1],
          winner: null,
        });
      } else {
        matches.push({ id: `r${round}-m${m}`, round, a: null, b: null, winner: null });
      }
    }
  }

  // Resolve round-1 byes (a racer facing an empty slot advances immediately) and
  // push those winners forward. Only round 1 can hold byes, so a single pass here
  // plus the propagation inside `decide` keeps every later round free of them.
  let t: Tournament = { racerIds: ids, matches, rounds, championId: null };
  for (const m of matches.filter((x) => x.round === 1)) {
    const bye = m.a && !m.b ? m.a : !m.a && m.b ? m.b : null;
    if (bye) t = decide(t, m.id, bye);
  }
  return t;
}

/** The next match ready to run: both racers known and no winner yet. */
export function currentMatch(t: Tournament): TournamentMatch | null {
  for (let round = 1; round <= t.rounds; round++) {
    for (const m of t.matches.filter((x) => x.round === round)) {
      if (m.a && m.b && !m.winner) return m;
    }
  }
  return null;
}

/** Report a match result by winner id, advancing the bracket. */
export function reportWinner(t: Tournament, matchId: string, winnerId: string): Tournament {
  return decide(t, matchId, winnerId);
}

/**
 * Decide a match by the two racers' heat times (lower wins). Ties resolve to the
 * A-slot racer — heat order is the tiebreak, matching how the caller runs them.
 */
export function reportTimes(
  t: Tournament,
  matchId: string,
  timeA: number,
  timeB: number,
): Tournament {
  const match = t.matches.find((m) => m.id === matchId);
  if (!match || !match.a || !match.b) return t;
  const winnerId = timeB < timeA ? match.b : match.a;
  return decide(t, matchId, winnerId);
}

export function isComplete(t: Tournament): boolean {
  return t.championId !== null;
}
