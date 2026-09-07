/**
 * TelemetrySurface — the glass/fallback adapter for the Trackside Telemetry UI.
 *
 * Renders `expo-glass-effect`'s `GlassView` only when liquid glass is genuinely
 * available *and* the user has not enabled Reduce Transparency; otherwise it
 * renders an opaque, designed fallback (`colors.panelSolid` + hairline + top
 * highlight) with identical geometry. Glass is progressive enhancement — it is
 * never a legibility dependency, and we never animate its parent opacity
 * (see docs/design/ui-overhaul/02-proposal-trackside-telemetry.md).
 */
import { useEffect, useState, type PropsWithChildren } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";

import { colors, radiusT } from "@/theme/tokens";

export interface TelemetrySurfaceProps {
  /** Corner radius; defaults to the telemetry card radius (12). */
  radius?: number;
  /** When true, force the opaque fallback (used for tests / reduce-transparency). */
  forceFallback?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/** True only when native glass is safe to render on this device. */
function glassSupported(): boolean {
  if (Platform.OS !== "ios") return false;
  try {
    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

export function TelemetrySurface({
  radius = radiusT.card,
  forceFallback = false,
  style,
  contentStyle,
  children,
}: PropsWithChildren<TelemetrySurfaceProps>) {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((v) => mounted && setReduceTransparency(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", (v) =>
      setReduceTransparency(v),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const useGlass = !forceFallback && !reduceTransparency && glassSupported();
  const frame = { borderRadius: radius, overflow: "hidden" as const };

  if (useGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={colors.glassFill}
        colorScheme="dark"
        isInteractive={false}
        style={[frame, style]}
      >
        <View style={[styles.inner, contentStyle]}>{children}</View>
      </GlassView>
    );
  }

  return (
    <View style={[frame, styles.fallback, style]}>
      {/* One-pixel inner top highlight, so the fallback still reads as a lit surface. */}
      <View pointerEvents="none" style={[styles.highlight, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.panelSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.glassHighlight,
  },
  inner: {
    flexShrink: 1,
  },
});
