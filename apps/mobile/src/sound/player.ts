/**
 * Race sound playback — the impure edge (Phase 5 sound).
 *
 * Mirrors the haptics seam in `race.tsx`: a tiny `playCue()` that is a no-op on
 * web, when the user has turned sound off, or when the native `expo-audio`
 * module isn't in the running binary yet (same graceful-degrade `require()`
 * pattern the SQLite bootstrap uses — sound simply activates after a native
 * rebuild, and everything else keeps working until then).
 *
 * Players are created lazily and cached per cue, then restarted with
 * `seekTo(0); play()` (the expo-audio replay idiom) so rapid laps re-fire cleanly.
 */
import { Platform } from "react-native";

import { useSettingsStore } from "@/store/settingsStore";

import type { SoundCue } from "./cues";

// Metro resolves these `require()`s to asset module ids at build time. Kept out
// of the pure `cues.ts` so Node tests never try to load a .wav.
const CUE_ASSETS: Record<SoundCue, number> = {
  countdownTick: require("../../assets/sounds/countdown_tick.wav"),
  countdownGo: require("../../assets/sounds/countdown_go.wav"),
  lap: require("../../assets/sounds/lap.wav"),
  bestLap: require("../../assets/sounds/best_lap.wav"),
  finish: require("../../assets/sounds/finish.wav"),
};

type AudioModule = typeof import("expo-audio");
type AudioPlayer = ReturnType<AudioModule["createAudioPlayer"]>;

// `undefined` = not yet tried, `null` = unavailable in this binary.
let audio: AudioModule | null | undefined;
const players: Partial<Record<SoundCue, AudioPlayer>> = {};

function loadAudio(): AudioModule | null {
  if (audio !== undefined) return audio;
  try {
    audio = require("expo-audio") as AudioModule;
  } catch {
    audio = null; // native module not in this build — degrade to silence
  }
  return audio;
}

function playerFor(cue: SoundCue): AudioPlayer | null {
  const mod = loadAudio();
  if (!mod) return null;
  let player = players[cue];
  if (!player) {
    player = mod.createAudioPlayer(CUE_ASSETS[cue]);
    players[cue] = player;
  }
  return player;
}

/**
 * Play one cue, gated exactly like the `haptic()` helper: skipped on web and
 * whenever the `sound` setting is off. Restarting an already-playing cue is
 * fine (laps can close in quick succession). All failures are swallowed —
 * audio is never allowed to interrupt a race.
 */
export function playCue(cue: SoundCue): void {
  if (Platform.OS === "web") return;
  if (!useSettingsStore.getState().sound) return;
  const player = playerFor(cue);
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    /* ignore — a missed sound never breaks the race */
  }
}
