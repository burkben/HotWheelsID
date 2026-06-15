/**
 * Race store (Zustand) — wraps the pure {@link raceEngine} with the actions the
 * Race screen drives, and keeps a **session leaderboard** of finished races.
 *
 * Like the portal store, this holds render-worthy state only and imports no BLE
 * or React Native. The leaderboard is in-memory for now (it resets on app
 * restart); ADR-0012 records the seam where a persistence adapter (`expo-sqlite`,
 * Phase 3) will later make results durable without touching this reducer.
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
  clearLeaderboard: () => void;
}

function rankInsert(board: RaceResult[], result: RaceResult): RaceResult[] {
  return [...board, result]
    .sort((a, b) => a.totalTime - b.totalTime)
    .slice(0, MAX_LEADERBOARD);
}

export const useRaceStore = create<RaceStore>((set) => ({
  race: createRace(),
  leaderboard: [],

  configure: (config) => set((s) => ({ race: configureRace(s.race, config) })),
  startCountdown: () => set((s) => ({ race: beginCountdown(s.race) })),
  startRacing: () => set((s) => ({ race: beginRacing(s.race) })),

  gate: (nowMs = Date.now()) =>
    set((s) => {
      const race = recordGate(s.race, nowMs);
      const justFinished = race.phase === "finished" && s.race.phase !== "finished" && race.result;
      return justFinished
        ? { race, leaderboard: rankInsert(s.leaderboard, race.result!) }
        : { race };
    }),

  stop: (nowMs = Date.now()) =>
    set((s) => {
      const race = finishRace(s.race, nowMs);
      const justFinished = race.phase === "finished" && s.race.phase !== "finished" && race.result;
      return justFinished
        ? { race, leaderboard: rankInsert(s.leaderboard, race.result!) }
        : { race };
    }),

  abort: () => set((s) => ({ race: abortRace(s.race) })),
  clearLeaderboard: () => set({ leaderboard: [] }),
}));
