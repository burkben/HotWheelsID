/**
 * A car's catalog photo with a graceful fallback. The wiki CDN occasionally 404s
 * or an entry simply has no usable image, so a failed/absent load collapses to a
 * neutral placeholder tile instead of a broken-image glyph.
 *
 * Backed by `expo-image` for a soft fade-in and on-disk caching — the catalog
 * hot-links the wiki CDN, so cached photos make the Garage/Identify grids feel
 * instant on repeat views. The box accepts either a square `size` shorthand or
 * explicit `width`/`height`/`aspectRatio` (e.g. a full-width detail hero), plus an
 * optional accent `ring` to mark an identified/selected car as "alive".
 */
import { useState } from "react";
import type { DimensionValue } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { colors, radius } from "@/theme/tokens";

export function CarPhoto({
  uri,
  size,
  width,
  height,
  aspectRatio,
  rounded = radius.md,
  ring = false,
  contentFit = "cover",
  reduceMotion = false,
  accessibilityLabel,
}: {
  uri: string | null | undefined;
  /** Square shorthand — sets both width and height. */
  size?: number;
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  rounded?: number;
  /** Accent ring for identified/selected state. */
  ring?: boolean;
  contentFit?: "cover" | "contain";
  reduceMotion?: boolean;
  accessibilityLabel?: string;
}) {
  const [failed, setFailed] = useState(false);

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

  if (!uri || failed) {
    const glyph = size != null ? size * 0.4 : 40;
    return (
      <View style={[styles.placeholder, box]} accessible accessibilityLabel={accessibilityLabel}>
        <Text style={{ fontSize: glyph, opacity: 0.5 }}>🏎️</Text>
      </View>
    );
  }

  return (
    <Image
      source={uri}
      style={[styles.image, box]}
      contentFit={contentFit}
      transition={reduceMotion ? 0 : 200}
      cachePolicy="disk"
      accessible
      accessibilityLabel={accessibilityLabel}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceAlt },
  placeholder: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
