import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';

import { PORTAL_NAME } from '@hotwheelsid/protocol';

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

  // On a real iOS/Android device, drive the speedometer from the *actual* portal
  // over BLE. On web and the iOS Simulator (no radio) fall back to the mock so
  // the demo still works. This is why the home screen no longer fabricates races
  // when nothing is connected — it reflects real hardware on a real device.
  const useBle = isBleAvailable() && Device.isDevice;
  const [blePhase, setBlePhase] = useState<BlePhase | null>(null);
  const transportRef = useRef<HomeTransport | null>(null);
  if (transportRef.current === null) {
    const { dispatch, setConnection } = usePortalStore.getState();
    transportRef.current = useBle
      ? createBlePortal({ dispatch, setConnection, onPhase: setBlePhase })
      : createMockPortal({ dispatch, setConnection });
  }

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

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      transportRef.current?.stop();
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
          <Text style={styles.title}>HotWheelsID</Text>
          <Text style={styles.subtitle}>
            Portal “{PORTAL_NAME}” · {useBle ? 'live BLE' : 'demo mode'}
          </Text>
        </View>
        <StatusPill connection={connection} controlStatus={controlStatus} />
      </View>

      {useBle && blePhase === 'locked' && (
        <View style={styles.lockedBanner}>
          <Text style={styles.lockedTitle}>Portal firmware locked</Text>
          <Text style={styles.lockedBody}>
            This portal hides its car &amp; speed data behind the Hot Wheels id auth handshake,
            which isn’t publicly supported. Connecting succeeds but no events stream. Open the raw
            event log for the full diagnosis.
          </Text>
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
          ? 'Tap “Connect portal”, then roll a car across your Hot Wheels id portal to log real passes over Bluetooth. “Open raw event log” shows every decoded BLE event.'
          : 'This screen is a demo: flames + haptics run on mocked portal events decoded by @hotwheelsid/protocol. Run a dev build on a physical iPhone to connect a real portal over Bluetooth.'}
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
