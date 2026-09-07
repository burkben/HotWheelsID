/**
 * CompactStepper — the calibration `− value +` control.
 *
 * Sits on a SettingRow's label line (right-aligned, vertically centered), so it
 * no longer "hangs" against a tall label+hint block the way the old 48pt
 * centered stepper did (research §5.3). Visible buttons are 30pt but every hit
 * box is expanded to 44pt via hitSlop. The value is tabular and never reflows.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSizeT, fontWeight, radiusT } from "@/theme/tokens";

export interface CompactStepperProps {
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
  accessibilityLabel: string;
}

export function CompactStepper({
  value,
  onDecrement,
  onIncrement,
  canDecrement,
  canIncrement,
  accessibilityLabel,
}: CompactStepperProps) {
  return (
    <View style={styles.stepper} accessibilityLabel={accessibilityLabel} accessibilityRole="adjustable">
      <StepButton
        glyph="−"
        onPress={onDecrement}
        disabled={!canDecrement}
        accessibilityLabel={`${accessibilityLabel}, decrease`}
      />
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <StepButton
        glyph="+"
        onPress={onIncrement}
        disabled={!canIncrement}
        accessibilityLabel={`${accessibilityLabel}, increase`}
      />
    </View>
  );
}

function StepButton({
  glyph,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  glyph: string;
  onPress: () => void;
  disabled: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.btnText}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  btn: {
    width: 30,
    height: 30,
    borderRadius: radiusT.field,
    backgroundColor: colors.panelInset,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: colors.ink,
    fontSize: fontSizeT.lg,
    fontWeight: fontWeight.bold,
    lineHeight: fontSizeT.lg,
  },
  value: {
    minWidth: 58,
    textAlign: "center",
    color: colors.ink,
    fontFamily: fontFamily.telemetry,
    fontSize: fontSizeT.md,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
});
