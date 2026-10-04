/**
 * Speedometer — the hero gauge.
 *
 * An SVG dial (track, colored speed zones, ticks, labels) with a needle animated
 * by Reanimated. The needle endpoint is computed inside a `useAnimatedProps`
 * worklet so updates run on the UI thread without React re-renders; new samples
 * animate from the current angle without JavaScript timers.
 *
 * Rendering choice (ADR-0009 / ADR-0010): react-native-svg for rock-solid web +
 * native parity. The Phase 2b flame/particle FX (`FlameField`) is also SVG, hung
 * off the `flameThreshold` already plumbed here; a Skia particle renderer remains
 * the eventual upgrade (ADR-0005) once it can be verified on a device.
 */
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";

import { colors, fontFamily, fontSize, fontWeight } from "@/theme/tokens";
import {
  DEFAULT_SPEED_DISPLAY,
  formatSpeedValue,
  speedUnitLabel,
  type SpeedDisplay,
} from "@/speed/format";
import { useTelemetryMotion } from "@/components/telemetry/useTelemetryMotion";
import { RedlineGauge } from "./RedlineGauge";
import { FlameField } from "./FlameField";
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
  /** TV and existing callers retain the original needle renderer. */
  variant?: "needle" | "redline";
  newBest?: boolean;
  /** Live needle target in scale mph (animated). */
  value: number;
  /** Accepted pass ID: retrigger a sweep even when two passes have equal speeds. */
  sampleKey?: number;
  /** Big digital readout in scale mph (the last recorded pass). */
  readoutMph: number;
  max: number;
  zones: readonly SpeedZone[];
  tickStep: number;
  /** Past this, the gauge is "hot" (flame FX hook for Phase 2b). */
  flameThreshold: number;
  size?: number;
  /** Unit + calibration for the readout and tick labels (needle stays canonical). */
  display?: SpeedDisplay;
  /** App-level override, OR'd with the operating-system preference. */
  reduceMotion?: boolean;
  /**
   * Needle behavior:
   * - "sweep" (default): a one-off pass. The needle ramps up through the speed,
   *   holds a beat at the peak, then coasts back to rest — all on the UI thread.
   * - "track": continuous racing. The needle glides directly from one reading to
   *   the next and stays there; it never returns to zero between passes.
   */
  mode?: "sweep" | "track";
}

export function Speedometer({
  value,
  variant = "needle",
  newBest = false,
  sampleKey,
  readoutMph,
  max,
  zones,
  tickStep,
  flameThreshold,
  size = 300,
  display = DEFAULT_SPEED_DISPLAY,
  reduceMotion: reduceMotionOverride = false,
  mode = "sweep",
}: SpeedometerProps) {
  const stroke = 18;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - stroke / 2 - 2;
  const needleLength = r - stroke / 2 - 6;

  const angle = useSharedValue(GAUGE_START_ANGLE);
  const motion = useTelemetryMotion();
  const reduceMotion = motion.reduceMotion || reduceMotionOverride;

  useEffect(() => {
    const clamped = Math.max(0, Math.min(value, max));
    const fraction = clamped / max;
    const target = GAUGE_START_ANGLE + fraction * (GAUGE_END_ANGLE - GAUGE_START_ANGLE);
    const reduce = reduceMotion ? ReduceMotion.Always : ReduceMotion.System;

    // Keep a useful static reading when motion is disabled; a reduced sequence
    // would otherwise skip straight to its final (zero) target.
    if (reduceMotion) {
      angle.value = target;
      return;
    }

    if (mode === "track") {
      // Continuous racing: glide directly from the current reading to the next
      // and stay there. A well-damped spring keeps it lively without bounce;
      // the needle never returns to zero between laps.
      angle.value = withSpring(target, {
        damping: 20,
        stiffness: 110,
        mass: 0.9,
        reduceMotion: reduce,
      });
      return;
    }

    // One uninterrupted ramp from the current angle. Splitting the ascent into
    // two eased timings makes the needle hesitate at the intermediate target.
    // Replacing the animation also lets a new pass interrupt the return smoothly.
    if (clamped < 1) {
      // Already at/near rest — just settle to zero.
      angle.value = withSpring(GAUGE_START_ANGLE, { damping: 22, stiffness: 120, mass: 0.9, reduceMotion: reduce });
      return;
    }
    angle.value = withSequence(
      reduce,
      withTiming(target, { duration: 620, easing: Easing.out(Easing.cubic), reduceMotion: reduce }),
      withDelay(
        900,
        withSpring(GAUGE_START_ANGLE, { damping: 24, stiffness: 90, mass: 1.0, reduceMotion: reduce }),
        reduce,
      ),
    );
  }, [value, sampleKey, max, angle, reduceMotion, mode]);

  useEffect(() => () => cancelAnimation(angle), [angle]);

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

  // Heat follows the animated needle, including its return, on the UI thread.
  const liveIntensity = useDerivedValue(() => {
    const mph = ((angle.value - GAUGE_START_ANGLE) / (GAUGE_END_ANGLE - GAUGE_START_ANGLE)) * max;
    return Math.max(0, Math.min((mph - flameThreshold) / Math.max(1, max - flameThreshold), 1));
  });

  if (variant === "redline") {
    return <RedlineGauge angle={angle} readoutMph={readoutMph} max={max} zones={zones} flameThreshold={flameThreshold} size={size} display={display} newBest={newBest} />;
  }

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessible
      accessibilityLabel={`Speedometer, ${formatSpeedValue(readoutMph, display)} ${speedUnitLabel(display.unit)}`}
    >
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
              stroke={colors.inkMuted}
              strokeWidth={2}
            />
          ))}
          {ticks.map((tick) => (
            <SvgText
              key={`label-${tick.value}`}
              x={tick.label.x}
              y={tick.label.y + 4}
              fill={colors.inkSecondary}
              fontSize={11}
              fontWeight="600"
              textAnchor="middle"
            >
              {formatSpeedValue(tick.value, display)}
            </SvgText>
          ))}
        </G>

        {/* Phase 2b flame FX — beneath the needle so the needle stays crisp. */}
        <FlameField cx={cx} cy={cy} r={r} intensity={liveIntensity} reduceMotion={reduceMotion} />

        {/* Needle + hub */}
        <AnimatedLine
          x1={cx}
          y1={cy}
          // x2/y2 supplied by the animated worklet; static fallback avoids a
          // first-frame flash at the dial center.
          x2={polarToCartesian(cx, cy, needleLength, GAUGE_START_ANGLE).x}
          y2={polarToCartesian(cx, cy, needleLength, GAUGE_START_ANGLE).y}
          animatedProps={needleProps}
          stroke={isHot ? colors.flame : colors.electric}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy} r={12} fill={colors.panelSolid} stroke={colors.hairline} strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={4} fill={isHot ? colors.flame : colors.electric} />
      </Svg>

      {/* Digital readout overlay */}
      <View pointerEvents="none" style={styles.readout}>
        <Text style={[styles.readoutValue, isHot && { color: colors.flame }]}>
          {formatSpeedValue(readoutMph, display)}
        </Text>
        <Text style={styles.readoutUnit}>scale {speedUnitLabel(display.unit)}</Text>
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
    color: colors.ink,
    fontSize: fontSize.display,
    fontWeight: fontWeight.heavy,
    fontFamily: fontFamily.telemetry,
    fontVariant: ["tabular-nums"],
    lineHeight: fontSize.display,
  },
  readoutUnit: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
