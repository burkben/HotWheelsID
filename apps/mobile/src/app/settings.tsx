/**
 * Settings — durable app preferences (ADR-0006, Phase 3).
 *
 * Reads/writes {@link useSettingsStore}; every change persists through the store's
 * write-through sink (a `settings` KV table on the shared `redlineid.db`, migration
 * v4 — no native rebuild). When SQLite isn't in the build yet the edits still apply
 * for the session and simply aren't saved.
 *
 * Wired consumers: `playerName` + `defaultLaps` seed the Race setup screen, `haptics`
 * gates tactile feedback there and on Home, `reduceMotion` is OR'd with the OS setting
 * for race animations, and `mockModeDefault` chooses Home's initial transport.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { LAP_OPTIONS } from '@/race/raceEngine';
import { DEFAULT_SETTINGS, useSettingsStore } from '@/store/settingsStore';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const playerName = useSettingsStore((s) => s.playerName);
  const defaultLaps = useSettingsStore((s) => s.defaultLaps);
  const haptics = useSettingsStore((s) => s.haptics);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const mockModeDefault = useSettingsStore((s) => s.mockModeDefault);

  const setPlayerName = useSettingsStore((s) => s.setPlayerName);
  const setDefaultLaps = useSettingsStore((s) => s.setDefaultLaps);
  const setHaptics = useSettingsStore((s) => s.setHaptics);
  const setReduceMotion = useSettingsStore((s) => s.setReduceMotion);
  const setMockModeDefault = useSettingsStore((s) => s.setMockModeDefault);
  const reset = useSettingsStore((s) => s.reset);

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

  const selectLaps = (laps: number) => {
    if (laps === defaultLaps) return;
    setDefaultLaps(laps);
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
          nameDirty.current = false;
          setDraftName(DEFAULT_SETTINGS.playerName);
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing(2) }]}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹ Home</Text>
          </Pressable>
        </Link>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing(8) }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>Profile</Text>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>Player name</Text>
          <TextInput
            value={draftName}
            onChangeText={editName}
            onBlur={commitName}
            onSubmitEditing={commitName}
            placeholder={DEFAULT_SETTINGS.playerName}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={24}
            returnKeyType="done"
            autoCorrect={false}
          />
          <Text style={styles.hint}>Pre-fills the racer name when you start a race.</Text>
        </View>

        <Text style={styles.sectionLabel}>Racing</Text>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>Default laps</Text>
          <View style={styles.chips}>
            {LAP_OPTIONS.map((opt) => {
              const active = defaultLaps === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => selectLaps(opt)}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipNum, active && styles.chipTextActive]}>{opt}</Text>
                  <Text style={[styles.chipUnit, active && styles.chipTextActive]}>laps</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>The lap target selected by default on the race setup screen.</Text>
        </View>

        <Text style={styles.sectionLabel}>Feedback</Text>
        <View style={styles.card}>
          <ToggleRow
            label="Haptics"
            hint="Vibration on the countdown, each lap, and new-best passes."
            value={haptics}
            onValueChange={setHaptics}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Reduce motion"
            hint="Skip the countdown pulse and other animations (also honors the system setting)."
            value={reduceMotion}
            onValueChange={setReduceMotion}
          />
        </View>

        <Text style={styles.sectionLabel}>Startup</Text>
        <View style={styles.card}>
          <ToggleRow
            label="Start in demo mode"
            hint="Open Home on the in-app mock portal instead of scanning for live BLE."
            value={mockModeDefault}
            onValueChange={setMockModeDefault}
          />
        </View>

        <Pressable
          onPress={confirmReset}
          style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
        >
          <Text style={styles.resetText}>Reset to defaults</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.track, true: colors.accent }}
        thumbColor={colors.textPrimary}
        ios_backgroundColor={colors.track}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  back: { paddingVertical: spacing(1), paddingRight: spacing(1) },
  backText: { color: colors.accentBlue, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.heavy, flex: 1 },
  headerSpacer: { width: spacing(1) },
  content: { paddingHorizontal: spacing(5), gap: spacing(2), paddingTop: spacing(1) },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing(4),
    marginBottom: spacing(1),
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
    gap: spacing(2),
  },
  rowLabel: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  hint: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 18 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  chips: { flexDirection: 'row', gap: spacing(2) },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing(2.5),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  chipNum: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.heavy },
  chipUnit: { color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  chipTextActive: { color: colors.bg },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  toggleText: { flex: 1, gap: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing(1) },
  resetBtn: {
    marginTop: spacing(6),
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(3.5),
  },
  resetText: { color: colors.danger, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  pressed: { opacity: 0.7 },
});
