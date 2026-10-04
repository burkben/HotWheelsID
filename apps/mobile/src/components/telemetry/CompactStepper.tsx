import { Pressable, StyleSheet, View } from "react-native";

import { colorsR } from "@/theme/tokens";
import { RText } from "../redline/RText";
import { decorative } from "../redline/decorative";

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
    <View style={styles.stepper}>
      <View {...decorative} style={styles.frame} />
      <StepButton
        glyph="−"
        onPress={onDecrement}
        disabled={!canDecrement}
        accessibilityLabel={`${accessibilityLabel}, decrease`}
      />
      <RText variant="statValue" accessibilityLabel={`${accessibilityLabel}, ${value}`} style={styles.value} numberOfLines={1}>
        {value}
      </RText>
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
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <RText variant="statValue" style={styles.btnText}>{glyph}</RText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
  frame: { position: "absolute", top: 4, bottom: 4, left: 0, right: 0, backgroundColor: colorsR.inset, borderWidth: 1, borderColor: colorsR.fieldBorder },
  btn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  btnText: { color: colorsR.chalk, fontSize: 20, lineHeight: 24 },
  value: { minWidth: 56, textAlign: "center", color: colorsR.chalk, fontSize: 15, lineHeight: 20 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});
