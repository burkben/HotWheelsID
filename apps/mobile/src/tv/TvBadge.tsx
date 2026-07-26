/**
 * A small "ON TV" pill, shown only while a real external display is driving the
 * TV stage. It's the app's only acknowledgement that a second screen exists —
 * enough to tell you AirPlay landed on the dedicated display rather than
 * plain mirroring.
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';
import { useExternalDisplay } from './useExternalDisplay';

export function TvBadge() {
  const display = useExternalDisplay();
  if (!display.connected) return null;

  return (
    <View style={styles.pill} accessibilityLabel="Playing on an external display">
      <View style={styles.dot} />
      <Text style={styles.text}>ON TV</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors.accentBlueSoft,
    borderWidth: 1,
    borderColor: colors.accentBlue,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.accentBlue,
  },
  text: {
    color: colors.accentBlue,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
});
