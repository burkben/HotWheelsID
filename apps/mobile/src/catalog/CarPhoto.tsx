/**
 * A car's catalog photo, bundled with the app.
 *
 * Artwork ships inside the binary rather than being fetched, so these render
 * instantly, work offline, and keep the app's "no network requests" promise
 * intact. Roughly a tenth of the catalog has no usable wiki photo, so an absent
 * image collapses to a neutral placeholder tile instead of a broken-image glyph.
 *
 * The box accepts either a square `size` shorthand or explicit dimensions, plus
 * an optional accent `ring`.
 */
import type { DimensionValue } from "react-native";
import { Image, StyleSheet, Text, View } from "react-native";

import { carArtwork } from "@/catalog/artwork";
import { colors, radius } from "@/theme/tokens";

export function CarPhoto({
  carId,
  size,
  width,
  height,
  aspectRatio,
  rounded = radius.md,
  ring = false,
  contentFit = "cover",
}: {
  /** Catalog id whose bundled artwork to show. Omit for an unidentified car. */
  carId?: string | null;
  /** Square shorthand — sets both width and height. */
  size?: number;
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  rounded?: number;
  /** Accent ring for identified/selected state. */
  ring?: boolean;
  contentFit?: "cover" | "contain";
}) {
  const source = carArtwork(carId);

  // Only keys common to both ViewStyle and ImageStyle, so the literal stays
  // assignable to the placeholder View *and* the Image without a style cast.
  const box = {
    ...(size != null ? { width: size, height: size } : null),
    ...(width != null ? { width } : null),
    ...(height != null ? { height } : null),
    ...(aspectRatio != null ? { aspectRatio } : null),
    borderRadius: rounded,
    ...(ring ? { borderWidth: 2, borderColor: colors.accent } : null),
  };

  if (!source) {
    const glyph = size != null ? size * 0.4 : 40;
    return (
      <View style={[styles.placeholder, box]}>
        <Text style={{ fontSize: glyph, opacity: 0.5 }}>🏎️</Text>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={[styles.photo, box]}
      resizeMode={contentFit}
      // Decorative: every surface showing a photo also renders the casting name.
      accessibilityIgnoresInvertColors
    />
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
  photo: {
    backgroundColor: colors.surfaceAlt,
  },
});
