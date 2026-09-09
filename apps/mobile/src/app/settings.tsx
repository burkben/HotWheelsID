/**
 * Settings — durable app preferences (ADR-0006, Phase 3).
 *
 * Rebuilt on the Trackside Telemetry row system (proposal B). Every preference
 * uses the shared `SettingRow` geometry: the control is a sibling of the label
 * on a ≥44pt "label line", and the hint is a sibling of that line — never of
 * the control. That single rule fixes the alignment bugs audited in
 * docs/design/ui-overhaul/00-research.md §5 (floating switches/stepper, the
 * overstretched flex chips, compounded section spacing, cramped cards, the
 * orphaned reset, and the off-center header).
 *
 * Uses the same eight settings keys and persistence. Portal controls use the
 * existing controller; changing demo mode takes effect now and at next launch.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

import { buildIdentityExport, exportIdentifications } from '@/catalog/identityExport';
import { useLayout } from '@/layout/useLayout';
import { LAP_OPTIONS } from '@/race/raceEngine';
import { DEFAULT_SETTINGS, useSettingsStore } from '@/store/settingsStore';
import { useIdentityStore } from '@/store/identityStore';
import { usePortalStore } from '@/store/portalStore';
import { StatusPill } from '@/components/StatusPill';
import { usePortalController, usePortalControllerActions } from '@/portal/PortalControllerProvider';
import {
  CALIBRATION_STEP,
  MAX_CALIBRATION,
  MIN_CALIBRATION,
  formatCalibration,
  speedUnitLabel,
  type SpeedUnit,
} from '@/speed/format';
import {
  CompactStepper,
  SettingGroup,
  SettingRow,
  SettingsSection,
  TelemetrySegmentedControl,
} from '@/components/telemetry';
import { colors, fontSize, fontWeight, radiusT, spacing } from '@/theme/tokens';

/**
 * Sharing emits a JSON payload through the OS share sheet, which on its own
 * gives no clue where the file is meant to go. This guide is the other half of
 * the loop: it explains the pull-request flow that folds a payload into the seed.
 */
const CONTRIBUTING_URL = 'https://github.com/burkben/HotWheelsID/blob/main/community/README.md';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const column = { maxWidth: layout.contentMaxWidth };

  const playerName = useSettingsStore((s) => s.playerName);
  const defaultLaps = useSettingsStore((s) => s.defaultLaps);
  const haptics = useSettingsStore((s) => s.haptics);
  const sound = useSettingsStore((s) => s.sound);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);

  const setPlayerName = useSettingsStore((s) => s.setPlayerName);
  const setDefaultLaps = useSettingsStore((s) => s.setDefaultLaps);
  const setHaptics = useSettingsStore((s) => s.setHaptics);
  const setSound = useSettingsStore((s) => s.setSound);
  const setReduceMotion = useSettingsStore((s) => s.setReduceMotion);
  const setSpeedUnit = useSettingsStore((s) => s.setSpeedUnit);
  const setSpeedCalibration = useSettingsStore((s) => s.setSpeedCalibration);
  const reset = useSettingsStore((s) => s.reset);

  const connection = usePortalStore((s) => s.connection);
  const controlStatus = usePortalStore((s) => s.controlStatus);
  const portalMode = usePortalController((s) => s.mode);
  const portalPhase = usePortalController((s) => s.phase);
  const portalReady = usePortalController((s) => s.ready);
  const canBle = usePortalController((s) => s.canBle);
  const manuallyDisconnected = usePortalController((s) => s.manuallyDisconnected);
  const controller = usePortalControllerActions();

  // Player name edits commit on blur/submit (one persist, not one per keystroke).
  // `nameDirty` lets a late hydration populate the field, but never clobber an edit
  // in progress — and stops a stale default draft overwriting the persisted name if
  // Settings is opened before persistence finishes loading.
  const [draftName, setDraftName] = useState(playerName);
  const [editingName, setEditingName] = useState(false);
  const nameDirty = useRef(false);
  useEffect(() => {
    if (!nameDirty.current) setDraftName(playerName);
  }, [playerName]);

  const editName = (text: string) => {
    nameDirty.current = true;
    setDraftName(text);
  };

  const tick = () => {
    if (Platform.OS !== 'web' && useSettingsStore.getState().haptics) {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const commitName = () => {
    const next = draftName.trim() || DEFAULT_SETTINGS.playerName;
    if (next !== draftName) setDraftName(next);
    if (next !== playerName) setPlayerName(next);
    nameDirty.current = false; // draft now matches the store; allow future re-sync
    setEditingName(false);
  };

  const nudgeCalibration = (delta: number) => {
    const raw = Number((speedCalibration + delta).toFixed(2));
    const clamped = Math.min(MAX_CALIBRATION, Math.max(MIN_CALIBRATION, raw));
    if (clamped === speedCalibration) return;
    setSpeedCalibration(clamped);
    tick();
  };

  // Community identity contributions (ADR-0014): only the user's own picks that
  // resolve to a bundled catalog car are shareable. Recomputed off the identity
  // snapshot so the button count/enabled-state stays live.
  const identifications = useIdentityStore((s) => s.identifications);
  const shareableCount = useMemo(
    () => exportIdentifications(identifications).length,
    [identifications],
  );

  const shareIdentifications = () => {
    if (shareableCount === 0) return;
    const payload = buildIdentityExport(identifications);
    Share.share({ message: JSON.stringify(payload, null, 2) }).catch(() => {});
    tick();
  };

  const confirmReset = () => {
    Alert.alert('Reset settings?', 'Restore every preference to its default value.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          reset();
          void controller.setMode(DEFAULT_SETTINGS.mockModeDefault ? 'demo' : 'live');
          nameDirty.current = false;
          setDraftName(DEFAULT_SETTINGS.playerName);
          setEditingName(false);
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing(2) }]}>
      {/* Balanced 3-slot header: fixed-width sides so the title is optically
          centered regardless of the back button's width (fixes §5.1). */}
      <View style={[styles.header, column]}>
        <View style={styles.headerSide}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.backChip, pressed && styles.pressed]}
          >
            <Text style={styles.backChipText}>‹</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          column,
          { paddingBottom: insets.bottom + spacing(8) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <SettingsSection title="Portal" style={styles.firstSection}>
          <SettingGroup>
            <SettingRow
              label="Connection"
              hint="Tap the status to connect, retry, or pause the portal."
              control={
                <StatusPill
                  connection={connection}
                  controlStatus={controlStatus}
                  phase={portalPhase}
                  mode={portalMode}
                  manuallyDisconnected={manuallyDisconnected}
                  onConnect={() => void controller.connect()}
                  onRetry={() => void controller.retry()}
                  onDisconnect={() => void controller.disconnect()}
                />
              }
            />
            <ToggleRow
              label="Demo mode"
              hint={canBle
                ? 'Try simulated cars and speeds without a portal. Your choice is remembered.'
                : 'Simulated cars and speeds are used because portal Bluetooth is unavailable on this device.'}
              value={portalMode === 'demo'}
              disabled={!canBle || !portalReady}
              onValueChange={(enabled) => {
                tick();
                void controller.setMode(enabled ? 'demo' : 'live');
              }}
            />
            {portalMode === 'demo' && (
              <SettingRow
                label="Trigger a sample pass"
                onPress={() => controller.triggerDemoPass()}
                disabled={connection !== 'connected'}
                chevron
              />
            )}
            <SettingRow
              label="Connection details"
              onPress={() => router.push('/live')}
              chevron
            />
          </SettingGroup>
        </SettingsSection>

        <SettingsSection title="Profile">
          <SettingGroup>
            {editingName ? (
              <View style={styles.editRow}>
                <TextInput
                  value={draftName}
                  onChangeText={editName}
                  onBlur={commitName}
                  onSubmitEditing={commitName}
                  placeholder={DEFAULT_SETTINGS.playerName}
                  placeholderTextColor={colors.inkMuted}
                  style={styles.input}
                  maxLength={24}
                  returnKeyType="done"
                  autoCorrect={false}
                  autoFocus
                  accessibilityLabel="Player name"
                />
              </View>
            ) : (
              <SettingRow
                label="Player name"
                hint="Pre-fills the racer name when you start a race."
                onPress={() => setEditingName(true)}
                control={<Text style={styles.valueText}>{playerName}</Text>}
                accessibilityLabel={`Player name, ${playerName}. Double tap to edit.`}
              />
            )}
          </SettingGroup>
        </SettingsSection>

        <SettingsSection title="Racing">
          <SettingGroup>
            <SettingRow
              label="Default laps"
              hint="The lap target selected by default on the race setup screen."
              control={
                <TelemetrySegmentedControl
                  accent="flame"
                  segments={LAP_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
                  value={defaultLaps}
                  onChange={(n) => {
                    setDefaultLaps(n);
                    tick();
                  }}
                />
              }
            />
          </SettingGroup>
        </SettingsSection>

        <SettingsSection title="Speed">
          <SettingGroup>
            <SettingRow
              label="Units"
              control={
                <TelemetrySegmentedControl
                  segments={(['mph', 'kmh'] as SpeedUnit[]).map((u) => ({
                    value: u,
                    label: speedUnitLabel(u),
                  }))}
                  value={speedUnit}
                  onChange={(u) => {
                    setSpeedUnit(u);
                    tick();
                  }}
                />
              }
            />
            <SettingRow
              label="Calibration"
              hint="Trim displayed speeds to match a known reference. Recorded data and goals stay unchanged."
              control={
                <CompactStepper
                  value={formatCalibration(speedCalibration)}
                  onDecrement={() => nudgeCalibration(-CALIBRATION_STEP)}
                  onIncrement={() => nudgeCalibration(CALIBRATION_STEP)}
                  canDecrement={speedCalibration > MIN_CALIBRATION}
                  canIncrement={speedCalibration < MAX_CALIBRATION}
                  accessibilityLabel="Speed calibration"
                />
              }
            />
          </SettingGroup>
        </SettingsSection>

        <SettingsSection title="Feedback">
          <SettingGroup>
            <ToggleRow
              label="Haptics"
              hint="Vibration on the countdown, each lap, and new-best passes."
              value={haptics}
              onValueChange={setHaptics}
            />
            <ToggleRow
              label="Sound"
              hint="Play race cues on the countdown, each lap, new-best laps, and finish."
              value={sound}
              onValueChange={setSound}
            />
            <ToggleRow
              label="Reduce motion"
              hint="Skip the countdown pulse and other animations (also honors the system setting)."
              value={reduceMotion}
              onValueChange={setReduceMotion}
            />
          </SettingGroup>
        </SettingsSection>

        <SettingsSection title="Community">
          <SettingGroup>
            <SettingRow
              label="Share car identities"
              hint="Contribute the castings you've identified to the community seed — only casting → catalog facts are shared, never your tags or collection."
              onPress={shareIdentifications}
              disabled={shareableCount === 0}
              control={
                <Text style={[styles.valueText, shareableCount === 0 && styles.dimText]}>
                  {shareableCount === 0 ? '—' : `${shareableCount}`}
                </Text>
              }
              accessibilityLabel={
                shareableCount === 0
                  ? 'Share car identities. Identify a car first.'
                  : `Share ${shareableCount} identified castings.`
              }
            />
            <SettingRow
              label="How to contribute"
              hint="Sharing hands you a JSON file. Add it to the community folder on GitHub and open a pull request — the guide has the steps."
              chevron
              onPress={() => {
                void WebBrowser.openBrowserAsync(CONTRIBUTING_URL);
              }}
            />
          </SettingGroup>
        </SettingsSection>

        <SettingsSection title="System">
          <SettingGroup>
            <SettingRow
              label="Reset to defaults"
              destructive
              onPress={confirmReset}
              accessibilityLabel="Reset settings to defaults"
              accessibilityHint="Restores every preference to its default value."
            />
          </SettingGroup>
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

/** A switch row on the shared label-line geometry. */
function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <SettingRow
      label={label}
      hint={hint}
      control={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          accessibilityLabel={label}
          accessibilityHint={hint}
          trackColor={{ false: colors.panelInset, true: colors.electric }}
          thumbColor={colors.ink}
          ios_backgroundColor={colors.panelInset}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.void },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    width: '100%',
    alignSelf: 'center',
  },
  headerSide: { width: 64, alignItems: 'flex-start' },
  backChip: {
    width: 34,
    height: 34,
    borderRadius: radiusT.pill,
    backgroundColor: colors.panelSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChipText: { color: colors.electric, fontSize: 20, fontWeight: fontWeight.bold, marginTop: -2 },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.ink,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
  },
  content: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(1),
    width: '100%',
    alignSelf: 'center',
  },
  firstSection: { marginTop: spacing(2) },
  editRow: {
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(4),
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.panelInset,
    borderColor: colors.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusT.field,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
    color: colors.ink,
    fontSize: fontSize.md,
  },
  valueText: {
    color: colors.inkSecondary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  dimText: { color: colors.inkMuted },
  pressed: { opacity: 0.7 },
});
