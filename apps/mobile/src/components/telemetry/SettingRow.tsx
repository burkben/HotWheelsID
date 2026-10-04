/**
 * Settings telemetry rows — encode the exact grouped-list geometry so the
 * alignment bugs in docs/design/ui-overhaul/00-research.md §5 cannot regress.
 *
 * The one rule that does most of the work (proposal B §Settings):
 *   The control is a sibling of the LABEL inside a ≥44pt "label line"; the hint
 *   is a sibling of that line box, never of the control.
 * So a Switch / segmented control / stepper always sits on the label baseline,
 * vertically centered with the label — never floating mid-block against a
 * two-line label+hint stack.
 *
 * - SettingGroup: square pit-lane groups with inset dividers.
 * - SettingRow: label + trailing control on one line; optional hint below.
 * - SettingsSection: a label + group, owning the only vertical rhythm (22/8pt).
 */
import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { colorsR, fontR } from "@/theme/tokens";
import { RText } from "../redline/RText";
import { SectionHeader } from "../redline/Headers";
import { decorative } from "../redline/decorative";

/** The inset grouped card. Rows are children; dividers are drawn between them. */
export function SettingGroup({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  return (
    <View style={[styles.group, style]}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 && <View style={styles.divider} />}
          {child}
        </View>
      ))}
    </View>
  );
}

export interface SettingRowProps {
  label: string;
  /** Optional supporting copy, rendered below the label line in secondary. */
  hint?: string;
  /** Trailing control (Switch, TelemetrySegmentedControl, CompactStepper, value…). */
  control?: ReactNode;
  /** Render the whole row as a tappable navigation/action row (chevron). */
  onPress?: () => void;
  /** Show a trailing chevron (navigation rows). */
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function SettingRow({
  label,
  hint,
  control,
  onPress,
  chevron = false,
  destructive = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: SettingRowProps) {
  const inner = (
    <>
      <View style={styles.textCol}>
        {/* Label line: label left, control right, both centered on this line. */}
        <View style={styles.labelLine}>
          <RText
            style={[styles.label, destructive && styles.labelDestructive, disabled && styles.dim]}
          >
            {label}
          </RText>
          {control ? <View style={styles.control}>{control}</View> : null}
          {chevron ? <RText {...decorative} style={styles.chevron}>›</RText> : null}
        </View>
        {/* Hint is a sibling of the label line, aligned to the label column. */}
        {hint ? (
          <RText variant="bodySmall" style={[styles.hint, disabled && styles.dim]}>{hint}</RText>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {inner}
      </Pressable>
    );
  }
  return (
    <View
      style={styles.row}
      // Keep nested switches and buttons reachable individually by VoiceOver.
      accessible={false}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {inner}
    </View>
  );
}

/** A section header + its group, owning the section's vertical rhythm. */
export function SettingsSection({
  title,
  children,
  style,
  index,
}: PropsWithChildren<{ title: string; style?: ViewStyle; index?: string | number }>) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionLabel}><SectionHeader title={title} index={index} /></View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  sectionLabel: { marginBottom: 8 },
  group: { backgroundColor: colorsR.pitLane, borderRadius: 0, overflow: "hidden" },
  divider: { height: 1, backgroundColor: colorsR.divider, marginLeft: 14 },
  row: { paddingVertical: 5, paddingHorizontal: 14, minHeight: 54, justifyContent: "center" },
  textCol: { flex: 1, minWidth: 0 },
  labelLine: { flexDirection: "row", alignItems: "center", minHeight: 44, gap: 12 },
  label: { flex: 1, color: colorsR.chalk, fontFamily: fontR.bodyMedium, fontSize: 16, lineHeight: 23.2 },
  labelDestructive: { color: colorsR.destructiveInk },
  control: { flexShrink: 0, justifyContent: "center" },
  chevron: { color: colorsR.inkMuted, fontSize: 24, marginLeft: 4 },
  hint: { color: colorsR.inkSecondary, fontSize: 13, lineHeight: 18.2, marginTop: 4, marginBottom: 7 },
  pressed: { opacity: 0.7 },
  dim: { opacity: 0.5 },
});
