/**
 * StatusPill — at-a-glance connection + portal state.
 *
 * "Glanceable state" is a core design principle (ui-and-design.md §1): the user
 * should always be able to tell whether the portal is connected and whether a
 * car is on the pad.
 */
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import type { ControlStatus } from "@redlineid/protocol";

import { colors, fontSize, fontWeight, radius, spacing } from "@/theme/tokens";
import type { ConnectionState } from "@/store/portalStore";
import type { BlePhase } from "@/ble/types";
import type { PortalMode } from "@/portal/controller";
import { portalStatusPresentation } from "@/portal/selectors";
import { useSettingsStore } from "@/store/settingsStore";

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

export function StatusPill({
  connection,
  controlStatus,
  phase,
  mode,
  manuallyDisconnected,
  onConnect,
  onRetry,
  onDisconnect,
}: StatusPillProps) {
  const status = portalStatusPresentation({
    connection,
    controlStatus,
    phase,
    mode,
    manuallyDisconnected,
  });
  const color =
    status.tone === "connected"
      ? colors.ok
      : status.tone === "busy"
        ? colors.warn
        : status.tone === "error"
          ? colors.danger
          : colors.idle;

  const confirmDisconnect = () => {
    const disconnect = () => {
      if (Platform.OS !== "web" && useSettingsStore.getState().haptics) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onDisconnect();
    };
    if (Platform.OS === "web") {
      if (
        typeof globalThis.confirm === "function" &&
        globalThis.confirm("Disconnect portal? Automatic reconnect will stay paused.")
      ) {
        disconnect();
      }
      return;
    }
    Alert.alert("Disconnect portal?", "Automatic reconnect will stay paused until you connect again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: disconnect,
      },
    ]);
  };

  const onPress = () => {
    if (status.action === "none") return;
    if (status.action === "disconnect") {
      confirmDisconnect();
      return;
    }
    if (Platform.OS !== "web" && useSettingsStore.getState().haptics) {
      void Haptics.selectionAsync();
    }
    if (status.action === "retry") onRetry();
    else onConnect();
  };

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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    minHeight: 44,
    paddingVertical: spacing(2),
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
  pressed: {
    opacity: 0.7,
  },
});
