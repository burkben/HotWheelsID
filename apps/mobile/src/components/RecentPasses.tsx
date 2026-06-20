/**
 * RecentPasses — a compact log of the last few car passes.
 *
 * Mirrors the upstream `dashboard.py` live feed: most-recent first, each row
 * showing the recorded speed and the car's UID tail. Best pass is highlighted.
 */
import { StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "@/theme/tokens";
import {
  DEFAULT_SPEED_DISPLAY,
  formatSpeedValue,
  speedUnitLabel,
  type SpeedDisplay,
} from "@/speed/format";
import type { Pass } from "@/store/portalStore";

export interface RecentPassesProps {
  passes: readonly Pass[];
  bestMph: number;
  display?: SpeedDisplay;
}

function shortUid(uid?: string): string {
  if (!uid) return "—";
  const parts = uid.split(":");
  return parts.length > 2 ? parts.slice(-2).join(":") : uid;
}

function clockTime(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function RecentPasses({ passes, bestMph, display = DEFAULT_SPEED_DISPLAY }: RecentPassesProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Recent passes</Text>
      {passes.length === 0 ? (
        <Text style={styles.empty}>Waiting for a car to cross the portal…</Text>
      ) : (
        passes.slice(0, 6).map((pass) => {
          const isBest = pass.scaleMph >= bestMph && bestMph > 0;
          return (
            <View key={pass.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={[styles.mph, isBest && styles.mphBest]}>
                  {formatSpeedValue(pass.scaleMph, display)}
                </Text>
                <Text style={styles.unit}>{speedUnitLabel(display.unit)}</Text>
                {isBest ? <Text style={styles.bestTag}>BEST</Text> : null}
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.uid}>{shortUid(pass.uid)}</Text>
                <Text style={styles.time}>{clockTime(pass.at)}</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
    gap: spacing(2),
  },
  heading: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing(1),
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing(1.5),
  },
  mph: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
    fontVariant: ["tabular-nums"],
  },
  mphBest: {
    color: colors.accent,
  },
  unit: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  bestTag: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    marginLeft: spacing(1),
  },
  rowRight: {
    alignItems: "flex-end",
  },
  uid: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: "monospace",
  },
  time: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});
