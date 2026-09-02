/**
 * TelemetryValue — a number that owns the screen.
 *
 * Tabular/mono digits in a stable column, with the unit as a separate smaller
 * node and an optional signed delta. Used for speeds, lap times, counters, and
 * deltas across the telemetry UI. Reduce-motion never affects it — it's text.
 */
import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSizeT, fontWeight } from "@/theme/tokens";

export interface TelemetryValueProps {
  value: string;
  unit?: string;
  /** Signed delta like "+2.4" / "-0.8"; rendered with color + sign. */
  delta?: string;
  size?: "md" | "lg" | "hero";
  color?: string;
  accessibilityLabel?: string;
}

const SIZES = {
  md: fontSizeT.lg,
  lg: fontSizeT.xl,
  hero: fontSizeT.hero,
} as const;

export function TelemetryValue({
  value,
  unit,
  delta,
  size = "md",
  color = colors.ink,
  accessibilityLabel,
}: TelemetryValueProps) {
  const deltaPositive = delta?.startsWith("+");
  const deltaColor = delta == null ? undefined : deltaPositive ? colors.okT : colors.fault;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={
        accessibilityLabel ?? [value, unit, delta].filter(Boolean).join(" ")
      }
    >
      <Text style={[styles.value, { fontSize: SIZES[size], color }]} numberOfLines={1}>
        {value}
      </Text>
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      {delta ? (
        <Text style={[styles.delta, { color: deltaColor }]}>{delta}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  value: {
    fontFamily: fontFamily.telemetry,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  unit: {
    color: colors.inkMuted,
    fontSize: fontSizeT.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  delta: {
    fontFamily: fontFamily.telemetry,
    fontSize: fontSizeT.sm,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
