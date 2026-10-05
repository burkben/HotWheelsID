import { useContext, useEffect, useState } from 'react';
import { StyleSheet, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { decorative } from '@/components/redline/decorative';
import { RedlineFontContext } from '@/theme/RedlineFontContext';
import { colorsR, fontR } from '@/theme/tokens';
import { formatRaceClock } from '../livePresentation';

const AnimatedInput = Animated.createAnimatedComponent(TextInput);
/** Absolute gate time stays authoritative; UI frames don't depend on JS renders. */
export function useLapClock(lastGateAt: number | null, elapsedOverride?: number) {
  const gate = useSharedValue(lastGateAt);
  const fixed = useSharedValue(elapsedOverride);
  const elapsed = useSharedValue(elapsedOverride ?? 0);
  useEffect(() => { gate.value = lastGateAt; fixed.value = elapsedOverride; }, [lastGateAt, elapsedOverride, gate, fixed]);
  useFrameCallback(() => {
    elapsed.value = fixed.value ?? (gate.value == null ? 0 : Math.max(0, (Date.now() - gate.value) / 1000));
  });
  return elapsed;
}

/** Read-only text input lets Reanimated update native text directly on the UI thread. */
export function RaceClock({ elapsed, offset = 0, total = false, delta = false, label, testID, snapshot = 0, inactive = false }: {
  elapsed: SharedValue<number>;
  snapshot?: number;
  inactive?: boolean;
  offset?: number;
  total?: boolean;
  delta?: boolean;
  label: string;
  testID: string;
}) {
  const [initialValue] = useState(() => inactive ? '—' : delta ? `${snapshot + offset < 0 ? '−' : '+'}${Math.abs(snapshot + offset).toFixed(2)}` : formatRaceClock(snapshot + offset, total));
  const fontsLoaded = useContext(RedlineFontContext);
  const { fontScale } = useWindowDimensions();
  const width = useSharedValue(0);
  const animatedProps = useAnimatedProps<TextInputProps & { text?: string }>(() => {
    const value = elapsed.value + offset;
    const text = inactive ? '—' : delta ? `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(2)}` : formatRaceClock(value, total);
    return { text };
  });
  const ink = useAnimatedStyle(() => {
    const value = elapsed.value + offset;
    const text = inactive ? '—' : delta ? `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(2)}` : formatRaceClock(value, total);
    const base = total ? 26 : delta ? 22 : 64;
    return { color: delta ? value > 0 ? colorsR.deltaSlower : colorsR.greenFlag : colorsR.chalk,
      fontSize: width.value > 0 ? Math.min(base, width.value / (text.length * 0.62 * Math.min(1.3, fontScale))) : base };
  });
  return <View accessible accessibilityLabel={label} style={styles.wrapper} onLayout={event => { width.value = event.nativeEvent.layout.width; }}>
    <AnimatedInput {...decorative} testID={testID} editable={false} tabIndex={-1} caretHidden contextMenuHidden selectTextOnFocus={false} pointerEvents="none" maxFontSizeMultiplier={1.3} underlineColorAndroid="transparent" defaultValue={initialValue} animatedProps={animatedProps}
      style={[styles.input, { fontFamily: fontsLoaded ? total ? fontR.hud : fontR.hudBold : undefined, fontSize: total ? 26 : delta ? 22 : 64, lineHeight: total ? 32 : delta ? 30 : 76, textAlign: total || delta ? 'right' : 'left' }, ink]} />
  </View>;
}
const styles = StyleSheet.create({
  wrapper: { minWidth: 0 },
  input: { padding: 0, margin: 0, borderWidth: 0, fontVariant: ['tabular-nums'], width: '100%', minWidth: 0 },
});
