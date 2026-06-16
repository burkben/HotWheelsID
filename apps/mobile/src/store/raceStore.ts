/**
 * Race store (Zustand) — wraps the pure {@link raceEngine} with the actions the
 * Race screen drives, and keeps a **session leaderboard** of finished races.
 *
 * Like the portal store, this holds render-worthy state only and imports no BLE
 * or React Native. The in-memory leaderboard stays the fast render source of
 * truth; durability is layered on through {@link setRacePersistence} sinks that
 * the app bootstrap wires to an `expo-sqlite` repository (ADR-0006, Phase 3).
 * Tests and CI leave the sinks unset, so this reducer runs under plain Node.
 */
import { create } from "zustand";

import {
  abortRace,
  beginCountdown,
  beginRacing,
  configureRace,
  createRace,
  finishRace,
  recordGate,
  type RaceConfig,
  type RaceResult,
  type RaceState,
} from "../race/raceEngine";

/** Most-recent session results kept for the on-screen leaderboard. */
const MAX_LEADERBOARD = 20;

/**
 * Optional durability hooks. The store calls these (when set by the app
 * bootstrap) so finished races are persisted and clears propagate to storage.
 * Left unset in tests/CI, keeping the reducer pure. Mirrors the module-level
 * handoff used by `transport/active.ts`.
 */
export interface RacePersistence {
  onResult?: (result: RaceResult) => void;
  onClear?: () => void;
}

let persistence: RacePersistence = {};

export function setRacePersistence(next: RacePersistence | null): void {
  persistence = next ?? {};
}

export interface RaceStore {
  race: RaceState;
  /** Finished races this session, fastest total time first. */
  leaderboard: RaceResult[];

  configure: (config: Partial<RaceConfig>) => void;
  startCountdown: () => void;
  startRacing: () => void;
  /** Record a gate crossing (defaults to now); records the result if it finishes. */
  gate: (nowMs?: number) => void;
  /** Stop early; banks a result if any laps were completed. */
  stop: (nowMs?: number) => void;
  /** Abandon the race, keeping length + player for a rematch. */
  abort: () => void;
  /** Replace the leaderboard from durable storage (called once on startup). */
  hydrate: (results: RaceResult[]) => void;
  clearLeaderboard: () => void;
}

function rankAll(results: RaceResult[]): RaceResult[] {
  return [...results].sort((a, b) => a.totalTime - b.totalTime).slice(0, MAX_LEADERBOARD);
}

function rankInsert(board: RaceResult[], result: RaceResult): RaceResult[] {
  return rankAll([...board, result]);
}

export const useRaceStore = create<RaceStore>((set) => ({
  race: createRace(),
  leaderboard: [],

  configure: (config) => set((s) => ({ race: configureRace(s.race, config) })),
  startCountdown: () => set((s) => ({ race: beginCountdown(s.race) })),
  startRacing: () => set((s) => ({ race: beginRacing(s.race) })),

  gate: (nowMs = Date.now()) => {
    let finished: RaceResult | null = null;
    set((s) => {
      const race = recordGate(s.race, nowMs);
      const justFinished = race.phase === "finished" && s.race.phase !== "finished" && race.result;
      if (!justFinished) return { race };
      finished = race.result!;
      return { race, leaderboard: rankInsert(s.leaderboard, race.result!) };
    });
    if (finished) persistence.onResult?.(finished);
  },

  stop: (nowMs = Date.now()) => {
    let finished: RaceResult | null = null;
    set((s) => {
      const race = finishRace(s.race, nowMs);
      const justFinished = race.phase === "finished" && s.race.phase !== "finished" && race.result;
      if (!justFinished) return { race };
      finished = race.result!;
      return { race, leaderboard: rankInsert(s.leaderboard, race.result!) };
    });
    if (finished) persistence.onResult?.(finished);
  },

  abort: () => set((s) => ({ race: abortRace(s.race) })),
  hydrate: (results) => set({ leaderboard: rankAll(results) }),
  clearLeaderboard: () => {
    set({ leaderboard: [] });
    persistence.onClear?.();
  },
}));
