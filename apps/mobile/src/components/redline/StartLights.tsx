import { StyleSheet, View } from 'react-native';

import { colorsR, radiusR } from '@/theme/tokens';
import { decorative } from './decorative';
import { Kerb } from './Patterns';

/** Static lamps. Countdown owns timing/cues and gates any animation. */
export function StartLights({ variant = 'strip', count = variant === 'gantry' ? 3 : 5, lit = 0, go = false, size = variant === 'gantry' ? 58 : 30 }: {
  variant?: 'strip' | 'gantry';
  count?: number;
  lit?: number;
  go?: boolean;
  size?: number;
}) {
  const gantry = variant === 'gantry';
  const pods = Array.from({ length: count }, (_, index) => {
    const on = go || index < lit;
    const color = go ? colorsR.greenFlag : colorsR.redFlag;
    return (
      <View key={index} style={gantry ? styles.podColumn : undefined}>
        {gantry && <View style={styles.hanger} />}
        <View style={gantry ? styles.pod : undefined}>
          {Array.from({ length: gantry ? 2 : 1 }, (_, row) => (
            <View key={row} style={{
              width: size, height: size, borderRadius: radiusR.pill,
              backgroundColor: on ? color : colorsR.lightOff,
              boxShadow: on ? `0 0 ${gantry ? 26 : 14}px ${go ? 'rgba(57,217,138,0.85)' : 'rgba(255,77,94,0.85)'}` : undefined,
            }} />
          ))}
        </View>
      </View>
    );
  });
  return (
    <View {...decorative} style={gantry ? undefined : styles.strip}>
      {gantry && <Kerb height={12} stripe={8} colors={[colorsR.steel, colorsR.trackGrey]} />}
      <View style={[styles.row, { gap: gantry ? 14 : 12 }]}>{pods}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { alignSelf: 'flex-start', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colorsR.asphalt, borderTopWidth: 6, borderTopColor: colorsR.steel },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  podColumn: { flex: 1, alignItems: 'center' },
  hanger: { width: 4, height: 12, backgroundColor: colorsR.steel },
  pod: { width: '100%', alignItems: 'center', borderRadius: radiusR.pod, backgroundColor: colorsR.pitLane, paddingVertical: 14, gap: 12 },
});
