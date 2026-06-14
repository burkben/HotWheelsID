/**
 * StatusPill — at-a-glance connection + portal state.
 *
 * "Glanceable state" is a core design principle (ui-and-design.md §1): the user
 * should always be able to tell whether the portal is connected and whether a
 * car is on the pad.
 */
import { StyleSheet, Text, View } from "react-native";
import type { ControlStatus } from "@hotwheelsid/protocol";

import { colors, fontSize, fontWeight, radius, spacing } from "@/theme/tokens";
import type { ConnectionState } from "@/store/portalStore";

export interface StatusPillProps {
  connection: ConnectionState;
  controlStatus: ControlStatus | null;
}

function describe(
  connection: ConnectionState,
  controlStatus: ControlStatus | null,
): { label: string; color: string } {
  if (connection === "disconnected") return { label: "Disconnected", color: colors.idle };
  if (connection === "connecting") return { label: "Connecting…", color: colors.warn };

  switch (controlStatus) {
    case "carPresent":
      return { label: "Car on portal", color: colors.ok };
    case "transitional":
      return { label: "Reading…", color: colors.warn };
    case "idle":
    default:
      return { label: "Connected", color: colors.accentBlue };
  }
}

export function StatusPill({ connection, controlStatus }: StatusPillProps) {
  const { label, color } = describe(connection, controlStatus);
  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
  },
  label: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
