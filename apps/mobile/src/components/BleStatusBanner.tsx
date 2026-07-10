/**
 * BleStatusBanner — surfaces a BLE adapter problem (Bluetooth off, permission
 * denied, no radio, transient error) on the home speedometer screen.
 *
 * Without this, a portal that can't connect leaves the gauge silently dead —
 * worst of all under iOS Guided Access, where iOS hides the system Bluetooth
 * prompt, so the user sees no explanation at all. The copy + the "Open Settings"
 * shortcut give them a way out. The phase→copy mapping lives in the pure
 * {@link bleStatusBanner} so it can be unit-tested without a renderer.
 */
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { bleStatusBanner } from "@/ble/bleStatus";
import type { BlePhase } from "@/ble/types";
import { colors, fontSize, fontWeight, radius, spacing } from "@/theme/tokens";

export function BleStatusBanner({ phase }: { phase: BlePhase | null }) {
  const banner = bleStatusBanner(phase);
  if (!banner) return null;

  const accent = banner.tone === "danger" ? colors.danger : colors.warn;

  return (
    <View
      style={[styles.banner, { borderColor: accent }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.title}>{banner.title}</Text>
      <Text style={styles.body}>{banner.body}</Text>
      {banner.openSettings && (
        <Pressable
          onPress={() => {
            Linking.openSettings().catch(() => {});
          }}
          accessibilityRole="button"
          accessibilityLabel="Open device settings"
          style={({ pressed }) => [
            styles.button,
            { borderColor: accent },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: accent }]}>Open Settings</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
    gap: spacing(2),
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  button: {
    marginTop: spacing(1),
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(4),
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
