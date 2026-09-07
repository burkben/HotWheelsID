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
 * - SettingGroup: the inset card (hairline, 10pt radius) with inset dividers.
 * - SettingRow: label + trailing control on one line; optional hint below.
 * - SettingsSection: a label + group, owning the only vertical rhythm (24/8pt).
 */
import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors, fontSize, fontWeight, radiusT, spacing } from "@/theme/tokens";

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
          <Text
            style={[styles.label, destructive && styles.labelDestructive, disabled && styles.dim]}
            numberOfLines={2}
          >
            {label}
          </Text>
          {control ? <View style={styles.control}>{control}</View> : null}
          {chevron ? <Text style={styles.chevron}>›</Text> : null}
        </View>
        {/* Hint is a sibling of the label line, aligned to the label column. */}
        {hint ? (
          <Text style={[styles.hint, disabled && styles.dim]}>{hint}</Text>
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
      accessible={!!control}
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
}: PropsWithChildren<{ title: string; style?: ViewStyle }>) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    // The single source of section rhythm: 24pt before, 8pt after the label.
    marginTop: spacing(6),
  },
  sectionLabel: {
    color: colors.inkMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: spacing(2),
    marginLeft: spacing(3),
  },
  group: {
    backgroundColor: colors.panelSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderRadius: radiusT.group,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    // Inset to the label column, not full-bleed.
    marginLeft: spacing(4),
  },
  row: {
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(4),
    minHeight: 44,
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  labelLine: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 30,
    gap: spacing(3),
  },
  label: {
    flex: 1,
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    lineHeight: 21,
  },
  labelDestructive: {
    color: colors.fault,
  },
  control: {
    flexShrink: 0,
    justifyContent: "center",
  },
  chevron: {
    color: colors.inkMuted,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    marginLeft: spacing(1),
  },
  hint: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing(1),
  },
  pressed: { opacity: 0.7 },
  dim: { opacity: 0.5 },
});
