import { Platform, StyleSheet, View } from "react-native";

import { usePersistenceStatusStore } from "../store/persistence/persistenceStatusStore";
import { colorsR } from "../theme/tokens";
import { RText } from "./redline/RText";
import { decorative } from "./redline/decorative";

/** Redline banner (SPEC §4.12): pitLane, a 3 pt tone bar, HUD eyebrow and body. */
export function PersistenceStatusBanner() {
  const mode = usePersistenceStatusStore((state) => state.mode);
  const reason = usePersistenceStatusStore((state) => state.reason);
  const degradedDomains = usePersistenceStatusStore((state) => state.degradedDomains);
  if (mode !== "memory" && mode !== "partial") return null;

  const isWeb = Platform.OS === "web";
  const domainLabel = degradedDomains
    .map((domain) => (domain === "Identity" ? "Car identities" : domain))
    .join(", ");
  const title = isWeb ? "Browser session" : mode === "partial" ? "Saving limited" : "Saving unavailable";
  const body = isWeb
    ? "Garage, History, and Settings work while this page is open, but reset when it closes."
    : mode === "partial"
      ? `${domainLabel || "Some data"} is using temporary memory and may reset when the app closes. Other data continues saving. Restart the app to retry.`
    : reason === "unavailable"
      ? "You can keep using the app, but changes reset when it closes. Rebuild the native app to restore saving."
      : "You can keep using the app, but changes reset when it closes. Restart the app to try saving again.";
  const accent = isWeb ? colorsR.electric : colorsR.caution;

  return (
    <View
      style={styles.banner}
      accessibilityRole={isWeb ? "text" : "alert"}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${title}. ${body}`}
    >
      <View {...decorative} style={[styles.bar, { backgroundColor: accent }]} />
      <RText variant="chip" style={[styles.title, { color: accent }]}>{title}</RText>
      <RText variant="bodySmall" style={styles.body}>{body}</RText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colorsR.pitLane,
    borderBottomWidth: 1,
    borderBottomColor: colorsR.hairline,
    paddingTop: 11,
    paddingBottom: 8,
    paddingHorizontal: 16,
    gap: 2,
  },
  bar: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  title: { fontSize: 11, lineHeight: 14, textAlign: "center" },
  body: { color: colorsR.inkSecondary, fontSize: 12, lineHeight: 16, textAlign: "center" },
});
