import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import Svg, { Line, Polyline } from 'react-native-svg';

import { LinkPressable } from '@/components/LinkPressable';
import { RText } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { spokenUnit } from '@/components/redline/readoutPresentation';
import type { SessionSummary } from '@/store/persistence/sessionRepository';
import { colorsR, fontR } from '@/theme/tokens';
import { passCountLabel } from '../format';
import { dateTab, formatStartTime, sessionLength } from '../heat';
import { useSessionSpark } from '../sparkCache';

export const TICKET_HEIGHT = 76;

/** Session "ticket" row (History.dc.html): date tab, perforation, meta, sparkline, best. */
export function SessionTicket({ session, now, best, unit, record, spark: sparkOverride }: {
  session: SessionSummary;
  now: number;
  /** Formatted best speed, or an em dash. */
  best: string;
  unit: string;
  record: boolean;
  /** Fixture points; undefined loads them lazily from the repository. */
  spark?: string | null;
}) {
  const live = session.endedAt == null;
  const tab = dateTab(session.startedAt);
  const time = formatStartTime(session.startedAt);
  const meta = `${passCountLabel(session.passCount)} · ${sessionLength(session.startedAt, session.endedAt, now)}`;
  const loaded = useSessionSpark(session.id, sparkOverride === undefined ? session.passCount : 0);
  const spark = sparkOverride === undefined ? loaded : sparkOverride;
  const accent = record ? colorsR.caution : colorsR.flame;
  const label = [
    `${tab.month[0]}${tab.month.slice(1).toLowerCase()} ${Number(tab.day)}, ${time}`,
    live ? 'live' : null,
    meta,
    best === '—' ? 'no best speed' : `best ${best} scale ${spokenUnit(unit)}`,
    record ? 'all-time best' : null,
  ].filter(Boolean).join(', ');
  return (
    <Link href={{ pathname: '/history/[id]', params: { id: String(session.id) } }} asChild>
      <LinkPressable accessibilityRole="button" accessibilityLabel={label} contentStyle={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        {live && <View {...decorative} style={styles.liveBar} />}
        <View style={styles.tab}>
          <RText variant="wordmark" style={styles.tabDay}>{tab.day}</RText>
          <RText variant="eyebrow" style={styles.tabMonth}>{tab.month}</RText>
        </View>
        <Svg {...decorative} width={2} height={TICKET_HEIGHT}>
          <Line x1={1} y1={0} x2={1} y2={TICKET_HEIGHT} stroke={colorsR.asphalt} strokeWidth={2} strokeDasharray="4 3" />
        </Svg>
        <View style={styles.main}>
          <View style={styles.timeLine}>
            <RText variant="lapTime" style={styles.time}>{time}</RText>
            {live && (
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <RText variant="chip" style={styles.liveText}>LIVE</RText>
              </View>
            )}
          </View>
          <RText variant="bodySmall" numberOfLines={2} style={styles.meta}>{meta}</RText>
        </View>
        <View {...decorative} style={styles.spark}>
          {spark && (
            <Svg width={58} height={TICKET_HEIGHT} viewBox="0 0 58 24" preserveAspectRatio="none">
              <Polyline points={spark} fill="none" stroke={accent} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            </Svg>
          )}
        </View>
        <View style={styles.best}>
          <RText variant="statValue" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.bestValue, record && { color: colorsR.caution }]}>{best}</RText>
          <RText variant="eyebrow" style={styles.bestCaption}>BEST {unit}</RText>
        </View>
      </LinkPressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, minHeight: TICKET_HEIGHT, flexDirection: 'row', alignItems: 'stretch', backgroundColor: colorsR.pitLane, overflow: 'hidden' },
  pressed: { opacity: 0.85 },
  liveBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colorsR.greenFlag },
  // Drawn after the live bar so the bar starts at the perforation, as in the source.
  tab: { width: 58, backgroundColor: colorsR.gridBox, alignItems: 'center', justifyContent: 'center' },
  tabDay: { fontSize: 28, lineHeight: 28, letterSpacing: 0 },
  tabMonth: { fontFamily: fontR.hud, fontSize: 10, lineHeight: 12, letterSpacing: 1.5, color: colorsR.inkSecondary },
  main: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center', gap: 3 },
  timeLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontSize: 16, lineHeight: 20 },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colorsR.greenFlag },
  liveText: { fontSize: 10, lineHeight: 12, color: colorsR.greenFlag },
  meta: { fontSize: 13, lineHeight: 17, color: colorsR.inkSecondary },
  spark: { width: 58 },
  best: { width: 70, paddingRight: 12, alignItems: 'flex-end', justifyContent: 'center' },
  bestValue: { fontSize: 24, lineHeight: 26 },
  bestCaption: { fontFamily: fontR.hud, fontSize: 10, lineHeight: 12, letterSpacing: 1, color: colorsR.inkMuted },
});
