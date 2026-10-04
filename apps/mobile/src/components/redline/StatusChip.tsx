import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { colorsR } from '@/theme/tokens';
import type { StatusPillProps } from '../StatusPill';
import { usePortalStatusAction } from '../usePortalStatusAction';
import { decorative } from './decorative';
import { RText } from './RText';
import { statusChipPresentation } from './statusChipPresentation';

export function StatusChip({ variant = 'pill', label: displayLabel, ...props }: StatusPillProps & { variant?: 'pill' | 'ribbon'; label?: string }) {
  const { status, onPress } = usePortalStatusAction(props);
  const { tone, label, error, hollow } = statusChipPresentation(props);
  const palette = colorsR.status[tone];
  const ink = error ? colorsR.redFlag : palette.ink;
  return (
    <Pressable onPress={onPress} disabled={status.action === 'none'} accessibilityRole="button" accessibilityLabel={status.accessibilityLabel} accessibilityHint={status.accessibilityHint} aria-busy={status.busy} accessibilityState={{ disabled: status.action === 'none', busy: status.busy }} style={({ pressed }) => [styles.chip, { backgroundColor: variant === 'ribbon' ? colorsR.asphalt : palette.fill, borderColor: variant === 'ribbon' ? colorsR.hairline : error ? colorsR.redFlag : palette.border }, variant === 'ribbon' && styles.ribbon, pressed && { opacity: 0.85 }]}>
      <View {...decorative} style={[styles.dot, { backgroundColor: hollow ? 'transparent' : ink, borderColor: ink, borderWidth: hollow ? 2 : 0, boxShadow: tone === 'connected' ? `0 0 8px ${ink}` : undefined }]} />
      <RText variant="chip" aria-live={Platform.OS === 'web' ? 'polite' : undefined} style={{ color: ink, flexShrink: 1 }}>{displayLabel ?? label}</RText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, minWidth: 44, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  ribbon: { alignSelf: 'stretch', backgroundColor: colorsR.asphalt, borderRadius: 0, borderWidth: 0, borderBottomWidth: 1, borderBottomColor: colorsR.hairline, paddingHorizontal: 20 },
  dot: { width: 8, height: 8, borderRadius: 999 },
});
