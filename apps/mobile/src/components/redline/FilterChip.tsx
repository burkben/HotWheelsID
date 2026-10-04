import { Pressable, StyleSheet, View } from 'react-native';
import { colorsR, fontR } from '@/theme/tokens';
import { decorative } from './decorative';
import { RText } from './RText';
import { SkewBox } from './SkewBox';

export function FilterChip({ label, selected, onPress, color, disabled = false }: { label: string; selected: boolean; onPress: () => void; color?: string; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} aria-pressed={selected} accessibilityState={{ selected, disabled }} style={({ pressed }) => [styles.touch, pressed && { opacity: 0.85 }, disabled && { opacity: 0.4 }]}>
      <SkewBox style={[styles.shape, { backgroundColor: selected ? colorsR.chalk : 'transparent', borderColor: selected ? colorsR.chalk : colorsR.fieldBorder }]} />
      {!selected && color && <View {...decorative} style={{ width: 8, height: 8, backgroundColor: color }} />}
      <RText variant="buttonGhost" style={{ fontFamily: fontR.display800, fontSize: 16, lineHeight: 20, letterSpacing: 0, color: selected ? colorsR.asphalt : colorsR.chalk }}>{label}</RText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: { minHeight: 44, minWidth: 44, paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shape: { position: 'absolute', top: 4, bottom: 4, left: 0, right: 0, borderWidth: 1 },
});
