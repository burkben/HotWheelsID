/**
 * ActiveCarStrip — the Trackside Telemetry car strip (replaces CurrentCarHero's
 * tall hero card on the Speed cluster). A horizontal 88pt strip: photo, catalog
 * name, UID tail, series, and an `ON PORTAL` flame edge marker for the live car.
 * Reuses the same `CarHeroModel` and accessibility announcements.
 */
import { StyleSheet, Text, View } from "react-native";

import { CarPhoto } from "@/catalog/CarPhoto";
import { formatBestSpeed, speedUnitLabel, type SpeedDisplay } from "@/speed/format";
import { colors, fontSizeT, fontWeight, radiusT, spacing } from "@/theme/tokens";
import { TelemetrySurface } from "./TelemetrySurface";
import type { CarHeroModel } from "@/portal/selectors";

export function ActiveCarStrip({
  model,
  display,
}: {
  model: CarHeroModel | null;
  display: SpeedDisplay;
}) {
  if (!model) {
    return (
      <TelemetrySurface style={styles.strip}>
        <View
          style={styles.row}
          accessible
          accessibilityLabel="No car scanned yet. Place a car on the portal."
        >
          <CarPhoto size={56} accessibilityLabel="No car photo" />
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>Ready for a car</Text>
            <Text style={styles.title}>No car scanned yet</Text>
            <Text style={styles.meta}>Place a car on the portal to identify it.</Text>
          </View>
        </View>
      </TelemetrySurface>
    );
  }

  const context =
    model.lastMph != null && model.lastMph >= 1
      ? `Last ${formatBestSpeed(model.lastMph, display)} ${speedUnitLabel(display.unit)}`
      : model.bestMph > 0
        ? `Best ${formatBestSpeed(model.bestMph, display)} ${speedUnitLabel(display.unit)}`
        : "No speed recorded yet";
  const identity = model.serial ? `#${model.serial}` : `UID ${shortTail(model.uid)}`;
  const label = `${model.isCurrent ? "Current car" : "Last scanned car"}: ${model.title}. ${identity}. ${context}.`;

  return (
    <TelemetrySurface style={styles.strip}>
      {/* flame edge rail on the live car */}
      {model.isCurrent && <View style={styles.edge} pointerEvents="none" />}
      <View style={styles.row} accessible accessibilityLabel={label}>
        <CarPhoto
          carId={model.catalogId}
          size={56}
          ring={model.isCurrent}
          accessibilityLabel={`${model.title} car photo`}
        />
        <View style={styles.copy}>
          <View style={styles.topLine}>
            <Text style={[styles.eyebrow, model.isCurrent && styles.eyebrowLive]}>
              {model.isCurrent ? "ON PORTAL" : "LAST SCANNED"}
            </Text>
            <Text style={styles.uid}>{identity}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {model.title}
          </Text>
          <Text style={styles.context}>{context}</Text>
        </View>
      </View>
    </TelemetrySurface>
  );
}

function shortTail(uid: string): string {
  return uid.replace(/:/g, "").slice(-4).toUpperCase();
}

const styles = StyleSheet.create({
  strip: {
    width: "100%",
  },
  edge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.flame,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
    minHeight: 88,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(2),
  },
  eyebrow: {
    color: colors.inkMuted,
    fontSize: fontSizeT.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  eyebrowLive: {
    color: colors.flame,
  },
  uid: {
    color: colors.inkMuted,
    fontSize: fontSizeT.nano + 2,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
  },
  title: {
    color: colors.ink,
    fontSize: fontSizeT.lg,
    fontWeight: fontWeight.heavy,
  },
  meta: {
    color: colors.inkSecondary,
    fontSize: fontSizeT.sm,
  },
  context: {
    color: colors.electric,
    fontSize: fontSizeT.sm,
    fontWeight: fontWeight.medium,
    fontVariant: ["tabular-nums"],
  },
});
