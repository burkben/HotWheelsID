/**
 * A car's catalog photo with a graceful fallback. The wiki CDN occasionally 404s
 * or an entry simply has no usable image, so a failed/absent load collapses to a
 * neutral placeholder tile instead of a broken-image glyph.
 */
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/theme/tokens";

export function CarPhoto({
  uri,
  size,
  rounded = radius.md,
}: {
  uri: string | null | undefined;
  size: number;
  rounded?: number;
}) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: rounded };

  if (!uri || failed) {
    return (
      <View style={[styles.placeholder, box]}>
        <Text style={{ fontSize: size * 0.4, opacity: 0.5 }}>🏎️</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, box]}
      resizeMode="cover"
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
