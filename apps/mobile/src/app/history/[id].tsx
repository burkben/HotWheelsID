/**
 * History session detail — every pass recorded during one portal session
 * (ADR-0006). Reads the {@link SessionRepository} on focus by the `id` route
 * param (no render store). Each pass cross-links to the car's Garage detail and
 * shows the car's nickname when the Garage knows it, else the shortened UID.
 */
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useGarageStore } from '@/store/garageStore';
import { getSessionRepository } from '@/store/persistence/historyAccess';
import type { SessionPass, SessionSummary } from '@/store/persistence/sessionRepository';
import { useSettingsStore } from '@/store/settingsStore';
import { speedUnitLabel } from '@/speed/format';
import { sessionShareText } from '@/share/summary';
import { carLabel, shortUid } from '@/garage/format';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';
import {
  formatClock,
  formatDuration,
  formatMphLabel,
  formatPassMph,
  formatSessionDate,
  passCountLabel,
} from '@/history/format';

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);

  const cars = useGarageStore((s) => s.cars);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const speedDisplay = { unit: speedUnit, calibration: speedCalibration };
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [passes, setPasses] = useState<SessionPass[] | null>(null);

  const reload = useCallback(() => {
    const repo = getSessionRepository();
    if (!repo || Number.isNaN(sessionId)) {
      setPasses([]);
      return;
    }
    let active = true;
    Promise.all([repo.listSessions(), repo.passesForSession(sessionId)])
      .then(([sessions, p]) => {
        if (!active) return;
        setSession(sessions.find((s) => s.id === sessionId) ?? null);
        setPasses(p);
      })
      .catch(() => active && setPasses([]));
    return () => {
      active = false;
    };
  }, [sessionId]);

  useFocusEffect(reload);

  const nameFor = (uid: string | null): string => {
    if (!uid) return '—';
    const car = cars.find((c) => c.uid === uid);
    return car ? carLabel(car) : shortUid(uid);
  };

  const canShare = !!session && !!passes && passes.length > 0;
  const onShare = () => {
    if (!session || !passes) return;
    const carNames = new Map(
      cars
        .filter((c) => c.name?.trim())
        .map((c) => [c.uid, c.name!.trim()] as const),
    );
    Share.share({
      message: sessionShareText(session, passes, { display: speedDisplay, carNames }),
    }).catch(() => {});
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing(2) }]}>
      <View style={styles.header}>
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>‹ History</Text>
        </Pressable>
        <View style={styles.headerSpacer} />
        {canShare && (
          <Pressable
            hitSlop={12}
            onPress={onShare}
            style={({ pressed }) => [styles.share, pressed && styles.pressed]}
          >
            <Text style={styles.shareText}>Share</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryDate}>
          {session ? formatSessionDate(session.startedAt) : 'Session'}
        </Text>
        {session && (
          <Text style={styles.summaryMeta}>
            {passCountLabel(session.passCount)}
            {'  ·  '}
            {formatDuration(session.startedAt, session.endedAt)}
            {'  ·  '}
            best {formatMphLabel(session.bestMph, speedDisplay)} {speedUnitLabel(speedUnit)}
          </Text>
        )}
      </View>

      <FlatList
        data={passes ?? []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing(6) },
          (passes?.length ?? 0) === 0 && styles.listEmpty,
        ]}
        renderItem={({ item }) => <PassRow pass={item} name={nameFor(item.carUid)} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No passes were recorded in this session.</Text>
        }
      />
    </View>
  );
}

function PassRow({ pass, name }: { pass: SessionPass; name: string }) {
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const body = (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.mph}>
          {formatPassMph(pass.scaleMph, { unit: speedUnit, calibration: speedCalibration })}
        </Text>
        <Text style={styles.mphUnit}>{speedUnitLabel(speedUnit)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.carName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.time}>{formatClock(pass.at)}</Text>
      </View>
    </View>
  );

  if (!pass.carUid) return body;
  return (
    <Link href={{ pathname: '/garage/[uid]', params: { uid: pass.carUid } }} asChild>
      <Pressable style={({ pressed }) => [pressed && styles.pressed]}>{body}</Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(2),
  },
  back: { paddingVertical: spacing(1), paddingRight: spacing(1) },
  backText: { color: colors.accentBlue, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  headerSpacer: { flex: 1 },
  share: { paddingVertical: spacing(1), paddingLeft: spacing(1) },
  shareText: { color: colors.accent, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  summary: { paddingHorizontal: spacing(5), paddingBottom: spacing(3), gap: 4 },
  summaryDate: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
  summaryMeta: { color: colors.textSecondary, fontSize: fontSize.sm },
  list: { paddingHorizontal: spacing(5), gap: spacing(2) },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
  },
  rowLeft: { flexDirection: 'row', alignItems: 'baseline', gap: spacing(1) },
  mph: { color: colors.accent, fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
  mphUnit: { color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  carName: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.bold, maxWidth: 180 },
  time: { color: colors.textMuted, fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  empty: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', paddingHorizontal: spacing(6) },
  pressed: { opacity: 0.7 },
});
