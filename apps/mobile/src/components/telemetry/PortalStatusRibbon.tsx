/**
 * PortalStatusRibbon — the global telemetry channel.
 *
 * A slim (28pt) ribbon directly under the app chrome that reads like a timing
 * channel: connection state · mode · current car · last event. It is the
 * presentation+action wrapper around the existing portal selectors — the same
 * data `StatusPill` uses, lifted to the app shell so portal state stays legible
 * on every surface (it is NOT rendered on `/tv`, which is a separate surface).
 *
 * Tapping it connects / retries / confirms-disconnect, exactly like the pill.
 */
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import {
  usePortalController,
  usePortalControllerActions,
} from "@/portal/PortalControllerProvider";
import { portalStatusPresentation } from "@/portal/selectors";
import { usePortalStore } from "@/store/portalStore";
import { useSettingsStore } from "@/store/settingsStore";
import { colors, fontFamily, fontSizeT, fontWeight, spacing } from "@/theme/tokens";

const TONE_COLOR: Record<string, string> = {
  connected: colors.okT,
  busy: colors.caution,
  error: colors.fault,
  idle: colors.inkMuted,
};

export function PortalStatusRibbon() {
  const connection = usePortalStore((s) => s.connection);
  const controlStatus = usePortalStore((s) => s.controlStatus);
  const car = usePortalStore((s) => s.car);
  const lastSpeed = usePortalStore((s) => s.lastSpeed);
  const phase = usePortalController((s) => s.phase);
  const mode = usePortalController((s) => s.mode);
  const manuallyDisconnected = usePortalController((s) => s.manuallyDisconnected);
  const controller = usePortalControllerActions();

  const status = portalStatusPresentation({
    connection,
    controlStatus,
    phase,
    mode,
    manuallyDisconnected,
  });
  const dot = TONE_COLOR[status.tone] ?? colors.inkMuted;

  const confirmDisconnect = () => {
    const disconnect = () => {
      if (Platform.OS !== "web" && useSettingsStore.getState().haptics) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      void controller.disconnect();
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
    Alert.alert(
      "Disconnect portal?",
      "Automatic reconnect will stay paused until you connect again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Disconnect", style: "destructive", onPress: disconnect },
      ],
    );
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
    if (status.action === "retry") void controller.retry();
    else void controller.connect();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={status.action === "none"}
      accessibilityRole="button"
      accessibilityLabel={status.accessibilityLabel}
      accessibilityHint={status.accessibilityHint}
      accessibilityState={{ disabled: status.action === "none", busy: status.busy }}
      style={({ pressed }) => [styles.ribbon, pressed && styles.pressed]}
    >
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={styles.state} numberOfLines={1}>
        {status.label.toUpperCase()}
      </Text>
      <View style={styles.spacer} />
      {car?.uid ? (
        <>
          <Text style={styles.meta} numberOfLines={1}>
            CAR {shortTail(car.uid)}
          </Text>
          <Text style={styles.sep}>·</Text>
        </>
      ) : null}
      <Text style={styles.meta} numberOfLines={1}>
        {lastSpeed && lastSpeed.scaleMph >= 1
          ? `LAST ${Math.round(lastSpeed.scaleMph)}`
          : mode === "demo"
            ? "DEMO"
            : "STANDBY"}
      </Text>
    </Pressable>
  );
}

function shortTail(uid: string): string {
  const compact = uid.replace(/:/g, "");
  return compact.slice(-4).toUpperCase();
}

const styles = StyleSheet.create({
  ribbon: {
    flexDirection: "row",
    alignItems: "center",
    height: 28,
    paddingHorizontal: spacing(4),
    gap: spacing(2),
    backgroundColor: colors.panelInset,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  state: {
    color: colors.ink,
    fontFamily: fontFamily.telemetry,
    fontSize: fontSizeT.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  spacer: { flex: 1 },
  meta: {
    color: colors.inkSecondary,
    fontFamily: fontFamily.telemetry,
    fontSize: fontSizeT.xs,
    fontWeight: fontWeight.medium,
    fontVariant: ["tabular-nums"],
  },
  sep: {
    color: colors.inkMuted,
    fontSize: fontSizeT.xs,
  },
  pressed: { opacity: 0.7 },
});
