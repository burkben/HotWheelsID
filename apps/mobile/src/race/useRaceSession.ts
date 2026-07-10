import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";

import { useSettingsStore } from "../store/settingsStore";
import { usePortalStore, type Pass } from "../store/portalStore";
import { getActiveTransportControls } from "../transport/active";
import { currentLapElapsed, type RaceState } from "./raceEngine";
import {
  countdownAnnouncement,
  finishAnnouncement,
  lapAnnouncement,
} from "./presentation";

const COUNTDOWN_STEP_MS = 800;

export function raceHaptic(action: () => Promise<unknown>): void {
  if (Platform.OS !== "web" && useSettingsStore.getState().haptics) {
    action().catch(() => {});
  }
}

export interface UseRaceSessionOptions {
  readonly race: RaceState;
  readonly passes: readonly Pass[];
  readonly reduceMotion: boolean;
  readonly nextRacerName: string | null;
  readonly gate: (nowMs?: number) => void;
  readonly startRacing: () => void;
}

export function useRaceSession({
  race,
  passes,
  reduceMotion,
  nextRacerName,
  gate,
  startRacing,
}: UseRaceSessionOptions) {
  const phase = race.phase;
  const lastSeenPassId = useRef(0);
  const [count, setCount] = useState(3);
  const pulse = useRef(new Animated.Value(1)).current;
  const [now, setNow] = useState(() => Date.now());
  const [webAnnouncement, setWebAnnouncement] = useState<string | null>(
    Platform.OS === "web" ? "" : null,
  );
  const announce = useCallback((message: string) => {
    if (Platform.OS === "web") {
      setWebAnnouncement(message);
    } else {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, []);

  useEffect(() => {
    if (phase === "racing") {
      const latest = usePortalStore.getState().passes[0];
      lastSeenPassId.current = latest ? latest.id : 0;
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "racing") return;
    const fresh: Pass[] = [];
    for (const pass of passes) {
      if (pass.id <= lastSeenPassId.current) break;
      fresh.push(pass);
    }
    if (fresh.length === 0) return;
    lastSeenPassId.current = fresh[0].id;
    for (let index = fresh.length - 1; index >= 0; index -= 1) {
      gate(fresh[index].at);
    }
  }, [gate, passes, phase]);

  useEffect(() => {
    if (phase !== "countdown") return;
    let nextCount = 3;
    setCount(nextCount);
    announce(countdownAnnouncement(nextCount));
    raceHaptic(() => Haptics.selectionAsync());
    const interval = setInterval(() => {
      nextCount -= 1;
      if (nextCount <= 0) {
        clearInterval(interval);
        announce(countdownAnnouncement(0));
        raceHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
        startRacing();
      } else {
        setCount(nextCount);
        announce(countdownAnnouncement(nextCount));
        raceHaptic(() => Haptics.selectionAsync());
      }
    }, COUNTDOWN_STEP_MS);
    return () => clearInterval(interval);
  }, [announce, phase, startRacing]);

  useEffect(() => {
    if (phase !== "countdown" || reduceMotion) return;
    pulse.setValue(1.35);
    Animated.timing(pulse, {
      toValue: 1,
      duration: COUNTDOWN_STEP_MS - 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [count, phase, pulse, reduceMotion]);

  useEffect(() => {
    if (phase !== "racing") return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [phase]);

  const previousLapCount = useRef(0);
  useEffect(() => {
    const lapCount = race.lapTimes.length;
    if (phase === "racing" && lapCount > previousLapCount.current) {
      const lapTime = race.lapTimes[lapCount - 1];
      const priorBest =
        lapCount > 1 ? Math.min(...race.lapTimes.slice(0, lapCount - 1)) : Number.POSITIVE_INFINITY;
      const isBest = lapTime < priorBest;
      announce(lapAnnouncement(lapCount, lapTime, isBest));
      raceHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    }
    previousLapCount.current = lapCount;
  }, [announce, phase, race.lapTimes]);

  const previousPhase = useRef(phase);
  useEffect(() => {
    if (phase === "finished" && previousPhase.current !== "finished" && race.result) {
      announce(finishAnnouncement(race.result, nextRacerName));
      raceHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    }
    previousPhase.current = phase;
  }, [announce, nextRacerName, phase, race.result]);

  const activeControls = getActiveTransportControls();

  return {
    count,
    pulse,
    liveLap: currentLapElapsed(race, now),
    canTriggerDemo: activeControls.triggerPass != null,
    triggerDemoPass: () => activeControls.triggerPass?.(),
    webAnnouncement,
  };
}
