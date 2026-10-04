import { StyleSheet, View } from 'react-native';

import { colorsR, radiusR } from '@/theme/tokens';
import { decorative } from './decorative';
import { RText } from './RText';
import { SkewBox } from './SkewBox';

const plateSizes = {
  small: { width: 46, height: 38, radius: radiusR.plateSmall, font: 30 },
  medium: { width: 52, height: 44, radius: radiusR.plate, font: 34 },
  large: { width: 62, height: 50, radius: radiusR.plateLarge, font: 38 },
  hero: { width: 92, height: 72, radius: radiusR.plateHero, font: 56 },
} as const;

export function RacePlate({ number, size = 'medium', outlined = false }: {
  number: number | string;
  size?: keyof typeof plateSizes;
  outlined?: boolean;
}) {
  const frame = plateSizes[size];
  return (
    <SkewBox angle={-10} style={[
      { width: frame.width, height: frame.height, borderRadius: frame.radius, backgroundColor: colorsR.chalk },
      outlined && { borderWidth: 3, borderColor: colorsR.asphalt, boxShadow: `0 0 0 3px ${colorsR.chalk}` },
    ]} contentStyle={[styles.center, { flex: 1 }]}>
      <RText variant="wordmark" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ color: colorsR.asphalt, fontSize: frame.font, lineHeight: frame.font, letterSpacing: 0 }}>
        {String(number).padStart(typeof number === 'number' ? 2 : 0, '0')}
      </RText>
    </SkewBox>
  );
}

export function Roundel({ number, fill = colorsR.chalk, size = 34 }: { number: number | string; fill?: string; size?: number }) {
  return (
    <View {...decorative} style={[styles.center, { width: size, height: size, borderRadius: radiusR.pill, backgroundColor: fill }]}>
      <RText variant="wordmark" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ color: colorsR.asphalt, fontSize: size * 0.62, lineHeight: size * 0.7, letterSpacing: 0 }}>
        {String(number).padStart(typeof number === 'number' ? 2 : 0, '0')}
      </RText>
    </View>
  );
}

export function Wordmark({ size = 30, inverted = false }: { size?: number; inverted?: boolean }) {
  const ink = inverted ? colorsR.asphalt : colorsR.chalk;
  return (
    <View {...decorative} style={{ flexDirection: 'row', alignItems: 'center', gap: size / 5 }}>
      <RText variant="wordmark" style={{ fontSize: size, lineHeight: size, color: ink }} maxFontSizeMultiplier={1}>REDLINE</RText>
      <SkewBox style={{ backgroundColor: inverted ? colorsR.asphalt : colorsR.flame, paddingHorizontal: size * 7 / 30, paddingTop: size / 15, paddingBottom: size / 30 }}>
        <RText variant="wordmark" style={{ fontSize: size * 22 / 30, lineHeight: size * 22 / 30, color: inverted ? colorsR.flame : colorsR.asphalt, letterSpacing: 0 }} maxFontSizeMultiplier={1}>ID</RText>
      </SkewBox>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
