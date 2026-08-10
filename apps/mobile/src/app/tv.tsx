/**
 * TV mode — the in-app view of the big-screen stage.
 *
 * Opening this route immediately presents the full-screen TV stage. iOS then
 * mirrors that exact surface when the user enables AirPlay Screen Mirroring.
 *
 * The stage itself is deliberately router-free so it remains reusable.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';
import { TvStage } from '@/tv/TvStage';

export default function TvScreen() {
  const router = useRouter();

  return (
    <View style={styles.stage}>
      <StatusBar hidden />
      <TvStage />
      <Pressable
        onPress={() => router.replace('/more')}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Exit TV mode"
        style={({ pressed }) => [styles.exitButton, pressed && styles.exitButtonPressed]}
      >
        <Text style={styles.exitText}>× Exit TV mode</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  exitButton: {
    position: 'absolute',
    top: spacing(2),
    right: spacing(2),
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing(2),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(10, 13, 19, 0.86)',
  },
  exitButtonPressed: {
    opacity: 0.7,
  },
  exitText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
