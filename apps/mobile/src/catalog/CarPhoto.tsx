/**
 * A local placeholder for catalog art.
 *
 * Public releases do not bundle or fetch third-party wiki images because the
 * snapshot lacks reliable per-file provenance. The box accepts either a square
 * `size` shorthand or explicit dimensions, plus an optional accent `ring`.
 */
import type { DimensionValue } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/theme/tokens";

export function CarPhoto({
  size,
  width,
  height,
  aspectRatio,
  rounded = radius.md,
  ring = false,
}: {
  /** Square shorthand — sets both width and height. */
  size?: number;
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  rounded?: number;
  /** Accent ring for identified/selected state. */
  ring?: boolean;
}) {
  const box = {
    ...(size != null ? { width: size, height: size } : null),
    ...(width != null ? { width } : null),
    ...(height != null ? { height } : null),
    ...(aspectRatio != null ? { aspectRatio } : null),
    borderRadius: rounded,
    ...(ring ? { borderWidth: 2, borderColor: colors.accent } : null),
  };

  const glyph = size != null ? size * 0.4 : 40;
  return (
    <View style={[styles.placeholder, box]}>
      <Text style={{ fontSize: glyph, opacity: 0.5 }}>🏎️</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
