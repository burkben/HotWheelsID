import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { StyleSheet, View } from 'react-native';

import { colorsR, radiusR } from '@/theme/tokens';
import { decorative } from './decorative';
import { Kerb } from './Patterns';

/** Countdown owns timing/cues. Optional glow transitions use the shared motion gate. */
export function StartLights({ variant = 'strip', count = variant === 'gantry' ? 3 : 5, lit = 0, go = false, size = variant === 'gantry' ? 58 : 30, animate = false, reduceMotion = false }: {
  variant?: 'strip' | 'gantry';
  count?: number;
  lit?: number;
  go?: boolean;
  size?: number;
  animate?: boolean;
  reduceMotion?: boolean;
}) {
  const gantry = variant === 'gantry';
  const pods = Array.from({ length: count }, (_, index) => {
    const on = go || index < lit;
    const color = go ? colorsR.greenFlag : colorsR.redFlag;
    return (
      <View key={index} style={gantry ? styles.podColumn : undefined}>
        <View style={gantry ? styles.pod : undefined}>
          {Array.from({ length: gantry ? 2 : 1 }, (_, row) => (
            <Lamp key={row} size={size} on={on} color={color} go={go} gantry={gantry} animate={animate} reduceMotion={reduceMotion} />
          ))}
        </View>
      </View>
    );
  });
  return (
    <View {...decorative} style={gantry ? undefined : styles.strip}>
      {gantry && <Kerb height={12} stripe={8} colors={[colorsR.steel, colorsR.trackGrey]} />}
      {gantry && <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 10 }}>{Array.from({ length: count }, (_, index) => <View key={index} style={styles.hanger} />)}</View>}
      <View style={[styles.row, { gap: gantry ? 14 : 12 }]}>{pods}</View>
    </View>
  );
}

function Lamp({ size, on, color, go, gantry, animate, reduceMotion: override }: { size: number; on: boolean; color: string; go: boolean; gantry: boolean; animate: boolean; reduceMotion: boolean }) {
  const { reduceMotion } = useTelemetryMotion();
  const glow = useSharedValue(animate && !reduceMotion && !override ? 0 : on ? 1 : 0);
  useEffect(() => {
    glow.value = !animate || reduceMotion || override ? on ? 1 : 0 : withTiming(on ? 1 : 0, { duration: 120 });
  }, [on, animate, reduceMotion, override, glow]);
  const bloom = useAnimatedStyle(() => ({ opacity: glow.value }));
  return <View testID={on ? 'start-lamp-on' : 'start-lamp-off'} style={{ width: size, height: size }}>
    <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: radiusR.pill, backgroundColor: color, boxShadow: `0 0 ${gantry ? 26 : 14}px ${go ? 'rgba(57,217,138,0.85)' : 'rgba(255,77,94,0.85)'}` }, bloom]} />
    <View style={{ flex: 1, borderRadius: radiusR.pill, overflow: 'hidden', backgroundColor: on ? color : colorsR.lightOff }}>
      {on && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, backgroundColor: 'rgba(0,0,0,0.18)' }} />}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  strip: { alignSelf: 'flex-start', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colorsR.asphalt, borderTopWidth: 6, borderTopColor: colorsR.steel },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  podColumn: { flex: 1, alignItems: 'center' },
  hanger: { width: 4, height: 12, backgroundColor: colorsR.steel },
  pod: { width: '100%', alignItems: 'center', borderRadius: radiusR.pod, backgroundColor: colorsR.pitLane, paddingVertical: 14, gap: 12 },
});
