/**
 * TV mode — the in-app view of the big-screen stage.
 *
 * Two jobs. On an iOS device with a real external display, the stage is already
 * running out there on its own scene and this screen just explains that (with a
 * live preview). Everywhere else — plain AirPlay mirroring, a Mac, Android — it
 * *is* the TV: mirror the device and the stage fills the panel.
 *
 * The stage itself is deliberately router-free so the exact same component can
 * be mounted here and on the external surface. See
 * `docs/adr/0015-external-display-tv-mode.md`.
 */
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';
import { TvStage } from '@/tv/TvStage';
import { isExternalDisplaySupported, useExternalDisplay } from '@/tv/useExternalDisplay';

export default function TvScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const display = useExternalDisplay();
  const supported = isExternalDisplaySupported();
  const [box, setBox] = useState({ width: 0, height: 0 });

  // The preview is pinned to 16:9 so it shows what a TV actually sees rather
  // than the shape of whatever space is left over on this device.
  const onBox = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  };
  const stageWidth = Math.max(0, Math.min(box.width, (box.height * 16) / 9));
  const stageHeight = (stageWidth * 9) / 16;

  const status = display.connected
    ? `Playing on ${display.name ?? 'the connected display'}${
        display.width > 0 ? ` · ${Math.round(display.width)}×${Math.round(display.height)}` : ''
      }`
    : supported
      ? 'Connect a TV with AirPlay or a cable and the stage moves to it automatically.'
      : 'Mirror this device to a TV and this screen fills the panel.';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>TV MODE</Text>
        <View style={styles.spacer} />
      </View>

      <Text style={styles.status}>{status}</Text>

      <View style={styles.stageWrap} onLayout={onBox}>
        {stageWidth > 0 ? (
          <View
            style={[
              styles.stage,
              { width: stageWidth, height: stageHeight },
              display.connected && styles.stageLive,
            ]}
          >
            <TvStage />
          </View>
        ) : null}
      </View>

      <Text style={[styles.footnote, { marginBottom: insets.bottom + spacing(3) }]}>
        {display.connected
          ? 'This is a preview — the TV is running its own copy of the stage.'
          : 'Preview'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(4) },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(3),
  },
  back: { color: colors.accent, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.heavy,
    letterSpacing: 2,
  },
  spacer: { width: 52 },
  status: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing(3),
  },
  stageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stage: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stageLive: { borderColor: colors.accentBlue },
  footnote: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing(2),
  },
});
