/**
 * Race sound cues — pure logic (Phase 5 sound).
 *
 * This module holds only the *identity* of each cue and the pure decision of
 * which one a lap should play. The actual audio playback (and the `require()` of
 * the WAV assets, which only Metro can resolve) lives in {@link ./player}, so
 * this file stays Node-testable and free of native/asset imports — exactly the
 * pure-core / impure-edge split the race engine and BLE layer use.
 */

/** Every distinct sound the race screen can play. Mirrors the haptic call sites. */
export type SoundCue = "countdownTick" | "countdownGo" | "lap" | "bestLap" | "finish";

export const SOUND_CUES: readonly SoundCue[] = [
  "countdownTick",
  "countdownGo",
  "lap",
  "bestLap",
  "finish",
] as const;

/**
 * Which cue to play for the lap that just closed.
 *
 * Returns `"bestLap"` only when the most recent lap is strictly faster than
 * every earlier lap (so lap 1 — which has nothing to beat — is always a plain
 * `"lap"`). Otherwise returns `"lap"`. `lapTimes` is the full ordered list of
 * completed lap durations, newest last.
 */
export function nextLapCue(lapTimes: readonly number[]): SoundCue {
  const n = lapTimes.length;
  if (n < 2) return "lap";
  const last = lapTimes[n - 1];
  const prevBest = Math.min(...lapTimes.slice(0, n - 1));
  return last < prevBest ? "bestLap" : "lap";
}
