/**
 * Trophy-unlocked banner (SPEC §4.10 "Unlock moment"). Observes the achievements
 * store, which stamps exactly the ids `newlyUnlockedIds()` returns, and shows one
 * banner per new unlock: drop in, hold 2.5 s, rise out. Static under reduce motion.
 * Hydrating saved unlocks at startup is not celebrated. The TV stage is left alone.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ACHIEVEMENTS, achievementById } from '../catalog';
import { trophyIcon } from '../icons';
import { unlockedSince } from '../trophyPresentation';
import { Medallion, RText } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { useAchievementsStore } from '@/store/achievementsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colorsR } from '@/theme/tokens';

export const TROPHY_BANNER_HOLD_MS = 2500;
const EXIT_MS = 260;
const ENTER_MS = 500;
const OFFSCREEN = -160;

export function TrophyUnlockBanner() {
  const [queue, setQueue] = useState<string[]>([]);
  useEffect(
    () => useAchievementsStore.subscribe((next, prev) => {
      const fresh = unlockedSince(prev, next, ACHIEVEMENTS);
      if (fresh.length > 0) setQueue((q) => [...q, ...fresh]);
    }),
    [],
  );
  const pathname = usePathname();
  const current = queue[0];
  // Keyed so each unlock gets a fresh mount, timer and announcement.
  if (!current || pathname === '/tv') return null;
  return <Banner key={`${current}-${queue.length}`} id={current} onDone={() => setQueue((q) => q.slice(1))} />;
}

function Banner({ id, onDone }: { id: string; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useTelemetryMotion();
  const def = achievementById(id);
  const y = useSharedValue(reduceMotion ? 0 : OFFSCREEN);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  useEffect(() => {
    y.set(reduceMotion ? 0 : withSequence(
      withSpring(0, { damping: 16, stiffness: 180 }),
      withDelay(TROPHY_BANNER_HOLD_MS, withTiming(OFFSCREEN, { duration: EXIT_MS })),
    ));
  }, [reduceMotion, y]);

  useEffect(() => {
    if (!def) {
      onDone();
      return;
    }
    if (Platform.OS !== 'web' && useSettingsStore.getState().haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    AccessibilityInfo.announceForAccessibility(`Trophy unlocked: ${def.title}`);
    const timer = setTimeout(onDone, reduceMotion ? TROPHY_BANNER_HOLD_MS : ENTER_MS + TROPHY_BANNER_HOLD_MS + EXIT_MS);
    return () => clearTimeout(timer);
    // Runs once per mount; the parent remounts for each unlock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!def) return null;
  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }, style]}>
      <Pressable
        onPress={() => {
          onDone();
          router.navigate('/achievements');
        }}
        accessibilityRole="button"
        accessibilityLabel={`Trophy unlocked: ${def.title}. ${def.description}`}
        accessibilityHint="Opens the trophy case"
        style={({ pressed }) => [styles.banner, pressed && { opacity: 0.9 }]}
        testID="trophy-unlock-banner"
      >
        <View {...decorative} style={styles.bar} />
        <Medallion unlocked icon={trophyIcon(def.id)} size={40} />
        <View style={styles.text}>
          <RText variant="chip" style={styles.eyebrow}>TROPHY UNLOCKED</RText>
          <RText variant="carName" numberOfLines={1} style={styles.title}>{def.title}</RText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 100 },
  banner: {
    width: '100%', maxWidth: 420, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colorsR.pitLane, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colorsR.caution },
  text: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 11, lineHeight: 13, color: colorsR.caution },
  title: { fontSize: 22, lineHeight: 24 },
});
