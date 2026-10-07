/**
 * Settings — durable app preferences (ADR-0006, Phase 3).
 *
 * Redline layout (SPEC §4.11 / `png/Settings.png`): portal card, numbered
 * sections 01–07, skew switches and a footer. Every preference
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
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

import { buildIdentityExport, exportIdentifications } from '@/catalog/identityExport';
import { useLayout } from '@/layout/useLayout';
import { LAP_OPTIONS } from '@/race/raceEngine';
import { DEFAULT_SETTINGS, useSettingsStore } from '@/store/settingsStore';
import { useIdentityStore } from '@/store/identityStore';
import { usePortalStore } from '@/store/portalStore';
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
import { RText, ScreenHeader, SkewSwitch, Wordmark } from '@/components/redline';
import { PortalCard } from '@/settings/PortalCard';
import { stepLapOption, versionLabel } from '@/settings/presentation';
import { colorsR, fontR } from '@/theme/tokens';

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

  const stepLaps = (direction: -1 | 1) => {
    const next = stepLapOption(LAP_OPTIONS, defaultLaps, direction);
    if (next === defaultLaps) return;
    setDefaultLaps(next as (typeof LAP_OPTIONS)[number]);
    tick();
  };

  const build = Platform.OS === 'ios' ? Constants.expoConfig?.ios?.buildNumber : Constants.expoConfig?.android?.versionCode;

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
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          column,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Settings"
          backLabel="More"
          onBack={() => (router.canGoBack() ? router.back() : router.navigate('/more'))}
        />

        <View style={styles.portal}>
          <PortalCard
            connection={connection}
            controlStatus={controlStatus}
            phase={portalPhase}
            mode={portalMode}
            manuallyDisconnected={manuallyDisconnected}
            onConnect={() => void controller.connect()}
            onRetry={() => void controller.retry()}
            onDisconnect={() => void controller.disconnect()}
          />
          <SettingGroup>
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
        </View>

        <SettingsSection title="Profile" index={1}>
          <SettingGroup>
            <SettingRow
              label="Player name"
              control={
                <TextInput
                  value={draftName}
                  onChangeText={editName}
                  onBlur={commitName}
                  onSubmitEditing={commitName}
                  placeholder={DEFAULT_SETTINGS.playerName}
                  placeholderTextColor={colorsR.inkMuted}
                  style={styles.input}
                  maxLength={24}
                  returnKeyType="done"
                  autoCorrect={false}
                  accessibilityLabel="Player name"
                  accessibilityHint="Pre-fills the racer name when you start a race."
                />
              }
            />
          </SettingGroup>
        </SettingsSection>

        <SettingsSection title="Racing" index={2}>
          <SettingGroup>
            <SettingRow
              label="Default laps"
              control={
                <CompactStepper
                  value={String(defaultLaps)}
                  onDecrement={() => stepLaps(-1)}
                  onIncrement={() => stepLaps(1)}
                  canDecrement={defaultLaps > LAP_OPTIONS[0]}
                  canIncrement={defaultLaps < LAP_OPTIONS[LAP_OPTIONS.length - 1]}
                  accessibilityLabel="Default laps"
                />
              }
            />
          </SettingGroup>
        </SettingsSection>

        <SettingsSection title="Speed" index={3}>
          <SettingGroup>
            <SettingRow
              label="Units"
              control={
                <TelemetrySegmentedControl
                  segments={(['mph', 'kmh'] as SpeedUnit[]).map((u) => ({
                    value: u,
                    label: speedUnitLabel(u).toUpperCase(),
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

        <SettingsSection title="Feedback" index={4}>
          <SettingGroup>
            <ToggleRow
              label="Haptics"
              hint="Vibration on the countdown, each lap, and new-best passes."
              value={haptics}
              onValueChange={setHaptics}
            />
            <ToggleRow
              label="Sound"
              hint="Race cues on the countdown, each lap, new-best laps, and finish."
              value={sound}
              onValueChange={setSound}
            />
            <ToggleRow
              label="Reduce motion"
              hint="Skips the countdown pulse and other animations. The system setting is honored too."
              value={reduceMotion}
              onValueChange={setReduceMotion}
            />
          </SettingGroup>
        </SettingsSection>

        <SettingsSection title="Startup" index={5}>
          <SettingGroup>
            <ToggleRow
              label="Start in demo mode"
              hint={canBle
                ? 'Simulated cars and speeds without a portal. Applies now and at every launch.'
                : 'Simulated cars and speeds are used because portal Bluetooth is unavailable on this device.'}
              showHint={!canBle}
              value={portalMode === 'demo'}
              disabled={!canBle || !portalReady}
              onValueChange={(enabled) => {
                tick();
                void controller.setMode(enabled ? 'demo' : 'live');
              }}
            />
          </SettingGroup>
        </SettingsSection>

        <SettingsSection title="Community" index={6}>
          <SettingGroup>
            <SettingRow
              label="Share car identities"
              hint="Only casting → catalog facts are shared, never your tags or collection."
              onPress={shareIdentifications}
              disabled={shareableCount === 0}
              chevron
              control={
                <RText variant="lapTime" style={[styles.value, shareableCount === 0 && styles.dim]}>
                  {shareableCount === 0 ? '—' : `${shareableCount}`}
                </RText>
              }
              accessibilityLabel={
                shareableCount === 0
                  ? 'Share car identities. Identify a car first.'
                  : `Share ${shareableCount} identified castings.`
              }
            />
            <SettingRow
              label="How to contribute"
              chevron
              onPress={() => {
                void WebBrowser.openBrowserAsync(CONTRIBUTING_URL);
              }}
              accessibilityHint="Opens the guide: add the shared file to the community folder on GitHub and open a pull request."
            />
          </SettingGroup>
        </SettingsSection>

        <SettingsSection title="System" index={7}>
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

        <View style={styles.footer}>
          <View style={styles.wordmark}><Wordmark size={22} /></View>
          <View style={styles.versionLine}>
            <RText variant="eyebrow" style={styles.version}>{versionLabel(Constants.expoConfig?.version, build)} · </RText>
            <Pressable onPress={() => router.push('/credits')} accessibilityRole="link" accessibilityLabel="Credits and licenses" hitSlop={12}>
              <RText variant="eyebrow" style={[styles.version, { color: colorsR.electric }]}>CREDITS</RText>
            </Pressable>
          </View>
          <RText variant="bodySmall" style={styles.disclaimer}>
            Independent community project. Not affiliated with, endorsed by, or sponsored by Mattel, Inc.
          </RText>
        </View>
      </ScrollView>
    </View>
  );
}

/** A skew switch on the shared label-line geometry. Hints stay spoken; `showHint` prints them. */
function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  disabled = false,
  showHint = false,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  showHint?: boolean;
}) {
  return (
    <SettingRow
      label={label}
      hint={showHint ? hint : undefined}
      disabled={disabled}
      accessibilityHint={hint}
      control={<SkewSwitch value={value} onValueChange={onValueChange} disabled={disabled} accessibilityLabel={label} />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  content: { paddingHorizontal: 16, width: '100%', alignSelf: 'center' },
  portal: { marginTop: 22, gap: 2 },
  input: {
    width: 150,
    height: 40,
    paddingHorizontal: 12,
    textAlign: 'right',
    backgroundColor: colorsR.inset,
    borderColor: colorsR.fieldBorder,
    borderWidth: 1,
    color: colorsR.chalk,
    fontFamily: fontR.body,
    fontSize: 16,
  },
  value: { fontSize: 16, lineHeight: 20, color: colorsR.inkSecondary },
  dim: { color: colorsR.inkMuted },
  footer: { alignItems: 'center', gap: 8, marginTop: 34 },
  wordmark: { opacity: 0.6 },
  versionLine: { flexDirection: 'row', alignItems: 'center', minHeight: 24 },
  version: { fontFamily: fontR.hud, fontSize: 11, letterSpacing: 1.5, color: colorsR.inkMuted },
  disclaimer: { fontSize: 12, lineHeight: 17, color: colorsR.inkMuted, textAlign: 'center', maxWidth: 300 },
});
