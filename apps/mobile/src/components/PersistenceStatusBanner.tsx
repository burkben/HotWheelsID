import { Platform, StyleSheet, Text, View } from "react-native";

import { usePersistenceStatusStore } from "../store/persistence/persistenceStatusStore";
import { colors, fontSize, fontWeight, spacing } from "../theme/tokens";

export function PersistenceStatusBanner() {
  const mode = usePersistenceStatusStore((state) => state.mode);
  const reason = usePersistenceStatusStore((state) => state.reason);
  if (mode !== "memory") return null;

  const isWeb = Platform.OS === "web";
  const title = isWeb ? "Browser session" : "Saving unavailable";
  const body = isWeb
    ? "Garage, History, and Settings work while this page is open, but reset when it closes."
    : reason === "unavailable"
      ? "You can keep using the app, but changes reset when it closes. Rebuild the native app to restore saving."
      : "You can keep using the app, but changes reset when it closes. Restart the app to try saving again.";
  const accent = isWeb ? colors.accentBlue : colors.warn;

  return (
    <View
      style={[styles.banner, { borderBottomColor: accent }]}
      accessibilityRole={isWeb ? "text" : "alert"}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${title}. ${body}`}
    >
      <Text style={[styles.title, { color: accent }]}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 16,
    textAlign: "center",
  },
});
