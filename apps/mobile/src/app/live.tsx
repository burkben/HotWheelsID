/**
 * Live portal — the Phase 1 diagnostics screen (parity with `python/monitor.py`).
 *
 * Connects to a real Hot Wheels id Race Portal over BLE, shows the connection /
 * adapter phase, and streams a raw event log of everything the portal sends
 * (decoded by the shared `@hotwheelsid/protocol` pipeline). The hero gauge on the
 * home screen keeps using the mock demo; this screen is where hardware is proven.
 *
 * Web/Simulator: there is no BLE radio, so this screen renders a clear notice and
 * the Connect button is disabled. The native BLE module is only ever `require`d
 * once `start()` runs on a real device, so static web export stays safe.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import * as Device from "expo-device";

import { PORTAL_NAME } from "@hotwheelsid/protocol";

import { createBlePortal, isBleAvailable } from "@/ble/blePortal";
import type { BleLogEntry, BlePhase, PortalTransport } from "@/ble/types";
import { usePortalStore } from "@/store/portalStore";
import { colors, fontSize, fontWeight, radius, spacing } from "@/theme/tokens";

const MAX_LOG = 100;

const PHASE_LABEL: Record<BlePhase, string> = {
  idle: "Idle",
  unsupported: "Unsupported here",
  poweredOff: "Bluetooth off",
  unauthorized: "Permission needed",
  scanning: "Scanning…",
  connecting: "Connecting…",
  discovering: "Discovering…",
  connected: "Connected",
  locked: "Portal locked",
  reconnecting: "Reconnecting…",
  error: "Error",
};

function phaseColor(phase: BlePhase): string {
  switch (phase) {
    case "connected":
      return colors.ok;
    case "scanning":
    case "connecting":
    case "discovering":
    case "reconnecting":
      return colors.warn;
    case "poweredOff":
    case "unauthorized":
    case "unsupported":
    case "locked":
    case "error":
      return colors.danger;
    case "idle":
    default:
      return colors.idle;
  }
}

function logColor(level: BleLogEntry["level"]): string {
  if (level === "error") return colors.danger;
  if (level === "event") return colors.accentBlue;
  return colors.textSecondary;
}

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const connection = usePortalStore((s) => s.connection);
  const car = usePortalStore((s) => s.car);
  const lastSpeed = usePortalStore((s) => s.lastSpeed);
  const bestMph = usePortalStore((s) => s.bestMph);
  const passes = usePortalStore((s) => s.passes);

  const [phase, setPhase] = useState<BlePhase>("idle");
  const [logs, setLogs] = useState<BleLogEntry[]>([]);

  const isWeb = Platform.OS === "web";
  // `Device.isDevice` is false on the iOS Simulator / Android emulator.
  const isSimulator = !isWeb && !Device.isDevice;
  const bleReady = isBleAvailable() && !isSimulator;

  const portalRef = useRef<PortalTransport | null>(null);
  const getPortal = useCallback((): PortalTransport | null => {
    if (!bleReady) return null;
    if (portalRef.current === null) {
      const { dispatch, setConnection } = usePortalStore.getState();
      portalRef.current = createBlePortal({
        dispatch,
        setConnection,
        onPhase: setPhase,
        onLog: (entry) => setLogs((prev) => [entry, ...prev].slice(0, MAX_LOG)),
      });
    }
    return portalRef.current;
  }, [bleReady]);

  useEffect(() => {
    return () => {
      void portalRef.current?.stop();
    };
  }, []);

  const isLive = connection === "connected";
  const isBusy = connection === "connecting";

  const toggle = () => {
    const portal = getPortal();
    if (!portal) return;
    if (isLive || isBusy) {
      void portal.stop();
    } else {
      setLogs([]);
      void portal.start();
    }
  };

  const summary = useMemo(() => {
    if (car) {
      const speed = lastSpeed && lastSpeed.scaleMph >= 1 ? `${Math.round(lastSpeed.scaleMph)} mph` : "—";
      return `Car ${car.uid}${car.serial ? ` · #${car.serial}` : ""} · last ${speed}`;
    }
    if (isLive) return "Connected — place a car on the portal";
    return "No car detected";
  }, [car, lastSpeed, isLive]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing(2) }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <View style={styles.phasePill}>
          <View style={[styles.dot, { backgroundColor: phaseColor(phase) }]} />
          <Text style={styles.phaseText}>{PHASE_LABEL[phase]}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + spacing(6) }]}
      >
        <Text style={styles.title}>Live portal</Text>
        <Text style={styles.subtitle}>
          Real Bluetooth · scans for “{PORTAL_NAME}”, subscribes to the control service, and logs
          every decoded event.
        </Text>

        {!bleReady && (
          <View style={styles.notice}>
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

        {phase === "locked" && (
          <View style={styles.noticeError}>
            <Text style={styles.noticeTitle}>Portal firmware locked</Text>
            <Text style={styles.noticeBody}>
              This portal connected, but it hides its control service — car detection, serial, and
              speed — behind the Hot Wheels id authentication handshake. That handshake was brokered
              by Mattel’s now-discontinued app/servers and isn’t publicly supported, so no live
              events are available from this unit. The log below lists the services it did expose
              (only Auth + Data). Verified independently with python/diag_portal.py on desktop.
            </Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Status</Text>
          <Text style={styles.summaryValue}>{summary}</Text>
          <View style={styles.statRow}>
            <MiniStat label="Best" value={bestMph > 0 ? `${Math.round(bestMph)} mph` : "—"} />
            <MiniStat label="Passes" value={passes.length.toString()} />
            <MiniStat label="Adapter" value={PHASE_LABEL[phase]} />
          </View>
        </View>

        <Pressable
          onPress={toggle}
          disabled={!bleReady}
          style={({ pressed }) => [
            styles.button,
            isLive || isBusy ? styles.buttonSecondary : styles.buttonPrimary,
            !bleReady && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {isLive ? "Disconnect" : isBusy ? "Connecting…" : "Scan & connect"}
          </Text>
        </Pressable>

        <View style={styles.logHeaderRow}>
          <Text style={styles.logHeader}>Event log</Text>
          {logs.length > 0 && (
            <Pressable onPress={() => setLogs([])} hitSlop={8}>
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
  phasePill: {
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
  phaseText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
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
  button: {
    borderRadius: radius.md,
    paddingVertical: spacing(3.5),
    alignItems: "center",
    borderWidth: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
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
