import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';

import { PORTAL_NAME } from '@redlineid/protocol';

import { RecentPasses } from '@/components/RecentPasses';
import { Speedometer } from '@/components/gauge/Speedometer';
import { StatusPill } from '@/components/StatusPill';
import { createMockPortal } from '@/mock/mockPortal';
import { createBlePortal, isBleAvailable } from '@/ble/blePortal';
import type { BlePhase } from '@/ble/types';
import { usePortalStore } from '@/store/portalStore';
import { colors, fontSize, fontWeight, radius, spacing, speedGauge } from '@/theme/tokens';

/** How long the needle holds a pass before easing back toward zero. */
const NEEDLE_HOLD_MS = 1300;

/** Minimal transport shape the home screen drives (mock adds `triggerPass`). */
interface HomeTransport {
  start: () => void | Promise<void>;
  stop: () => void | Promise<void>;
  triggerPass?: (scaleMph?: number) => void;
}

export default function SpeedometerScreen() {
  const insets = useSafeAreaInsets();

  const connection = usePortalStore((s) => s.connection);
  const controlStatus = usePortalStore((s) => s.controlStatus);
  const car = usePortalStore((s) => s.car);
  const lastSpeed = usePortalStore((s) => s.lastSpeed);
  const bestMph = usePortalStore((s) => s.bestMph);
  const passes = usePortalStore((s) => s.passes);

  // On a real device we can drive the speedometer from the *actual* portal over
  // BLE. On web / the iOS Simulator there's no radio, so we fall back to the mock.
  // `demoMode` also lets the user opt into the mock on a real device — invaluable
  // when their portal is firmware-locked but they still want to show off the UI.
  const canBle = isBleAvailable() && Device.isDevice;
  const [demoMode, setDemoMode] = useState(!canBle);
  const useBle = canBle && !demoMode;
  const [blePhase, setBlePhase] = useState<BlePhase | null>(null);
  const transportRef = useRef<HomeTransport | null>(null);

  // Needle springs to each pass, then eases back to rest; the digital readout
  // keeps showing the last recorded speed.
  const [needleValue, setNeedleValue] = useState(0);
  const [lastPassMph, setLastPassMph] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lastSpeed || lastSpeed.scaleMph < 1) return;
    setLastPassMph(lastSpeed.scaleMph);
    setNeedleValue(lastSpeed.scaleMph);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setNeedleValue(0), NEEDLE_HOLD_MS);

    // Tactile punch on each pass; a celebratory cue when it's a new best.
    // (The store has already folded this pass into bestMph by now.)
    if (Platform.OS !== 'web') {
      const isRecord = lastSpeed.scaleMph >= usePortalStore.getState().bestMph - 0.001;
      const haptic = isRecord
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      haptic.catch(() => {});
    }
  }, [lastSpeed]);

  // Light tick when a new car is detected on the portal.
  useEffect(() => {
    if (!car) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  }, [car?.uid]);

  // Build (and rebuild) the portal transport whenever the live/demo mode flips.
  // The BleManager is a module-level singleton, so recreating this thin wrapper on
  // toggle is cheap and leak-free; the cleanup tears down the outgoing transport.
  //
  // Demo mode auto-starts so the gauge comes alive the instant you enter it (zero
  // taps — ideal for the showcase, and for the locked-portal "Switch to demo"
  // escape hatch). Live BLE never auto-starts: scanning the radio is an explicit
  // "Connect portal" action, so the home screen shows no fabricated activity until
  // the user opts in.
  useEffect(() => {
    const { dispatch, setConnection } = usePortalStore.getState();
    const transport: HomeTransport = useBle
      ? createBlePortal({ dispatch, setConnection, onPhase: setBlePhase })
      : createMockPortal({ dispatch, setConnection });
    transportRef.current = transport;
    if (!useBle) {
      setBlePhase(null); // a mock portal is never "locked"
      void transport.start();
    }
    return () => {
      void transport.stop();
      transportRef.current = null;
    };
  }, [useBle]);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, []);

  const isConnected = connection === 'connected';
  const isBusy = connection === 'connecting';

  const toggleConnection = () => {
    if (isConnected || isBusy) {
      transportRef.current?.stop();
      setNeedleValue(0);
    } else {
      transportRef.current?.start();
    }
  };

  // Flip between the real BLE transport and the in-app mock. The effect keyed on
  // `useBle` tears down the old transport and spins up the new one.
  const switchMode = (toDemo: boolean) => {
    if (toDemo === demoMode) return;
    setNeedleValue(0);
    setDemoMode(toDemo);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing(3), paddingBottom: insets.bottom + spacing(6) },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Redline ID</Text>
          <Text style={styles.subtitle}>
            Portal “{PORTAL_NAME}” · {useBle ? 'live BLE' : 'demo mode'}
          </Text>
        </View>
        <StatusPill connection={connection} controlStatus={controlStatus} />
      </View>

      {canBle && (
        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => switchMode(false)}
            style={[styles.modeOption, useBle && styles.modeOptionActive]}
          >
            <Text style={[styles.modeText, useBle && styles.modeTextActive]}>Live BLE</Text>
          </Pressable>
          <Pressable
            onPress={() => switchMode(true)}
            style={[styles.modeOption, demoMode && styles.modeOptionActive]}
          >
            <Text style={[styles.modeText, demoMode && styles.modeTextActive]}>Demo</Text>
          </Pressable>
        </View>
      )}

      {useBle && blePhase === 'locked' && (
        <View style={styles.lockedBanner}>
          <Text style={styles.lockedTitle}>Portal firmware unsupported</Text>
          <Text style={styles.lockedBody}>
            This portal exposes neither the legacy control service nor a usable MPID auth
            handshake, so no car &amp; speed events stream from this unit. Open the raw event log
            for the full diagnosis, or switch to demo mode to explore the full experience.
          </Text>
          <Pressable
            onPress={() => switchMode(true)}
            style={({ pressed }) => [styles.lockedButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.lockedButtonText}>Switch to demo mode</Text>
          </Pressable>
        </View>
      )}

      <Speedometer
        value={needleValue}
        readoutMph={lastPassMph}
        max={speedGauge.maxMph}
        zones={speedGauge.zones}
        tickStep={speedGauge.tickStep}
        flameThreshold={speedGauge.flameThreshold}
        size={300}
      />

      <View style={styles.statsRow}>
        <Stat label="Best" value={bestMph > 0 ? Math.round(bestMph).toString() : '—'} unit="mph" />
        <Stat label="Passes" value={passes.length.toString()} unit="total" />
        <Stat label="Car" value={car ? shortUid(car.uid) : '—'} unit={car?.serial ?? 'none'} />
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={toggleConnection}
          style={({ pressed }) => [
            styles.button,
            isConnected || isBusy ? styles.buttonSecondary : styles.buttonPrimary,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {isConnected ? 'Disconnect' : isBusy ? 'Connecting…' : 'Connect portal'}
          </Text>
        </Pressable>
        {!useBle && (
          <Pressable
            onPress={() => transportRef.current?.triggerPass?.()}
            disabled={!isConnected}
            style={({ pressed }) => [
              styles.button,
              styles.buttonGhost,
              !isConnected && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>Trigger pass</Text>
          </Pressable>
        )}
      </View>

      <RecentPasses passes={passes} bestMph={bestMph} />

      <Link href="/race" asChild>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.raceLink,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>🏁 Race mode →</Text>
        </Pressable>
      </Link>

      <Link href="/live" asChild>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.liveLink,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {useBle ? 'Open raw event log →' : 'Open live portal (real BLE) →'}
          </Text>
        </Pressable>
      </Link>

      <Text style={styles.note}>
        {useBle
          ? 'Tap “Connect portal”, then roll a car across your race portal to log real passes over Bluetooth. “Open raw event log” shows every decoded BLE event.'
          : canBle
            ? 'Demo mode: simulated passes roll automatically — tap “Trigger pass” to fire one, or “Disconnect” to pause. Switch to “Live BLE” to use a real race portal.'
            : 'This screen is a demo: simulated passes roll automatically, driving the flames + haptics. Run a dev build on a physical iPhone to connect a real portal over Bluetooth.'}
      </Text>
    </ScrollView>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statUnit} numberOfLines={1}>
        {unit}
      </Text>
    </View>
  );
}

function shortUid(uid: string): string {
  const parts = uid.split(':');
  return parts.length > 2 ? parts.slice(-2).join(':') : uid;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing(5),
    gap: spacing(5),
  },
  header: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(3),
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  statsRow: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    gap: spacing(3),
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statUnit: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  controls: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    gap: spacing(3),
  },
  button: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(3.5),
    alignItems: 'center',
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
  buttonGhost: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  liveLink: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderColor: colors.accentBlue,
  },
  raceLink: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  lockedBanner: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
    gap: spacing(2),
  },
  lockedTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  lockedBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  lockedButton: {
    marginTop: spacing(1),
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(4),
  },
  lockedButtonText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    padding: 3,
    gap: 3,
  },
  modeOption: {
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(4),
    borderRadius: radius.pill,
  },
  modeOptionActive: {
    backgroundColor: colors.accent,
  },
  modeText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  modeTextActive: {
    color: colors.bg,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 18,
  },
});
