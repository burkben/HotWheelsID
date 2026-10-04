import { useContext } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RedlineFontContext } from '@/theme/RedlineFontContext';
import { colorsR, fontR, typeR, type TypeRVariant } from '@/theme/tokens';
import { RText } from '../RText';

const palette = ['asphalt', 'pitLane', 'gridBox', 'chalk', 'flame', 'electric', 'caution', 'greenFlag', 'redFlag'] as const;
const samples: Record<TypeRVariant, string> = {
  wordmark: 'REDLINE ID', screenTitle: 'INTO THE RED', raceDigit: '2',
  storeHeadline: 'THE PORTAL\nIS BACK.', sectionTitle: 'RECENT PASSES',
  carName: "’70 DODGE CHARGER R/T", buttonPrimary: 'START RACE',
  buttonGhost: 'TRY DEMO MODE', tabLabel: 'SPEED', gaugeReadout: '247',
  heroNumber: '2.31', statValue: '247', lapTime: '2.847',
  eyebrow: 'CURRENT LAP', chip: 'PORTAL LIVE',
  body: 'Drop a car on the portal and send it through the gate.',
  bodySmall: 'Every pass is timed and every car is remembered.',
};
const labels: Partial<Record<TypeRVariant, string>> = {
  raceDigit: 'Countdown: 2', gaugeReadout: '247 scale miles per hour',
  heroNumber: '2.31 seconds', statValue: '247 scale miles per hour', lapTime: '2.847 seconds',
};

/** Development specimens only: these sample values never enter app data. */
export function RedlineGallery() {
  const insets = useSafeAreaInsets();
  const fontsLoaded = useContext(RedlineFontContext);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      <RText variant="wordmark">REDLINE ID</RText>
      <RText variant="eyebrow" testID="font-status" style={{ color: colorsR.flame }}>
        {fontsLoaded ? 'BUNDLED FONTS READY' : 'SYSTEM FONT FALLBACK'}
      </RText>
      <RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>Development gallery · SPEC §1</RText>
      <RText variant="sectionTitle">01 · PAINT & TARMAC</RText>
      <View style={styles.palette}>
        {palette.map((name) => (
          <View key={name} style={styles.swatchCell}>
            <View style={[styles.swatch, { backgroundColor: colorsR[name] }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            <RText variant="bodySmall">{name}</RText>
            <RText variant="eyebrow" style={{ letterSpacing: 0, color: colorsR.inkSecondary }}>{colorsR[name]}</RText>
          </View>
        ))}
      </View>
      <RText variant="sectionTitle">02 · TYPE ON THE MOVE</RText>
      {(Object.keys(typeR) as TypeRVariant[]).map((variant) => (
        <View key={variant} style={styles.specimen} testID={`specimen-${variant}`}>
          <RText variant="eyebrow" style={{ color: colorsR.flame }}>{variant}</RText>
          <RText variant={variant} testID={`type-${variant}`} accessibilityLabel={labels[variant]}>{samples[variant]}</RText>
          <RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>
            {typeR[variant].fontFamily}{'\n'}{typeR[variant].fontSize} pt · {typeR[variant].lineHeight} pt line
          </RText>
        </View>
      ))}
      <RText variant="sectionTitle">03 · ALL TEN FACES</RText>
      {Object.entries(fontR).map(([role, family]) => (
        <View key={role} style={styles.specimen}>
          <RText variant="eyebrow" style={{ color: colorsR.inkMuted }}>{role}</RText>
          <RText variant="body" style={{ fontFamily: family, fontSize: 24, lineHeight: 32, fontVariant: ['tabular-nums'] }} testID={`face-${role}`}>
            Redline ID · 0123456789
          </RText>
          <RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>{family}</RText>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  content: { width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 20, gap: 16 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatchCell: { width: '30%', gap: 4 },
  swatch: { height: 44, borderWidth: 1, borderColor: colorsR.rule },
  specimen: { padding: 14, gap: 12, backgroundColor: colorsR.pitLane },
});
