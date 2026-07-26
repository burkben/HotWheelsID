/**
 * Live portal — the Phase 1 diagnostics screen (parity with `python/monitor.py`).
 *
 * Observes the application-level Hot Wheels id Race Portal connection, shows the
 * adapter phase, and streams a raw event log of everything the portal sends
 * decoded by the shared `@redlineid/protocol` pipeline. This screen never creates
 * a second BLE client, so opening diagnostics cannot interrupt Speed or Race.
 *
 * Web/Simulator: there is no BLE radio, so this screen renders a clear notice and
 * a clear notice. The root controller never requires the native BLE module there.
 */
import { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { PORTAL_NAME } from "@redlineid/protocol";

import type { BleLogEntry, BlePhase } from "@/ble/types";
import { StatusPill } from "@/components/StatusPill";
import {
  usePortalController,
  usePortalControllerActions,
} from "@/portal/PortalControllerProvider";
import { usePortalStore } from "@/store/portalStore";
import { useSettingsStore } from "@/store/settingsStore";
import { formatBestSpeed, formatSpeedValue, speedUnitLabel } from "@/speed/format";
import { colors, fontSize, fontWeight, radius, spacing } from "@/theme/tokens";

const PHASE_LABEL: Record<BlePhase, string> = {
  idle: "Idle",
  unsupported: "Unsupported here",
  poweredOff: "Bluetooth off",
  unauthorized: "Permission needed",
  scanning: "Scanning…",
  connecting: "Connecting…",
  discovering: "Discovering…",
  authenticating: "Authenticating…",
  connected: "Connected",
  locked: "Portal locked",
  reconnecting: "Reconnecting…",
  notFound: "Portal not found",
  error: "Error",
};

function logColor(level: BleLogEntry["level"]): string {
  if (level === "error") return colors.danger;
  if (level === "event") return colors.accentBlue;
  return colors.textSecondary;
}

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const connection = usePortalStore((s) => s.connection);
  const controlStatus = usePortalStore((s) => s.controlStatus);
  const car = usePortalStore((s) => s.car);
  const lastSpeed = usePortalStore((s) => s.lastSpeed);
  const bestMph = usePortalStore((s) => s.bestMph);
  const passes = usePortalStore((s) => s.passes);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);

  const controllerPhase = usePortalController((s) => s.phase);
  const phase = controllerPhase ?? "idle";
  const logs = usePortalController((s) => s.logs);
  const bleReady = usePortalController((s) => s.canBle);
  const mode = usePortalController((s) => s.mode);
  const manuallyDisconnected = usePortalController((s) => s.manuallyDisconnected);
  const controller = usePortalControllerActions();

  const isWeb = Platform.OS === "web";

  const isLive = connection === "connected";

  const summary = useMemo(() => {
    const display = { unit: speedUnit, calibration: speedCalibration };
    if (car) {
      const speed =
        lastSpeed && lastSpeed.scaleMph >= 1
          ? `${formatSpeedValue(lastSpeed.scaleMph, display)} ${speedUnitLabel(speedUnit)}`
          : "—";
      return `Car ${car.uid}${car.serial ? ` · #${car.serial}` : ""} · last ${speed}`;
    }
    if (isLive) return "Connected — place a car on the portal";
    return "No car detected";
  }, [car, lastSpeed, isLive, speedUnit, speedCalibration]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing(2) }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <StatusPill
          connection={connection}
          controlStatus={controlStatus}
          phase={controllerPhase}
          mode={mode}
          manuallyDisconnected={manuallyDisconnected}
          onConnect={() => void controller.connect()}
          onRetry={() => void controller.retry()}
          onDisconnect={() => void controller.disconnect()}
        />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + spacing(6) }]}
      >
        <Text style={styles.title}>Live portal</Text>
        <Text style={styles.subtitle}>
          Real Bluetooth · scans for “{PORTAL_NAME}”, connects, and streams every decoded event.
          Modern firmware is unlocked automatically via the MPID handshake (P-256 ECDH).
        </Text>

        {!bleReady && (
          <View style={styles.notice} accessibilityRole="alert">
            <Text style={styles.noticeTitle}>
              {isWeb ? "Bluetooth isn’t available on the web" : "No Bluetooth radio here"}
            </Text>
            <Text style={styles.noticeBody}>
              {isWeb
                ? "Open this screen in a custom dev build on a physical iPhone to connect to the portal."
                : "The iOS Simulator has no BLE radio. Run a dev build on a physical iPhone (npx expo run:ios --device) to connect."}
            </Text>
          </View>
        )}

        {bleReady && mode === "demo" && (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Demo mode is active</Text>
            <Text style={styles.noticeBody}>
              Switch to Live BLE to collect real portal diagnostics. This also updates your startup
              preference.
            </Text>
            <Pressable
              onPress={() => void controller.setMode("live")}
              accessibilityRole="button"
              accessibilityLabel="Switch to live Bluetooth"
              style={({ pressed }) => [styles.modeButton, pressed && styles.pressed]}
            >
              <Text style={styles.modeButtonText}>Use Live BLE</Text>
            </Pressable>
          </View>
        )}

        {phase === "locked" && (
          <View style={styles.noticeError} accessibilityRole="alert">
            <Text style={styles.noticeTitle}>Portal firmware unsupported</Text>
            <Text style={styles.noticeBody}>
              This portal connected, but it exposes neither the legacy control service nor a usable
              MPID auth handshake, so no live events are available from this unit. The log below
              lists the services it did expose. Verified independently with python/diag_portal.py on
              desktop.
            </Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Status</Text>
          <Text style={styles.summaryValue}>{summary}</Text>
          <View style={styles.statRow}>
            <MiniStat
              label="Best"
              value={
                bestMph > 0
                  ? `${formatBestSpeed(bestMph, { unit: speedUnit, calibration: speedCalibration })} ${speedUnitLabel(speedUnit)}`
                  : "—"
              }
            />
            <MiniStat label="Passes" value={passes.length.toString()} />
            <MiniStat label="Adapter" value={PHASE_LABEL[phase]} />
          </View>
        </View>

        <View style={styles.logHeaderRow}>
          <Text style={styles.logHeader}>Event log</Text>
          {logs.length > 0 && (
            <Pressable
              onPress={controller.clearLogs}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear portal event log"
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.logCard}>
          {logs.length === 0 ? (
            <Text style={styles.logEmpty}>
              No events yet. Connect, then place a car on the portal and roll it through the gate.
            </Text>
          ) : (
            logs.map((entry) => (
              <View key={entry.id} style={styles.logRow}>
                <Text style={styles.logTime}>{formatTime(entry.at)}</Text>
                <Text style={[styles.logMessage, { color: logColor(entry.level) }]}>
                  {entry.message}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(2),
  },
  backBtn: {
    paddingVertical: spacing(1),
    paddingRight: spacing(2),
  },
  backText: {
    color: colors.accentBlue,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing(5),
    gap: spacing(4),
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 19,
    marginTop: -spacing(2),
  },
  notice: {
    backgroundColor: colors.surface,
    borderColor: colors.warn,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
    gap: spacing(2),
  },
  noticeError: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
    gap: spacing(2),
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  noticeBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
    gap: spacing(3),
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  statRow: {
    flexDirection: "row",
    gap: spacing(3),
  },
  miniStat: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
    alignItems: "center",
    gap: 2,
  },
  miniLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  miniValue: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  modeButton: {
    alignSelf: "flex-start",
    marginTop: spacing(2),
    borderRadius: radius.md,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(4),
    backgroundColor: colors.accent,
  },
  modeButtonText: {
    color: colors.bg,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  pressed: {
    opacity: 0.7,
  },
  logHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logHeader: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  clearText: {
    color: colors.accentBlue,
    fontSize: fontSize.sm,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    gap: spacing(2),
    minHeight: 120,
  },
  logEmpty: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  logRow: {
    flexDirection: "row",
    gap: spacing(3),
  },
  logTime: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontVariant: ["tabular-nums"],
    paddingTop: 1,
    minWidth: 64,
  },
  logMessage: {
    flex: 1,
    fontSize: fontSize.sm,
  },
});
