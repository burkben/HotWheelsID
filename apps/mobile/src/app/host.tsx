import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatRaceTime, raceHostSnapshot } from '@/race/hostDisplay';
import { usePortalStore } from '@/store/portalStore';
import { useRaceStore } from '@/store/raceStore';
import { colors, fontWeight, radius, spacing } from '@/theme/tokens';

const WIDE_LEADERBOARD_LIMIT = 8;
const NARROW_LEADERBOARD_LIMIT = 5;

export default function HostScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const race = useRaceStore((state) => state.race);
  const leaderboard = useRaceStore((state) => state.leaderboard);
  const connection = usePortalStore((state) => state.connection);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (race.phase !== 'racing' || race.lastGateAt == null) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [race.phase, race.lastGateAt]);

  const snapshot = raceHostSnapshot(race, now);
  const wide = width >= 760;
  const leaderboardLimit = wide ? WIDE_LEADERBOARD_LIMIT : NARROW_LEADERBOARD_LIMIT;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing(3),
          paddingBottom: insets.bottom + spacing(5),
          paddingLeft: insets.left + spacing(5),
          paddingRight: insets.right + spacing(5),
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>REDLINE ID</Text>
          <Text style={styles.mode}>Race night host</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.connection}>
            <View
              style={[
                styles.connectionDot,
                {
                  backgroundColor:
                    connection === 'connected'
                      ? colors.ok
                      : connection === 'connecting'
                        ? colors.warn
                        : colors.idle,
                },
              ]}
            />
            <Text style={styles.connectionText}>
              {connection === 'connected' ? 'Portal live' : 'Portal offline'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to race controls"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.exitButton, pressed && styles.pressed]}
          >
            <Text style={styles.exitText}>Race controls</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.columns, !wide && styles.columnsStacked]}>
        <View style={styles.hero}>
          <Text style={styles.phase}>{snapshot.phaseLabel}</Text>
          <Text style={styles.racer} numberOfLines={1} adjustsFontSizeToFit>
            {snapshot.racer}
          </Text>

          <View style={styles.clock}>
            <Text style={styles.clockLabel}>{snapshot.primaryLabel}</Text>
            <Text style={styles.clockValue} numberOfLines={1} adjustsFontSizeToFit>
              {snapshot.primaryValue}
            </Text>
          </View>

          <View style={styles.stats}>
            <HostStat label="Lap" value={snapshot.lap} />
            <HostStat label="Last lap" value={snapshot.lastLap} />
            <HostStat label="Best lap" value={snapshot.bestLap} hot />
          </View>
        </View>

        <View style={styles.board}>
          <Text style={styles.boardTitle}>Leaderboard</Text>
          {leaderboard.length === 0 ? (
            <View style={styles.emptyBoard}>
              <Text style={styles.emptyTitle}>The track is waiting</Text>
              <Text style={styles.emptyText}>Finished races will appear here.</Text>
            </View>
          ) : (
            leaderboard.slice(0, leaderboardLimit).map((result, index) => (
              <View
                key={result.finishedAt}
                style={styles.boardRow}
              >
                <Text style={[styles.rank, index === 0 && styles.top]}>{index + 1}</Text>
                <View style={styles.boardRacer}>
                  <Text style={styles.boardName} numberOfLines={1}>
                    {result.player}
                  </Text>
                  <Text style={styles.boardMeta}>{result.lapCount} laps</Text>
                </View>
                <Text style={[styles.boardTime, index === 0 && styles.top]}>
                  {formatRaceTime(result.totalTime)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function HostStat({ label, value, hot = false }: { label: string; value: string; hot?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, hot && styles.top]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, gap: spacing(5) },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(4),
  },
  brand: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: fontWeight.heavy,
    letterSpacing: 3,
  },
  mode: { color: colors.textPrimary, fontSize: 24, fontWeight: fontWeight.heavy },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  connection: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  connectionDot: { width: 10, height: 10, borderRadius: radius.pill },
  connectionText: { color: colors.textSecondary, fontSize: 13, fontWeight: fontWeight.bold },
  exitButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  exitText: { color: colors.textPrimary, fontSize: 13, fontWeight: fontWeight.bold },
  columns: { flex: 1, flexDirection: 'row', gap: spacing(5) },
  columnsStacked: { flexDirection: 'column' },
  hero: {
    flex: 1.4,
    minHeight: 360,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing(6),
    justifyContent: 'space-between',
    gap: spacing(3),
  },
  phase: {
    color: colors.accentBlue,
    fontSize: 15,
    fontWeight: fontWeight.heavy,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  racer: { color: colors.textPrimary, fontSize: 48, fontWeight: fontWeight.heavy },
  clock: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 130 },
  clockLabel: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  clockValue: {
    color: colors.accent,
    fontSize: 88,
    fontWeight: fontWeight.heavy,
    fontVariant: ['tabular-nums'],
  },
  stats: { flexDirection: 'row', gap: spacing(3) },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing(3),
    alignItems: 'center',
    gap: spacing(1),
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: fontWeight.heavy,
    fontVariant: ['tabular-nums'],
  },
  board: {
    flex: 1,
    minHeight: 300,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing(5),
  },
  boardTitle: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: fontWeight.heavy,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing(3),
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: spacing(2.5),
  },
  rank: {
    width: 28,
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: fontWeight.heavy,
    textAlign: 'center',
  },
  boardRacer: { flex: 1 },
  boardName: { color: colors.textPrimary, fontSize: 18, fontWeight: fontWeight.bold },
  boardMeta: { color: colors.textMuted, fontSize: 12 },
  boardTime: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: fontWeight.heavy,
    fontVariant: ['tabular-nums'],
  },
  top: { color: colors.accent },
  emptyBoard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing(1) },
  emptyTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: fontWeight.bold },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  pressed: { opacity: 0.7 },
});
