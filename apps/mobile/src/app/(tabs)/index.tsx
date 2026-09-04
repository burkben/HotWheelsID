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


import { RecentPasses } from '@/components/RecentPasses';
import { Speedometer } from '@/components/gauge/Speedometer';
import { BleStatusBanner } from '@/components/BleStatusBanner';
import { ActiveCarStrip } from '@/components/telemetry/ActiveCarStrip';
import { SpeedTrace } from '@/components/telemetry/SpeedTrace';
import { TelemetrySurface } from '@/components/telemetry/TelemetrySurface';
import { TelemetryValue } from '@/components/telemetry/TelemetryValue';
import { useCarIdentity } from '@/catalog/useCarIdentity';
import { useLayout } from '@/layout/useLayout';
import {
  usePortalController,
  usePortalControllerActions,
} from '@/portal/PortalControllerProvider';
import { carHeroModel, portalStatusPresentation } from '@/portal/selectors';
import { useGarageStore } from '@/store/garageStore';
import { usePortalStore } from '@/store/portalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatBestSpeed, speedUnitLabel, type SpeedDisplay } from '@/speed/format';
import { colors, fontSize, fontSizeT, fontWeight, radiusT, spacing, speedGauge } from '@/theme/tokens';

/** Needle pass choreography: a short ramp up through the speed, a beat at the
 *  peak, then a soft return to rest — one continuous sweep, like a car
 *  accelerating across the sensor, not a teleport to peak + drop to zero. */
const NEEDLE_RAMP_MS = 650;
const NEEDLE_HOLD_MS = 900;

export default function SpeedometerScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();

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

  // Needle sweeps up through each pass, holds a beat, then eases back to rest;
  // the digital readout keeps showing the last recorded speed. The ramp runs
  // through intermediate steps so the motion reads as a continuous sweep
  // (acceleration → peak → coast-down) rather than a teleport + drop.
  const [needleValue, setNeedleValue] = useState(0);
  const [lastPassMph, setLastPassMph] = useState(0);
  const sweepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!lastSpeed || lastSpeed.scaleMph < 1) return;
    setLastPassMph(lastSpeed.scaleMph);

    // Cancel any in-flight sweep, then choreograph this pass.
    sweepTimers.current.forEach(clearTimeout);
    sweepTimers.current = [];
    const peak = lastSpeed.scaleMph;
    // Ramp: ease through ~55% then the peak — two quick steps the spring blends
    // into a smooth climb.
    setNeedleValue(peak * 0.55);
    sweepTimers.current.push(setTimeout(() => setNeedleValue(peak), NEEDLE_RAMP_MS * 0.45));
    // Hold at peak, then coast back to rest.
    sweepTimers.current.push(
      setTimeout(() => setNeedleValue(0), NEEDLE_RAMP_MS + NEEDLE_HOLD_MS),
    );

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
    // The object also carries mutable timestamps; haptics should fire only for a new UID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car?.uid]);

  useEffect(() => {
    const timers = sweepTimers.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const isConnected = connection === 'connected';
  const switchMode = (toDemo: boolean) => {
    if ((toDemo ? 'demo' : 'live') === mode) return;
    setNeedleValue(0);
    void controller.setMode(toDemo ? 'demo' : 'live');
  };

  const liveHint = useBle
    ? 'The app connects automatically. Roll a car across the portal to log real passes; tap the status pill to retry or disconnect. Live portal under More shows every decoded BLE event.'
    : canBle
      ? 'Demo mode: simulated passes roll automatically. Tap \u201cTrigger pass\u201d to fire one, or use the status pill to pause. Switch to \u201cLive BLE\u201d to use a real race portal.'
      : 'This screen is a demo: simulated passes roll automatically, driving the flames + haptics. Run a dev build on a physical iPhone to connect a real portal over Bluetooth.';

  // Each region is built once and then arranged either as one scrolling column
  // (phone) or as two panes (iPad). Keeping them as locals rather than nested
  // components preserves component identity across a rotation, so the gauge's
  // Reanimated needle keeps its position instead of remounting at zero.
  const paneWidth = layout.isSplit ? undefined : layout.contentMaxWidth;

  // The PortalStatusRibbon (mounted in the tab shell) now carries connection
  // state + the connect/retry/disconnect action, so the header is just the
  // title — no redundant status pill or subtitle duplicating the ribbon.
  const header = (
    <View style={[styles.header, { maxWidth: layout.isSplit ? undefined : layout.contentMaxWidth }]}>
      <View style={styles.headerText}>
        <Text style={styles.title}>Redline ID</Text>
      </View>
    </View>
  );

  const modeToggle = canBle ? (
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
  ) : null;

  const banners = (
    <>
      {useBle && <BleStatusBanner phase={blePhase} />}
      {useBle && blePhase === 'locked' && (
        <View style={[styles.lockedBanner, { maxWidth: paneWidth }]}>
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
    </>
  );

  const heroCard = <ActiveCarStrip model={hero} display={speedDisplay} />;

  const gauge = (
    <Speedometer
      value={needleValue}
      readoutMph={lastPassMph}
      max={speedGauge.maxMph}
      zones={speedGauge.zones}
      tickStep={speedGauge.tickStep}
      flameThreshold={speedGauge.flameThreshold}
      size={layout.gaugeSize}
      display={speedDisplay}
      reduceMotion={reduceMotion}
    />
  );

  // Live telemetry trace of recent passes (oldest → newest).
  const traceValues = useMemo(
    () => passes.map((p) => p.scaleMph).slice(0, 30).reverse(),
    [passes],
  );

  const lastDelta =
    lastPassMph > 0 && bestMph > 0 ? lastPassMph - bestMph : null;

  const stats = (
    <View style={[styles.statsRow, { maxWidth: paneWidth }]}>
      <Stat
        label="Best"
        value={formatBestSpeed(bestMph, speedDisplay)}
        unit={speedUnitLabel(speedUnit)}
      />
      <Stat label="Passes" value={passes.length.toString()} unit="total" />
      <Stat
        label="Delta"
        value={lastDelta == null ? '—' : formatBestSpeed(Math.abs(lastDelta), speedDisplay)}
        unit={speedUnitLabel(speedUnit)}
        delta={
          lastDelta == null
            ? undefined
            : `${lastDelta >= 0 ? '+' : '−'}${formatBestSpeed(Math.abs(lastDelta), speedDisplay)}`
        }
      />
    </View>
  );

  const trace = (
    <TelemetrySurface style={[styles.traceCard, { maxWidth: paneWidth }]}>
      <View style={styles.traceHead}>
        <Text style={styles.traceLabel}>Speed trace</Text>
        <Text style={styles.traceMeta}>last {Math.min(traceValues.length, 30)} passes</Text>
      </View>
      <SpeedTrace values={traceValues} height={92} />
    </TelemetrySurface>
  );

  // Connect/retry/disconnect all live on the status pill now, so demo mode is
  // the only thing left needing a button here.
  const controls = !useBle ? (
    <View style={[styles.controls, { maxWidth: paneWidth }]}>
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
  ) : null;

  // --- iPad: gauge holds a fixed left pane, detail scrolls on the right -------
  if (layout.isSplit) {
    return (
      <View
        style={[
          styles.screen,
          styles.splitRoot,
          {
            paddingTop: insets.top + spacing(3),
            paddingBottom: insets.bottom + spacing(3),
            paddingLeft: insets.left + layout.gutter,
            paddingRight: insets.right + layout.gutter,
          },
        ]}
      >
        {header}
        <View style={styles.splitBody}>
          <View style={styles.splitLeft}>
            {modeToggle}
            {gauge}
            {stats}
            {trace}
            {controls}
          </View>
          <ScrollView
            style={styles.splitRight}
            contentContainerStyle={styles.splitRightContent}
            showsVerticalScrollIndicator={false}
          >
            {banners}
            {heroCard}
            <RecentPasses
              passes={passes}
              bestMph={bestMph}
              display={speedDisplay}
              maxWidth={layout.width}
              limit={12}
            />
            <Text style={[styles.note, styles.noteLeft]}>{liveHint}</Text>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing(3),
          paddingBottom: insets.bottom + spacing(6),
          paddingHorizontal: layout.gutter,
        },
      ]}
    >
      {header}
      {modeToggle}
      {banners}
      {heroCard}
      {gauge}
      {stats}
      {trace}
      {controls}
      <RecentPasses
        passes={passes}
        bestMph={bestMph}
        display={speedDisplay}
        maxWidth={layout.contentMaxWidth}
      />
      <Text style={[styles.note, { maxWidth: layout.contentMaxWidth }]}>{liveHint}</Text>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: string;
  unit: string;
  delta?: string;
}) {
  return (
    <TelemetrySurface style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <TelemetryValue value={value} unit={unit} delta={delta} size="md" />
    </TelemetrySurface>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.void,
  },
  content: {
    alignItems: 'center',
    gap: spacing(4),
  },
  /** iPad: a fixed frame, since each pane manages its own scrolling. */
  splitRoot: {
    gap: spacing(4),
  },
  splitBody: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing(6),
  },
  splitLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(4),
  },
  splitRight: {
    flex: 1,
  },
  splitRightContent: {
    gap: spacing(4),
    paddingBottom: spacing(4),
    // Matches the left pane, which centres its column.
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(3),
  },
  headerText: {
    flexShrink: 1,
  },
  title: {
    color: colors.ink,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing(3),
  },
  stat: {
    flex: 1,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    alignItems: 'flex-start',
    gap: 4,
  },
  statLabel: {
    color: colors.inkMuted,
    fontSize: fontSizeT.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  traceCard: {
    width: '100%',
    padding: spacing(3),
    gap: spacing(2),
  },
  traceHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  traceLabel: {
    color: colors.inkMuted,
    fontSize: fontSizeT.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  traceMeta: {
    color: colors.inkMuted,
    fontSize: fontSizeT.xs,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing(3),
  },
  button: {
    flex: 1,
    borderRadius: radiusT.field,
    paddingVertical: spacing(3.5),
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonGhost: {
    backgroundColor: colors.panelInset,
    borderColor: colors.hairline,
  },
  lockedBanner: {
    width: '100%',
    backgroundColor: colors.panelSolid,
    borderColor: colors.fault,
    borderWidth: 1,
    borderRadius: radiusT.card,
    padding: spacing(4),
    gap: spacing(2),
  },
  lockedTitle: {
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  lockedBody: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  lockedButton: {
    marginTop: spacing(1),
    alignSelf: 'flex-start',
    backgroundColor: colors.panelInset,
    borderColor: colors.flame,
    borderWidth: 1,
    borderRadius: radiusT.field,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(4),
  },
  lockedButtonText: {
    color: colors.flame,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.panelInset,
    borderColor: colors.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusT.field,
    padding: 2,
    gap: 2,
  },
  modeOption: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radiusT.field - 2,
    minHeight: 32,
    justifyContent: 'center',
  },
  modeOptionActive: {
    backgroundColor: colors.electric,
  },
  modeText: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  modeTextActive: {
    color: colors.void,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  note: {
    color: colors.inkMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  noteLeft: {
    textAlign: 'left',
  },
});
