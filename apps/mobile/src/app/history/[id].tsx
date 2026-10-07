/**
 * History session detail — every pass recorded during one portal session
 * (ADR-0006). Reads the {@link SessionRepository} on focus by the `id` route
 * param (no render store). Each pass cross-links to the car's Garage detail and
 * shows the car's nickname when the Garage knows it, else the shortened UID.
 * Redline layout (no mockup): SPEC §4.9 "History detail".
 */
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { LinkPressable } from '@/components/LinkPressable';
import { RText, ScreenHeader, SectionHeader, StatCell, StatRow } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { spokenUnit } from '@/components/redline/readoutPresentation';
import { SpeedTrace } from '@/components/telemetry/SpeedTrace';
import { useGarageStore } from '@/store/garageStore';
import { getSessionRepository } from '@/store/persistence/historyAccess';
import type { SessionPass, SessionSummary } from '@/store/persistence/sessionRepository';
import { useSettingsStore } from '@/store/settingsStore';
import { speedUnitLabel, type SpeedDisplay } from '@/speed/format';
import { sessionShareText } from '@/share/summary';
import { carLabel, shortUid } from '@/garage/format';
import { useLayout } from '@/layout/useLayout';
import { colorsR, fontR } from '@/theme/tokens';
import { formatClock, formatMphLabel, formatPassMph } from '@/history/format';
import { dateTab, formatStartTime, sessionLength } from '@/history/heat';

/** Whole-session charts keep bars legible on a phone. */
const MAX_BARS = 60;

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const layout = useLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);

  const cars = useGarageStore((s) => s.cars);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const speedDisplay = { unit: speedUnit, calibration: speedCalibration };
  const unit = speedUnitLabel(speedUnit).toUpperCase();
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [passes, setPasses] = useState<SessionPass[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(() => {
    const repo = getSessionRepository();
    setNow(Date.now());
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
    if (!uid) return 'Unknown car';
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

  const list = useMemo(() => passes ?? [], [passes]);
  const fastestId = useMemo(() => list.reduce<SessionPass | null>((best, p) => (p.scaleMph > (best?.scaleMph ?? 0) ? p : best), null)?.id, [list]);
  const tab = session ? dateTab(session.startedAt) : null;
  const live = session?.endedAt === null;
  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/history'));

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.topRow}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back to History" style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Svg {...decorative} width={20} height={20} viewBox="0 0 24 24">
            <Path d="M15 5l-7 7 7 7" stroke={colorsR.electric} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <RText style={styles.link}>History</RText>
        </Pressable>
        {canShare && (
          <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Share session" style={({ pressed }) => [styles.share, pressed && styles.pressed]}>
            <RText style={styles.link}>Share</RText>
          </Pressable>
        )}
      </View>
      <ScreenHeader
        title={tab ? `${tab.month} ${tab.day}` : 'Session'}
        subtitle={session ? `${formatStartTime(session.startedAt)}${live ? ' · live' : ''}` : undefined}
      />
      {session && (
        <StatRow>
          <StatCell label="PASSES" value={String(session.passCount)} />
          <StatCell label="DURATION" value={sessionLength(session.startedAt, session.endedAt, now).replace(' so far', '')} unit={live ? 'SO FAR' : undefined} />
          <StatCell
            label="BEST"
            value={formatMphLabel(session.bestMph, speedDisplay)}
            unit={unit}
            color={colorsR.caution}
            accent={colorsR.caution}
            accessibilityLabel={session.bestMph > 0 ? `best ${formatMphLabel(session.bestMph, speedDisplay)} scale ${spokenUnit(unit)}` : 'no best speed'}
          />
        </StatRow>
      )}
      {list.length > 0 && (
        <View style={styles.chart}>
          <SectionHeader title="Speed" count={list.length > MAX_BARS ? `LAST ${MAX_BARS}` : undefined} />
          <SpeedTrace
            // The repository returns newest first; bars read oldest → newest.
            values={list.map((p) => p.scaleMph).reverse()}
            sampleKeys={list.map((p) => p.id).reverse()}
            display={speedDisplay}
            limit={Math.max(14, Math.min(MAX_BARS, list.length))}
          />
        </View>
      )}
      {list.length > 0 && <SectionHeader title="Passes" count={list.length} />}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
      <FlatList
        data={list}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={[
          styles.list,
          { maxWidth: layout.contentMaxWidth, paddingBottom: insets.bottom + 24 },
        ]}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          // Newest first, numbered from the session's first pass.
          <PassRow pass={item} index={list.length - index} name={nameFor(item.carUid)} fastest={item.id === fastestId} unit={unit} display={speedDisplay} />
        )}
        ListEmptyComponent={passes ? <RText style={styles.empty}>No passes were recorded in this session.</RText> : null}
      />
    </View>
  );
}

function PassRow({ pass, index, name, fastest, unit, display }: {
  pass: SessionPass;
  index: number;
  name: string;
  fastest: boolean;
  unit: string;
  display: SpeedDisplay;
}) {
  const mph = formatPassMph(pass.scaleMph, display);
  const label = `Pass ${index}, ${formatClock(pass.at)}, ${name}, ${mph} scale ${spokenUnit(unit)}${fastest ? ', fastest' : ''}`;
  const body = (
    <View style={[styles.row, fastest && styles.rowFastest]}>
      <View {...decorative} style={[styles.num, fastest && { backgroundColor: colorsR.electric }]}>
        <RText variant="wordmark" style={[styles.numText, fastest && { color: colorsR.asphalt }]}>{index}</RText>
      </View>
      <View style={styles.rowMain}>
        <RText variant="lapTime" style={styles.time}>{formatClock(pass.at)}</RText>
        <RText variant="bodySmall" numberOfLines={1} style={styles.car}>{name}</RText>
      </View>
      {fastest && <RText variant="chip" style={styles.fastest}>FASTEST</RText>}
      <View style={styles.speed}>
        <RText variant="statValue" style={[styles.mph, fastest && { color: colorsR.electric }]}>{mph}</RText>
        <RText variant="eyebrow" style={styles.unit}>{unit}</RText>
      </View>
    </View>
  );

  if (!pass.carUid) return <View accessible accessibilityLabel={label}>{body}</View>;
  return (
    <Link href={{ pathname: '/garage/[uid]', params: { uid: pass.carUid } }} asChild>
      <LinkPressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Opens car details" contentStyle={({ pressed }) => [pressed && styles.pressed]}>{body}</LinkPressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  list: { paddingHorizontal: 16, gap: 2, width: '100%', alignSelf: 'center' },
  headerBlock: { gap: 14, marginBottom: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: -4 },
  back: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  share: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  link: { fontFamily: fontR.bodySemi, fontSize: 16, color: colorsR.electric },
  pressed: { opacity: 0.7 },
  chart: { backgroundColor: colorsR.pitLane, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colorsR.pitLane, paddingRight: 12 },
  rowFastest: { borderWidth: 1, borderColor: colorsR.electric },
  num: { width: 42, alignSelf: 'stretch', backgroundColor: colorsR.gridBox, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 20, lineHeight: 22, letterSpacing: 0 },
  rowMain: { flex: 1, minWidth: 0 },
  time: { fontSize: 16, lineHeight: 19 },
  car: { fontSize: 13, lineHeight: 17, color: colorsR.inkSecondary },
  fastest: { fontSize: 10, lineHeight: 12, color: colorsR.electric },
  speed: { alignItems: 'flex-end', minWidth: 52 },
  mph: { fontSize: 20, lineHeight: 22 },
  unit: { fontFamily: fontR.hud, fontSize: 10, lineHeight: 12, letterSpacing: 1, color: colorsR.inkMuted },
  empty: { color: colorsR.inkSecondary, textAlign: 'center', marginTop: 32 },
});
