import { StyleSheet, Text, View } from "react-native";

import { CarPhoto } from "../catalog/CarPhoto";
import { formatBestSpeed, speedUnitLabel, type SpeedDisplay } from "../speed/format";
import { colors, elevation, fontSize, fontWeight, radius, spacing } from "../theme/tokens";
import type { CarHeroModel } from "../portal/selectors";

export function CurrentCarHero({
  model,
  display,
  reduceMotion,
}: {
  model: CarHeroModel | null;
  display: SpeedDisplay;
  reduceMotion: boolean;
}) {
  if (!model) {
    return (
      <View
        style={styles.hero}
        accessible
        accessibilityLabel="No car scanned yet. Place a car on the portal."
      >
        <CarPhoto uri={null} size={92} reduceMotion={reduceMotion} accessibilityLabel="No car photo" />
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Ready for a car</Text>
          <Text style={styles.title}>No car scanned yet</Text>
          <Text style={styles.meta}>Place a car on the portal to identify it.</Text>
        </View>
      </View>
    );
  }

  const context =
    model.lastMph != null && model.lastMph >= 1
      ? `Last pass ${formatBestSpeed(model.lastMph, display)} ${speedUnitLabel(display.unit)}`
      : model.bestMph > 0
        ? `Best ${formatBestSpeed(model.bestMph, display)} ${speedUnitLabel(display.unit)}`
        : "No speed recorded yet";
  const identity = model.serial ? `#${model.serial}` : `UID ${model.uid}`;
  const label = `${model.isCurrent ? "Current car" : "Last scanned car"}: ${model.title}. ${identity}. ${context}.`;

  return (
    <View style={[styles.hero, model.isCurrent && styles.heroCurrent]} accessible accessibilityLabel={label}>
      <CarPhoto
        uri={model.image}
        size={92}
        ring={model.isCurrent}
        reduceMotion={reduceMotion}
        accessibilityLabel={`${model.title} car photo`}
      />
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{model.isCurrent ? "On portal" : "Last scanned"}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {model.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {identity}
        </Text>
        <Text style={styles.context}>{context}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    maxWidth: 420,
    minHeight: 116,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(4),
    padding: spacing(3),
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    ...elevation.card,
  },
  heroCurrent: {
    borderColor: colors.accent,
    ...elevation.accentGlow,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.heavy,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  context: {
    color: colors.accentBlue,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginTop: spacing(1),
  },
});
