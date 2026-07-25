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

/**
 * The box must end up with a definite height, so the three ways to express one
 * are mutually exclusive rather than free-form. A width alone would leave the
 * frame zero-height and the photo invisible.
 */
type Box =
  | { size: number; width?: never; height?: never; aspectRatio?: never }
  | { size?: never; width: DimensionValue; aspectRatio: number; height?: never }
  | { size?: never; width: DimensionValue; height: DimensionValue; aspectRatio?: never };

export function CarPhoto({
  carId,
  size,
  width,
  height,
  aspectRatio,
  rounded = radius.md,
  ring = false,
  contentFit = "cover",
  accessibilityLabel,
}: Box & {
  /** Catalog id whose bundled artwork to show. Omit for an unidentified car. */
  carId?: string | null;
  rounded?: number;
  /** Accent ring for identified/selected state. */
  ring?: boolean;
  contentFit?: "cover" | "contain";
  /** Label for the placeholder tile when a car has no bundled artwork. */
  accessibilityLabel?: string;
}) {
  const source = carArtwork(carId);

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
      <View style={[styles.placeholder, box]} accessible accessibilityLabel={accessibilityLabel}>
        <Text style={{ fontSize: glyph, opacity: 0.5 }}>🏎️</Text>
      </View>
    );
  }

  // The photo has to live inside a sized frame rather than carrying the box
  // itself. Bundled assets are 1x, so an <Image> reports its pixel height as its
  // intrinsic point height (640x364 -> 364pt); pairing that measurement with
  // `aspectRatio` makes Yoga derive the width from the height and ignore a
  // percentage width, blowing the box far past its column. A plain <View> has no
  // intrinsic size, so the same styles resolve correctly there.
  return (
    <View style={[styles.frame, box]}>
      <Image
        source={source}
        style={styles.photo}
        resizeMode={contentFit}
        // Decorative: every surface showing a photo also renders the casting name.
        accessibilityIgnoresInvertColors
      />
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
  frame: {
    backgroundColor: colors.surfaceAlt,
    // Keeps the photo inside the rounded corners and the accent ring.
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
});
