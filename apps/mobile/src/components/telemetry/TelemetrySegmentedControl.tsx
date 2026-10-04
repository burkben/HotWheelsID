import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { colorsR, fontR } from "@/theme/tokens";
import { RText } from "../redline/RText";
import { SkewBox } from "../redline/SkewBox";
import { decorative } from "../redline/decorative";
import { webSpacePress } from "../redline/webSpacePress";
import { useTelemetryMotion } from "./useTelemetryMotion";

export interface Segment<T> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

export interface TelemetrySegmentedControlProps<T> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Retained for caller compatibility; Redline selected segments use chalk. */
  accent?: "electric" | "flame";
}

export function TelemetrySegmentedControl<T extends string | number>({
  segments,
  value,
  onChange,
}: TelemetrySegmentedControlProps<T>) {
  const { reduceMotion, timing } = useTelemetryMotion();
  const activeIndex = Math.max(0, segments.findIndex((s) => s.value === value));

  // Let native text determine each segment's width. flex: 1 inside an intrinsic
  // rail gives Yoga a zero text basis, clipping every label on iOS. Measure the
  // actual segments so the indicator also fits choices with different widths.
  const [frames, setFrames] = useState<Record<number, { x: number; width: number }>>({});
  const selectedX = frames[activeIndex]?.x ?? 2;
  const selectedWidth = frames[activeIndex]?.width ?? 0;

  const indicatorX = useSharedValue(selectedX);
  const indicatorWidth = useSharedValue(selectedWidth);
  useEffect(() => {
    indicatorX.value = reduceMotion ? selectedX : withTiming(selectedX, timing);
    indicatorWidth.value = reduceMotion ? selectedWidth : withTiming(selectedWidth, timing);
  }, [selectedX, selectedWidth, reduceMotion, timing, indicatorX, indicatorWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }, { skewX: "-12deg" }],
    width: indicatorWidth.value,
  }));

  return (
    <View style={styles.rail} accessibilityRole="tablist">
      {segments.map((seg, index) => {
        const selected = seg.value === value;
        return (
          <Pressable
            key={String(seg.value)}
            {...webSpacePress(() => onChange(seg.value))}
            onLayout={({ nativeEvent: { layout } }) => {
              const { x, width } = layout;
              setFrames((previous) =>
                previous[index]?.x === x && previous[index]?.width === width
                  ? previous
                  : { ...previous, [index]: { x, width } },
              );
            }}
            onPress={() => onChange(seg.value)}
            accessibilityRole="tab"
            accessibilityLabel={seg.accessibilityLabel ?? String(seg.label)}
            accessibilityState={{ selected }}
            aria-selected={selected}
            style={({ pressed }) => [styles.segment, pressed && styles.pressed]}
          >
            {!selected && <SkewBox style={styles.segmentBackground} />}
            <RText variant="chip" style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
              {seg.label}
            </RText>
          </Pressable>
        );
      })}
      {selectedWidth > 0 && (
        <Animated.View
          {...decorative}
          style={[styles.indicator, indicatorStyle]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { position: "relative", flexDirection: "row", alignSelf: "flex-start", gap: 4, marginHorizontal: 4 },
  indicator: { position: "absolute", left: 0, top: 5, bottom: 5, backgroundColor: colorsR.chalk, zIndex: 0 },
  segment: { flexShrink: 0, minWidth: 44, minHeight: 44, zIndex: 1, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  segmentBackground: { position: "absolute", top: 5, bottom: 5, left: 0, right: 0, backgroundColor: colorsR.steel },
  label: { color: colorsR.inkSecondary, fontFamily: fontR.hudBold, fontSize: 13, letterSpacing: 0, zIndex: 1 },
  labelActive: { color: colorsR.asphalt },
  pressed: { opacity: 0.7 },
});
