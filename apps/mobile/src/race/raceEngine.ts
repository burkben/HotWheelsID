/**
 * Race engine — a pure, framework-free port of `python/race_mode.py`'s lap logic.
 *
 * It is deliberately transport- and React-agnostic: it consumes *gate crossings*
 * (a car passing the portal sensor, i.e. a `speed` pass in the portal store) plus
 * a millisecond timestamp, and folds them into immutable race state. That keeps
 * the timing rules unit-testable with plain numbers (no fake timers, no native
 * deps) — the same "build-before-hardware" discipline as the mock portal.
 *
 * Timing model (matches the Python reference): the **first** gate crossing in a
 * race arms the timer (it's the start line — no lap is counted). Every subsequent
 * crossing closes one lap (`(now - lastGate) / 1000` seconds). When the number of
 * completed laps reaches `targetLaps`, the race finishes and a {@link RaceResult}
 * is computed (total / best / worst / average, best & worst lap numbers).
 */

export type RacePhase = "idle" | "countdown" | "racing" | "finished";

/** Selectable race lengths, mirroring race_mode.py's menu (quick → marathon). */
export const LAP_OPTIONS = [5, 10, 15, 20] as const;
export type LapOption = (typeof LAP_OPTIONS)[number];

export interface RaceConfig {
  targetLaps: number;
  player: string;
  carUid: string | null;
}

export interface RaceResult {
  readonly player: string;
  readonly carUid: string;
  readonly lapCount: number;
  readonly lapTimes: readonly number[];
  readonly totalTime: number;
  readonly bestLap: number;
  /** 1-based index of the fastest lap. */
  readonly bestLapNum: number;
  readonly worstLap: number;
  /** 1-based index of the slowest lap. */
  readonly worstLapNum: number;
  readonly avgLap: number;
  readonly finishedAt: number;
}

export interface RaceState {
  readonly phase: RacePhase;
  readonly targetLaps: number;
  readonly player: string;
  readonly carUid: string | null;
  /** Timestamp (ms) of the last gate crossing; `null` until the start line is crossed. */
  readonly lastGateAt: number | null;
  /** Completed lap durations in seconds, in order. */
  readonly lapTimes: readonly number[];
  readonly result: RaceResult | null;
}

const DEFAULT_LAPS: LapOption = 10;

export function createRace(): RaceState {
  return {
    phase: "idle",
    targetLaps: DEFAULT_LAPS,
    player: "",
    carUid: null,
    lastGateAt: null,
    lapTimes: [],
    result: null,
  };
}

/** Set up (or re-configure) a race while idle; does not start it. */
export function configureRace(state: RaceState, config: Partial<RaceConfig>): RaceState {
  return {
    ...state,
    targetLaps: config.targetLaps ?? state.targetLaps,
    player: config.player ?? state.player,
    carUid: config.carUid !== undefined ? config.carUid : state.carUid,
  };
}

/** Enter the pre-race countdown (cosmetic; the screen drives the 3·2·1 timer). */
export function beginCountdown(state: RaceState): RaceState {
  return { ...state, phase: "countdown" };
}

/** Arm the race: clear laps and wait for the first gate crossing (the start line). */
export function beginRacing(state: RaceState): RaceState {
  return { ...state, phase: "racing", lastGateAt: null, lapTimes: [], result: null };
}

/**
 * Fold a single gate crossing into the race. No-op unless racing. The first
 * crossing arms the timer; each later crossing records a lap and may finish the race.
 */
export function recordGate(state: RaceState, nowMs: number): RaceState {
  if (state.phase !== "racing") return state;

  if (state.lastGateAt == null) {
    return { ...state, lastGateAt: nowMs };
  }

  const lap = (nowMs - state.lastGateAt) / 1000;
  const lapTimes = [...state.lapTimes, lap];

  if (lapTimes.length >= state.targetLaps) {
    return {
      ...state,
      phase: "finished",
      lastGateAt: nowMs,
      lapTimes,
      result: summarize(state, lapTimes, nowMs),
    };
  }
  return { ...state, lastGateAt: nowMs, lapTimes };
}

/**
 * Finish early (e.g. the user stops the race). Produces a result from whatever
 * laps were completed; if none, just returns to idle.
 */
export function finishRace(state: RaceState, nowMs: number): RaceState {
  if (state.lapTimes.length === 0) {
    return { ...createRace(), targetLaps: state.targetLaps, player: state.player };
  }
  return { ...state, phase: "finished", result: summarize(state, state.lapTimes, nowMs) };
}

/** Abandon the current race, keeping the chosen length + player for a quick rematch. */
export function abortRace(state: RaceState): RaceState {
  return {
    ...createRace(),
    targetLaps: state.targetLaps,
    player: state.player,
    carUid: state.carUid,
  };
}

/** Seconds elapsed on the in-progress lap, for a live ticking readout. */
export function currentLapElapsed(state: RaceState, nowMs: number): number {
  if (state.phase !== "racing" || state.lastGateAt == null) return 0;
  return Math.max(0, (nowMs - state.lastGateAt) / 1000);
}

function summarize(state: RaceState, lapTimes: readonly number[], finishedAt: number): RaceResult {
  let bestLap = lapTimes[0];
  let bestLapNum = 1;
  let worstLap = lapTimes[0];
  let worstLapNum = 1;
  let totalTime = 0;
  lapTimes.forEach((t, i) => {
    totalTime += t;
    if (t < bestLap) {
      bestLap = t;
      bestLapNum = i + 1;
    }
    if (t > worstLap) {
      worstLap = t;
      worstLapNum = i + 1;
    }
  });
  return {
    player: state.player || "Player 1",
    carUid: state.carUid ?? "Unknown",
    lapCount: lapTimes.length,
    lapTimes: [...lapTimes],
    totalTime,
    bestLap,
    bestLapNum,
    worstLap,
    worstLapNum,
    avgLap: totalTime / lapTimes.length,
    finishedAt,
  };
}
