import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colorsR } from '@/theme/tokens';
import { decorative } from './decorative';

// Paths are copied verbatim from Main.dc.html (car/chevron), Speed.dc.html
// (flames), and Achievements.dc.html (hexagons). No brand artwork.
const carBody = 'M6 42 C6 36 10 33 18 32 L52 28 C64 18 82 12 104 12 C122 12 136 18 150 27 L182 31 C190 32 194 36 194 42 L194 46 C194 48 192 49 190 49 L166 49 A14 14 0 0 0 138 49 L64 49 A14 14 0 0 0 36 49 L10 49 C7 49 6 47 6 45 Z';
const carWindow = 'M66 28 C76 20 89 16 104 16 C117 16 127 20 137 27 Z';
const carTrim = 'M18 38 L120 36 L190 38';
const chevron = 'M4 4 L28 32 L4 60 L18 60 L42 32 L18 4 Z';
const flamePaths = [
  'M6 96 C10 70 0 56 16 32 C20 54 32 62 30 82 C38 70 40 58 38 44 C54 62 54 82 48 96 Z',
  'M44 96 C50 66 40 46 60 12 C64 42 82 54 80 84 C88 72 90 60 86 46 C104 66 102 84 96 96 Z',
  'M54 96 C58 78 52 66 64 48 C68 66 78 74 76 96 Z',
  'M14 96 C16 84 12 76 20 66 C24 76 30 82 28 96 Z',
];
const hexagon = 'M28 2 L54 17 L54 47 L28 62 L2 47 L2 17 Z';
const hexagonInset = 'M28 8 L49 20 L49 44 L28 56 L7 44 L7 20 Z';

/** Use only when catalog artwork is unavailable. */
export function CarSilhouette({ color = colorsR.flame, width = 200, outline = false }: { color?: string; width?: number; outline?: boolean }) {
  return (
    <Svg {...decorative} width={width} height={width * 0.3} viewBox="0 0 200 60">
      <Path d={carBody} fill={outline ? 'none' : color} stroke={outline ? color : 'none'} strokeWidth={2} strokeDasharray={outline ? '5 4' : undefined} />
      <Path d={carWindow} fill={outline ? 'none' : colorsR.asphalt} />
      {!outline && <Path d={carTrim} fill="none" stroke={colorsR.asphalt} strokeWidth={1.6} />}
      {[50, 152].map((cx) => (
        <G key={cx}>
          <Circle cx={cx} cy={49} r={11} fill={colorsR.asphalt} stroke={outline ? color : 'none'} strokeDasharray={outline ? '4 3' : undefined} />
          <Circle cx={cx} cy={49} r={5} fill={outline ? color : colorsR.inkSecondary} />
        </G>
      ))}
    </Svg>
  );
}

export function Chevrons({ count = 4, color = colorsR.flame, height = 64 }: { count?: number; color?: string; height?: number }) {
  const width = Math.max(1, count) * 46 - 2;
  return (
    <Svg {...decorative} width={width * height / 64} height={height} viewBox={`0 0 ${width} 64`}>
      {Array.from({ length: count }, (_, i) => <Path key={i} d={chevron} fill={color} opacity={(i + 1) / count} transform={`translate(${i * 46} 0)`} />)}
    </Svg>
  );
}

export function FlameTongues({ opacity = 1, width = 120, side = 'left' }: { opacity?: number; width?: number; side?: 'left' | 'right' }) {
  return (
    <Svg {...decorative} width={width} height={width * 0.8} viewBox="0 0 120 96" opacity={opacity}>
      <G transform={side === 'right' ? 'translate(120 0) scale(-1 1)' : undefined}>
        {flamePaths.map((d, i) => <Path key={d} d={d} fill={i < 2 ? colorsR.flame : colorsR.caution} />)}
      </G>
    </Svg>
  );
}

export function SpeedStreaks({ side = 'left', scale = 1 }: { side?: 'left' | 'right'; scale?: number }) {
  return (
    <Svg {...decorative} width={200 * scale} height={70 * scale} viewBox="0 0 200 70">
      <G transform={side === 'right' ? 'translate(200 0) scale(-1 1)' : undefined}>
        <Rect x={14} y={0} width={150} height={5} rx={3} fill={colorsR.flame} />
        <Rect x={50} y={20} width={110} height={5} rx={3} fill={colorsR.chalk} opacity={0.6} />
        <Rect x={0} y={40} width={170} height={5} rx={3} fill={colorsR.chalk} opacity={0.25} />
        <Rect x={80} y={60} width={80} height={5} rx={3} fill={colorsR.electric} />
      </G>
    </Svg>
  );
}

export function Medallion({ unlocked, icon, size = 56, featured = false }: {
  unlocked: boolean;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  size?: number;
  featured?: boolean;
}) {
  const ink = featured ? colorsR.asphalt : unlocked ? colorsR.chalk : colorsR.inkDisabled;
  return (
    <View {...decorative} style={{ width: size, height: size * 64 / 56 }}>
      <Svg width="100%" height="100%" viewBox="0 0 56 64">
        <Path d={hexagon} fill={featured ? colorsR.flame : unlocked ? colorsR.gridBox : colorsR.inset} stroke={featured ? 'none' : unlocked ? colorsR.caution : colorsR.barMuted} strokeWidth={3} />
        {featured && <Path d={hexagonInset} fill="none" stroke={colorsR.asphalt} strokeWidth={2} />}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <MaterialCommunityIcons name={icon} size={size * 24 / 56} color={ink} />
      </View>
    </View>
  );
}
