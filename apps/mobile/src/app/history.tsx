/**
 * History — the durable log of portal sessions (ADR-0006, Phase 3). One session
 * spans a single BLE connection; the persistence bootstrap opens one on connect
 * and closes it on disconnect, recording every car pass in between.
 *
 * History has **no render store**: this screen reads the {@link SessionRepository}
 * straight from {@link getSessionRepository} on focus (a cold list read, not a hot
 * path). When SQLite isn't in the build yet the repo is `null` → empty state.
 */
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useFocusEffect } from 'expo-router';

import { getSessionRepository } from '@/store/persistence/historyAccess';
import type { SessionSummary } from '@/store/persistence/sessionRepository';
import { useSettingsStore } from '@/store/settingsStore';
import { speedUnitLabel } from '@/speed/format';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';
import {
  formatDuration,
  formatMphLabel,
  formatSessionDate,
  passCountLabel,
} from '@/history/format';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);

  const reload = useCallback(() => {
    const repo = getSessionRepository();
    if (!repo) {
      setSessions([]);
      return;
    }
    let active = true;
    repo
      .listSessions()
      .then((s) => active && setSessions(s))
      .catch(() => active && setSessions([]));
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(reload);

  const confirmClear = () => {
    const repo = getSessionRepository();
    if (!repo || (sessions?.length ?? 0) === 0) return;
    Alert.alert('Clear history?', 'This permanently deletes every recorded session and pass.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          repo
            .clear()
            .then(() => setSessions([]))
            .catch(() => {});
        },
      },
    ]);
  };

  const hasSessions = (sessions?.length ?? 0) > 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing(2) }]}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹ Home</Text>
          </Pressable>
        </Link>
        <Text style={styles.title}>History</Text>
        {hasSessions ? (
          <Pressable
            hitSlop={8}
            onPress={confirmClear}
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : (
          <View style={styles.clearPlaceholder} />
        )}
      </View>

      <FlatList
        data={sessions ?? []}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing(6) },
          !hasSessions && styles.listEmpty,
        ]}
        renderItem={({ item }) => <SessionRow session={item} />}
        ListEmptyComponent={<EmptyHistory />}
      />
    </View>
  );
}

function SessionRow({ session }: { session: SessionSummary }) {
  const live = session.endedAt == null;
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const display = { unit: speedUnit, calibration: speedCalibration };
  return (
    <Link href={{ pathname: '/history/[id]', params: { id: String(session.id) } }} asChild>
      <Pressable style={({ pressed }) => [styles.row, live && styles.rowLive, pressed && styles.pressed]}>
        <View style={styles.rowMain}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowDate} numberOfLines={1}>
              {formatSessionDate(session.startedAt)}
            </Text>
            {live && <Text style={styles.liveTag}>● live</Text>}
          </View>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {passCountLabel(session.passCount)}
            {'  ·  '}
            {formatDuration(session.startedAt, session.endedAt)}
          </Text>
        </View>
        <View style={styles.rowStats}>
          <Text style={styles.bestMph}>{formatMphLabel(session.bestMph, display)}</Text>
          <Text style={styles.bestMphUnit}>best {speedUnitLabel(speedUnit)}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

function EmptyHistory() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🏁</Text>
      <Text style={styles.emptyTitle}>No sessions yet</Text>
      <Text style={styles.emptyBody}>
        Connect to your race portal and every car pass is logged here, grouped by session — so
        you can look back at a whole afternoon of racing.
      </Text>
      <Link href="/" asChild>
        <Pressable style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}>
          <Text style={styles.emptyButtonText}>‹ Back to Home</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  back: { paddingVertical: spacing(1), paddingRight: spacing(1) },
  backText: { color: colors.accentBlue, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.heavy, flex: 1 },
  clear: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  clearText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  clearPlaceholder: { width: spacing(1) },
  list: { paddingHorizontal: spacing(5), gap: spacing(3) },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
  },
  rowLive: { borderColor: colors.accent },
  rowMain: { flex: 1, gap: 4 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  rowDate: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold, flexShrink: 1 },
  liveTag: { color: colors.accent, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  rowMeta: { color: colors.textSecondary, fontSize: fontSize.sm },
  rowStats: { alignItems: 'flex-end', gap: 1 },
  bestMph: { color: colors.accent, fontSize: fontSize.lg, fontWeight: fontWeight.heavy },
  bestMphUnit: { color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  empty: { alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(6) },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  emptyBody: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 19 },
  emptyButton: {
    marginTop: spacing(2),
    backgroundColor: colors.surface,
    borderColor: colors.accentBlue,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(5),
  },
  emptyButtonText: { color: colors.accentBlue, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  pressed: { opacity: 0.7 },
});
