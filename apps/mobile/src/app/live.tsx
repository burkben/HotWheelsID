/**
 * Live portal — the Phase 1 diagnostics screen (parity with `python/monitor.py`).
 *
 * Observes the application-level Hot Wheels id Race Portal connection, shows the
 * adapter phase, and streams a raw event log of everything the portal sends
 * decoded by the shared `@redlineid/protocol` pipeline. This screen never creates
 * a second BLE client, so opening diagnostics cannot interrupt Speed or Race.
 *
 * Web/Simulator: there is no BLE radio, so this screen renders a clear notice.
 * The root controller never requires the native BLE module there.
 * Redline layout (SPEC §4.12): ScreenHeader, notices, stat cells and a log of
 * timing-style rows with a tone tag per event type.
 */
import { useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { PORTAL_NAME } from "@redlineid/protocol";

import type { BlePhase } from "@/ble/types";
import { LiveLogRow } from "@/components/LiveLogRow";
import { Notice, RaceButton, RText, ScreenHeader, SectionHeader, StatCell, StatRow, StatusChip } from "@/components/redline";
import {
  usePortalController,
  usePortalControllerActions,
} from "@/portal/PortalControllerProvider";
import { usePortalStore } from "@/store/portalStore";
import { useSettingsStore } from "@/store/settingsStore";
import { formatBestSpeed, formatSpeedValue, speedUnitLabel } from "@/speed/format";
import { colorsR, fontR } from "@/theme/tokens";

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
    <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 32 }]}
      >
        <ScreenHeader
          title="Live portal"
          backLabel="More"
          onBack={() => (router.canGoBack() ? router.back() : router.navigate("/more"))}
          right={
            <StatusChip
              connection={connection}
              controlStatus={controlStatus}
              phase={controllerPhase}
              mode={mode}
              manuallyDisconnected={manuallyDisconnected}
              onConnect={() => void controller.connect()}
              onRetry={() => void controller.retry()}
              onDisconnect={() => void controller.disconnect()}
            />
          }
        />
        <RText variant="bodySmall" style={styles.subtitle}>
          Real Bluetooth · scans for “{PORTAL_NAME}”, connects, and streams every decoded event.
          Modern firmware is unlocked automatically via the MPID handshake (P-256 ECDH).
        </RText>

        {!bleReady && (
          <Notice
            alert
            title={isWeb ? "Bluetooth isn’t available on the web" : "No Bluetooth radio here"}
            body={isWeb
              ? "Open this screen in a custom dev build on a physical iPhone to connect to the portal."
              : "The iOS Simulator has no BLE radio. Run a dev build on a physical iPhone (npx expo run:ios --device) to connect."}
          />
        )}

        {bleReady && mode === "demo" && (
          <Notice
            tone="info"
            title="Demo mode is active"
            body="Switch to Live BLE to collect real portal diagnostics. This also updates your startup preference."
          >
            <RaceButton
              variant="ghost"
              compact
              label="USE LIVE BLE"
              accessibilityLabel="Switch to live Bluetooth"
              onPress={() => void controller.setMode("live")}
              style={styles.noticeButton}
            />
          </Notice>
        )}

        {phase === "locked" && (
          <Notice
            alert
            tone="danger"
            title="Portal firmware unsupported"
            body="This portal connected, but it exposes neither the legacy control service nor a usable MPID auth handshake, so no live events are available from this unit. The log below lists the services it did expose. Verified independently with python/diag_portal.py on desktop."
          />
        )}

        <View style={styles.summary}>
          <RText variant="bodySmall" style={styles.summaryText} accessibilityLabel={`Status: ${summary}`}>{summary}</RText>
          <StatRow>
            <StatCell
              label="BEST"
              value={bestMph > 0 ? formatBestSpeed(bestMph, { unit: speedUnit, calibration: speedCalibration }) : "—"}
              unit={bestMph > 0 ? speedUnitLabel(speedUnit).toUpperCase() : undefined}
              color={colorsR.caution}
              size="md"
            />
            <StatCell label="PASSES" value={passes.length.toString()} size="md" />
            <StatCell label="ADAPTER" value={PHASE_LABEL[phase]} size="md" />
          </StatRow>
        </View>

        <SectionHeader
          title="Event log"
          count={logs.length > 0 ? logs.length : undefined}
          right={logs.length > 0 ? (
            <Pressable
              onPress={controller.clearLogs}
              accessibilityRole="button"
              accessibilityLabel="Clear portal event log"
              style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
            >
              <RText style={styles.clearText}>Clear</RText>
            </Pressable>
          ) : undefined}
        />

        <View style={styles.log}>
          {logs.length === 0 ? (
            <RText variant="bodySmall" style={styles.logEmpty}>
              No events yet. Connect, then place a car on the portal and roll it through the gate.
            </RText>
          ) : (
            logs.map((entry) => <LiveLogRow key={entry.id} entry={entry} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, gap: 14 },
  subtitle: { color: colorsR.inkSecondary, marginTop: -4 },
  noticeButton: { marginTop: 4, marginLeft: 4 },
  summary: { gap: 8 },
  summaryText: { color: colorsR.chalk },
  clear: { minHeight: 44, minWidth: 44, alignItems: "flex-end", justifyContent: "center" },
  clearText: { fontFamily: fontR.bodySemi, color: colorsR.electric },
  pressed: { opacity: 0.7 },
  log: { gap: 2, minHeight: 120 },
  logEmpty: { color: colorsR.inkMuted, backgroundColor: colorsR.pitLane, padding: 14 },
});
