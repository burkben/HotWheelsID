import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { PORTAL_NAME } from '@hotwheelsid/protocol';

import { RecentPasses } from '@/components/RecentPasses';
import { Speedometer } from '@/components/gauge/Speedometer';
import { StatusPill } from '@/components/StatusPill';
import { createMockPortal, type MockPortal } from '@/mock/mockPortal';
import { usePortalStore } from '@/store/portalStore';
import { colors, fontSize, fontWeight, radius, spacing, speedGauge } from '@/theme/tokens';

/** How long the needle holds a pass before easing back toward zero. */
const NEEDLE_HOLD_MS = 1300;

export default function SpeedometerScreen() {
  const insets = useSafeAreaInsets();

  const connection = usePortalStore((s) => s.connection);
  const controlStatus = usePortalStore((s) => s.controlStatus);
  const car = usePortalStore((s) => s.car);
  const lastSpeed = usePortalStore((s) => s.lastSpeed);
  const bestMph = usePortalStore((s) => s.bestMph);
  const passes = usePortalStore((s) => s.passes);

  // The mock portal is the Phase 2a stand-in for the BLE transport. It reuses
  // the store's own actions so the swap to real BLE (Phase 1) is transparent.
  const mockRef = useRef<MockPortal | null>(null);
  if (mockRef.current === null) {
    const { dispatch, setConnection } = usePortalStore.getState();
    mockRef.current = createMockPortal({ dispatch, setConnection });
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
      mockRef.current?.stop();
    };
  }, []);

  const isConnected = connection === 'connected';
  const isBusy = connection === 'connecting';

  const toggleConnection = () => {
    if (isConnected || isBusy) {
      mockRef.current?.stop();
      setNeedleValue(0);
    } else {
      mockRef.current?.start();
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
          <Text style={styles.subtitle}>Portal “{PORTAL_NAME}” · demo mode</Text>
        </View>
        <StatusPill connection={connection} controlStatus={controlStatus} />
      </View>

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
        <Pressable
          onPress={() => mockRef.current?.triggerPass()}
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
          <Text style={styles.buttonText}>Open live portal (real BLE) →</Text>
        </Pressable>
      </Link>

      <Text style={styles.note}>
        This screen is a demo: flames + haptics run on mocked portal events decoded by
        @hotwheelsid/protocol. Tap “Live portal” to connect a real Hot Wheels id portal over
        Bluetooth (needs a custom dev build on a physical iPhone).
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
