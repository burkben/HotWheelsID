/**
 * Speedometer — the hero gauge.
 *
 * An SVG dial (track, colored speed zones, ticks, labels) with a needle animated
 * by Reanimated. The needle endpoint is computed inside a `useAnimatedProps`
 * worklet so updates run on the UI thread without React re-renders; new samples
 * spring in via `withSpring` for an interruptible, lively motion.
 *
 * Rendering choice (ADR-0009): react-native-svg now for rock-solid web + native
 * parity; the Skia flame/particle FX layer arrives in Phase 2b and will hook the
 * `isHot` threshold already plumbed here.
 */
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";

import { colors, fontSize, fontWeight } from "@/theme/tokens";
import {
  GAUGE_END_ANGLE,
  GAUGE_START_ANGLE,
  describeArc,
  makeTicks,
  polarToCartesian,
} from "./geometry";

const AnimatedLine = Animated.createAnimatedComponent(Line);

export interface SpeedZone {
  readonly from: number;
  readonly to: number;
  readonly color: string;
}

export interface SpeedometerProps {
  /** Live needle target in scale mph (animated). */
  value: number;
  /** Big digital readout in scale mph (the last recorded pass). */
  readoutMph: number;
  max: number;
  zones: readonly SpeedZone[];
  tickStep: number;
  /** Past this, the gauge is "hot" (flame FX hook for Phase 2b). */
  flameThreshold: number;
  size?: number;
}

export function Speedometer({
  value,
  readoutMph,
  max,
  zones,
  tickStep,
  flameThreshold,
  size = 300,
}: SpeedometerProps) {
  const stroke = 18;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - stroke / 2 - 2;
  const needleLength = r - stroke / 2 - 6;

  const angle = useSharedValue(GAUGE_START_ANGLE);

  useEffect(() => {
    const fraction = Math.max(0, Math.min(value, max)) / max;
    const target = GAUGE_START_ANGLE + fraction * (GAUGE_END_ANGLE - GAUGE_START_ANGLE);
    angle.value = withSpring(target, { damping: 13, stiffness: 95, mass: 0.7 });
  }, [value, max, angle]);

  const needleProps = useAnimatedProps(() => {
    "worklet";
    const a = ((angle.value - 90) * Math.PI) / 180;
    return {
      x2: cx + needleLength * Math.cos(a),
      y2: cy + needleLength * Math.sin(a),
    };
  });

  const ticks = makeTicks(cx, cy, r - stroke / 2, max, tickStep);
  const isHot = readoutMph >= flameThreshold;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Unfilled track */}
        <Path
          d={describeArc(cx, cy, r, GAUGE_START_ANGLE, GAUGE_END_ANGLE)}
          stroke={colors.track}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />

        {/* Colored speed zones */}
        {zones.map((zone) => {
          const startAngle =
            GAUGE_START_ANGLE +
            (Math.max(0, Math.min(zone.from, max)) / max) *
              (GAUGE_END_ANGLE - GAUGE_START_ANGLE);
          const endAngle =
            GAUGE_START_ANGLE +
            (Math.max(0, Math.min(zone.to, max)) / max) *
              (GAUGE_END_ANGLE - GAUGE_START_ANGLE);
          return (
            <Path
              key={`${zone.from}-${zone.to}`}
              d={describeArc(cx, cy, r, startAngle, endAngle)}
              stroke={zone.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              fill="none"
              opacity={0.9}
            />
          );
        })}

        {/* Ticks + labels */}
        <G>
          {ticks.map((tick) => (
            <Line
              key={`tick-${tick.value}`}
              x1={tick.outer.x}
              y1={tick.outer.y}
              x2={tick.inner.x}
              y2={tick.inner.y}
              stroke={colors.textMuted}
              strokeWidth={2}
            />
          ))}
          {ticks.map((tick) => (
            <SvgText
              key={`label-${tick.value}`}
              x={tick.label.x}
              y={tick.label.y + 4}
              fill={colors.textSecondary}
              fontSize={11}
              fontWeight="600"
              textAnchor="middle"
            >
              {tick.value}
            </SvgText>
          ))}
        </G>

        {/* Needle + hub */}
        <AnimatedLine
          x1={cx}
          y1={cy}
          // x2/y2 supplied by the animated worklet; static fallback avoids a
          // first-frame flash at the dial center.
          x2={polarToCartesian(cx, cy, needleLength, GAUGE_START_ANGLE).x}
          y2={polarToCartesian(cx, cy, needleLength, GAUGE_START_ANGLE).y}
          animatedProps={needleProps}
          stroke={isHot ? colors.accent : colors.accentBlue}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy} r={12} fill={colors.surface} stroke={colors.border} strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={4} fill={isHot ? colors.accent : colors.accentBlue} />
      </Svg>

      {/* Digital readout overlay */}
      <View pointerEvents="none" style={styles.readout}>
        <Text style={[styles.readoutValue, isHot && { color: colors.accent }]}>
          {Math.round(readoutMph)}
        </Text>
        <Text style={styles.readoutUnit}>scale mph</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  readout: {
    position: "absolute",
    bottom: "20%",
    alignItems: "center",
  },
  readoutValue: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: fontWeight.heavy,
    fontVariant: ["tabular-nums"],
    lineHeight: fontSize.display,
  },
  readoutUnit: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
