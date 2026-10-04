/**
 * StatusPill — at-a-glance connection + portal state.
 *
 * "Glanceable state" is a core design principle (ui-and-design.md §1): the user
 * should always be able to tell whether the portal is connected and whether a
 * car is on the pad.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ControlStatus } from "@redlineid/protocol";

import { colors, fontSize, fontWeight, radiusT, spacing } from "@/theme/tokens";
import type { ConnectionState } from "@/store/portalStore";
import type { BlePhase } from "@/ble/types";
import type { PortalMode } from "@/portal/controller";
import { usePortalStatusAction } from "./usePortalStatusAction";

export interface StatusPillProps {
  connection: ConnectionState;
  controlStatus: ControlStatus | null;
  phase: BlePhase | null;
  mode: PortalMode;
  manuallyDisconnected: boolean;
  onConnect: () => void;
  onRetry: () => void;
  onDisconnect: () => void;
}

export function StatusPill(props: StatusPillProps) {
  const { status, onPress } = usePortalStatusAction(props);
  const color =
    status.tone === "connected"
      ? colors.okT
      : status.tone === "busy"
        ? colors.caution
        : status.tone === "error"
          ? colors.fault
          : colors.inkMuted;

  return (
    <Pressable
      onPress={onPress}
      disabled={status.action === "none"}
      accessibilityRole="button"
      accessibilityLabel={status.accessibilityLabel}
      accessibilityHint={status.accessibilityHint}
      accessibilityState={{ disabled: status.action === "none", busy: status.busy }}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{status.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    backgroundColor: colors.panelSolid,
    borderColor: colors.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusT.pill,
    minHeight: 44,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radiusT.pill,
  },
  label: {
    color: colors.ink,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  pressed: {
    opacity: 0.7,
  },
});
