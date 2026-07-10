import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { PORTAL_NAME } from '@redlineid/protocol';

import { RecentPasses } from '@/components/RecentPasses';
import { Speedometer } from '@/components/gauge/Speedometer';
import { StatusPill } from '@/components/StatusPill';
import { BleStatusBanner } from '@/components/BleStatusBanner';
import { CurrentCarHero } from '@/components/CurrentCarHero';
import { useCarIdentity } from '@/catalog/useCarIdentity';
import {
  usePortalController,
  usePortalControllerActions,
} from '@/portal/PortalControllerProvider';
import { carHeroModel, portalStatusPresentation } from '@/portal/selectors';
import { useGarageStore } from '@/store/garageStore';
import { usePortalStore } from '@/store/portalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatBestSpeed, speedUnitLabel, type SpeedDisplay } from '@/speed/format';
import { colors, elevation, fontSize, fontWeight, radius, spacing, speedGauge } from '@/theme/tokens';

/** How long the needle holds a pass before easing back toward zero. */
const NEEDLE_HOLD_MS = 1300;

export default function SpeedometerScreen() {
  const insets = useSafeAreaInsets();

  const connection = usePortalStore((s) => s.connection);
  const controlStatus = usePortalStore((s) => s.controlStatus);
  const car = usePortalStore((s) => s.car);
  const lastCar = usePortalStore((s) => s.lastCar);
  const lastSpeed = usePortalStore((s) => s.lastSpeed);
  const bestMph = usePortalStore((s) => s.bestMph);
  const passes = usePortalStore((s) => s.passes);
  const garageCars = useGarageStore((s) => s.cars);

  const canBle = usePortalController((s) => s.canBle);
  const mode = usePortalController((s) => s.mode);
  const blePhase = usePortalController((s) => s.phase);
  const manuallyDisconnected = usePortalController((s) => s.manuallyDisconnected);
  const controller = usePortalControllerActions();
  const useBle = mode === 'live';

  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const reduceMotionSetting = useSettingsStore((s) => s.reduceMotion);
  const reduceMotion = useReducedMotion() || reduceMotionSetting;
  const speedDisplay: SpeedDisplay = { unit: speedUnit, calibration: speedCalibration };

  const heroUid = car?.uid || lastCar?.uid || garageCars[0]?.uid;
  const catalogCar = useCarIdentity(heroUid);
  const hero = useMemo(
    () =>
      carHeroModel({
        currentCar: car,
        lastCar,
        garageCars,
        catalogCar,
        sessionBestMph: bestMph,
        lastMph: lastSpeed?.scaleMph,
      }),
    [car, lastCar, garageCars, catalogCar, bestMph, lastSpeed?.scaleMph],
  );

  const status = useMemo(
    () =>
      portalStatusPresentation({
        connection,
        controlStatus,
        phase: blePhase,
        mode,
        manuallyDisconnected,
      }),
    [connection, controlStatus, blePhase, mode, manuallyDisconnected],
  );
  const previousStatus = useRef(status.label);
  useEffect(() => {
    if (status.label === previousStatus.current) return;
    previousStatus.current = status.label;
    AccessibilityInfo.announceForAccessibility(status.accessibilityLabel);
  }, [status]);

  const previousHero = useRef(hero ? `${hero.uid}:${hero.isCurrent}` : null);
  useEffect(() => {
    const key = hero ? `${hero.uid}:${hero.isCurrent}` : null;
    if (!hero || key === previousHero.current) return;
    previousHero.current = key;
    AccessibilityInfo.announceForAccessibility(
      `${hero.isCurrent ? 'Car on portal' : 'Last scanned car'}: ${hero.title}`,
    );
  }, [hero]);

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
    if (Platform.OS !== 'web' && useSettingsStore.getState().haptics) {
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
    if (Platform.OS !== 'web' && useSettingsStore.getState().haptics) {
      Haptics.selectionAsync().catch(() => {});
    }
  }, [car?.uid]);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, []);

  const isConnected = connection === 'connected';
  const switchMode = (toDemo: boolean) => {
    if ((toDemo ? 'demo' : 'live') === mode) return;
    setNeedleValue(0);
    void controller.setMode(toDemo ? 'demo' : 'live');
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
        <StatusPill
          connection={connection}
          controlStatus={controlStatus}
          phase={blePhase}
          mode={mode}
          manuallyDisconnected={manuallyDisconnected}
          onConnect={() => void controller.connect()}
          onRetry={() => void controller.retry()}
          onDisconnect={() => {
            setNeedleValue(0);
            void controller.disconnect();
          }}
        />
      </View>

      {canBle && (
        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => switchMode(false)}
            accessibilityRole="button"
            accessibilityLabel="Use live Bluetooth portal"
            accessibilityState={{ selected: useBle }}
            style={[styles.modeOption, useBle && styles.modeOptionActive]}
          >
            <Text style={[styles.modeText, useBle && styles.modeTextActive]}>Live BLE</Text>
          </Pressable>
          <Pressable
            onPress={() => switchMode(true)}
            accessibilityRole="button"
            accessibilityLabel="Use demo portal"
            accessibilityState={{ selected: mode === 'demo' }}
            style={[styles.modeOption, mode === 'demo' && styles.modeOptionActive]}
          >
            <Text style={[styles.modeText, mode === 'demo' && styles.modeTextActive]}>Demo</Text>
          </Pressable>
        </View>
      )}

      {useBle && <BleStatusBanner phase={blePhase} />}

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
            accessibilityRole="button"
            accessibilityLabel="Switch to demo mode"
            style={({ pressed }) => [styles.lockedButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.lockedButtonText}>Switch to demo mode</Text>
          </Pressable>
        </View>
      )}

      <CurrentCarHero model={hero} display={speedDisplay} reduceMotion={reduceMotion} />

      <Speedometer
        value={needleValue}
        readoutMph={lastPassMph}
        max={speedGauge.maxMph}
        zones={speedGauge.zones}
        tickStep={speedGauge.tickStep}
        flameThreshold={speedGauge.flameThreshold}
        size={300}
        display={speedDisplay}
        reduceMotion={reduceMotion}
      />

      <View style={styles.statsRow}>
        <Stat label="Best" value={formatBestSpeed(bestMph, speedDisplay)} unit={speedUnitLabel(speedUnit)} />
        <Stat label="Passes" value={passes.length.toString()} unit="total" />
        <Stat
          label="Last"
          value={formatBestSpeed(lastPassMph, speedDisplay)}
          unit={speedUnitLabel(speedUnit)}
        />
      </View>

      {!useBle && (
        <View style={styles.controls}>
          <Pressable
            onPress={() => controller.triggerDemoPass()}
            disabled={!isConnected}
            accessibilityRole="button"
            accessibilityLabel="Trigger a demo car pass"
            accessibilityState={{ disabled: !isConnected }}
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
      )}

      <RecentPasses passes={passes} bestMph={bestMph} display={speedDisplay} />

      <Text style={styles.note}>
        {useBle
          ? 'The app connects automatically. Roll a car across the portal to log real passes; tap the status pill to retry or disconnect. Live portal under More shows every decoded BLE event.'
          : canBle
            ? 'Demo mode: simulated passes roll automatically. Tap “Trigger pass” to fire one, or use the status pill to pause. Switch to “Live BLE” to use a real race portal.'
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
    ...elevation.card,
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
  buttonGhost: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
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
