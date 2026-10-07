import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { StatusPillProps } from '@/components/StatusPill';
import { usePortalStatusAction } from '@/components/usePortalStatusAction';
import { Kerb, RaceButton, RText } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { colorsR } from '@/theme/tokens';
import { portalCardPresentation } from './presentation';

const KERB: Record<'connected' | 'searching', readonly [string, string]> = {
  connected: [colorsR.greenFlag, colorsR.asphalt],
  searching: [colorsR.caution, colorsR.asphalt],
};

/**
 * Settings portal card (SPEC §4.11). Same status and connect / retry /
 * confirm-disconnect behaviour as the status chip, via {@link usePortalStatusAction}.
 */
export function PortalCard(props: StatusPillProps) {
  const { status, onPress } = usePortalStatusAction(props);
  const card = portalCardPresentation(status, props.mode === 'demo');
  const ink = card.error ? colorsR.redFlag : card.tone === 'connected' ? colorsR.greenFlag : card.tone === 'searching' ? colorsR.caution : colorsR.inkSecondary;
  return (
    <View style={styles.card}>
      <View {...decorative} style={styles.kerb}>
        {card.tone === 'idle' ? <View style={styles.idleBar} /> : <Kerb height={5} stripe={10} colors={KERB[card.tone]} />}
      </View>
      <Svg {...decorative} width={46} height={46} viewBox="0 0 48 48">
        <Path d="M10 44 V20 C10 11 16 5 24 5 C32 5 38 11 38 20 V44" fill="none" stroke={colorsR.chalk} strokeWidth={4} />
        <Path d="M4 44 H44" stroke={colorsR.flame} strokeWidth={5} />
        <Circle cx={24} cy={12} r={3} fill={colorsR.electric} />
      </Svg>
      <View style={styles.text} accessible accessibilityLabel={`${card.title}. ${status.label}. ${card.hint}`}>
        <RText variant="chip" style={[styles.eyebrow, { color: ink }]}>● {card.eyebrow}</RText>
        <RText variant="carName" style={styles.title}>{card.title}</RText>
        <RText variant="bodySmall" style={styles.hint}>{card.hint}</RText>
      </View>
      {card.action && (
        <RaceButton
          variant="ghost"
          compact
          label={card.action}
          onPress={onPress}
          accessibilityLabel={status.accessibilityLabel}
          accessibilityHint={status.accessibilityHint}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colorsR.pitLane, paddingTop: 16, paddingHorizontal: 14, paddingBottom: 14, overflow: 'hidden' },
  kerb: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  idleBar: { height: 5, backgroundColor: colorsR.steel },
  text: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { fontSize: 11, lineHeight: 13 },
  title: { fontSize: 22, lineHeight: 23 },
  hint: { fontSize: 13, lineHeight: 17, color: colorsR.inkSecondary },
  button: { flexShrink: 0 },
});
