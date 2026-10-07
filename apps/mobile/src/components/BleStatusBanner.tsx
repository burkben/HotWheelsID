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
import { Linking, StyleSheet, View } from "react-native";

import { bleStatusBanner } from "@/ble/bleStatus";
import type { BlePhase } from "@/ble/types";
import { colorsR } from "@/theme/tokens";
import { RaceButton } from "./redline/RaceButton";
import { RText } from "./redline/RText";
import { decorative } from "./redline/decorative";

/** Redline banner (SPEC §4.12): pitLane, a 3 pt tone bar, HUD eyebrow and body. */
export function BleStatusBanner({
  phase,
  onRetry,
}: {
  phase: BlePhase | null;
  onRetry?: () => void;
}) {
  const banner = bleStatusBanner(phase);
  if (!banner) return null;

  const accent = banner.tone === "danger" ? colorsR.redFlag : colorsR.caution;

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View {...decorative} style={[styles.bar, { backgroundColor: accent }]} />
      <RText variant="chip" style={[styles.eyebrow, { color: accent }]}>{banner.title}</RText>
      <RText variant="bodySmall" style={styles.body}>{banner.body}</RText>
      {banner.openSettings && (
        <RaceButton
          variant="ghost"
          compact
          label="Open Settings"
          accessibilityLabel="Open device settings"
          onPress={() => {
            Linking.openSettings().catch(() => {});
          }}
          style={styles.button}
        />
      )}
      {!banner.openSettings && phase !== "unsupported" && onRetry && (
        <RaceButton
          variant="ghost"
          compact
          label="Try again"
          accessibilityLabel="Retry portal connection"
          onPress={onRetry}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colorsR.pitLane,
    paddingTop: 15,
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 6,
    overflow: "hidden",
  },
  bar: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  eyebrow: { fontSize: 11, lineHeight: 14 },
  body: { color: colorsR.inkSecondary },
  button: { marginTop: 4, marginLeft: 4 },
});
