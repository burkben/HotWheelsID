import { useId } from 'react';
import Svg, { Defs, Line, Pattern, Polygon, Rect, type SvgProps } from 'react-native-svg';

import { colorsR } from '@/theme/tokens';
import { decorative } from './decorative';

type Frame = Pick<SvgProps, 'width' | 'height' | 'style'>;

export function Kerb({ height = 5, colors = [colorsR.flame, colorsR.chalk], stripe = Math.min(18, height * 2), width = '100%' }: {
  height?: number;
  colors?: readonly [string, string];
  stripe?: number;
  width?: SvgProps['width'];
}) {
  const id = `kerb-${useId().replace(/:/g, '')}`;
  const band = stripe * Math.SQRT2;
  const period = band * 2;
  return (
    <Svg {...decorative} width={width} height={height}>
      <Defs>
        <Pattern id={id} width={period} height={period} patternUnits="userSpaceOnUse">
          <Rect width={period} height={period} fill={colors[1]} />
          {/* Draw the wrapped diagonal inside the tile: rotating Pattern clips on iOS. */}
          <Polygon points={`0,0 ${band},0 ${-band},${period} ${-period},${period}`} fill={colors[0]} />
          <Polygon points={`${period},0 ${period + band},0 ${band},${period} 0,${period}`} fill={colors[0]} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export function Checker({ size = 12, rows = 4, cols = 8, width = size * cols, height = size * rows, skew = 0, rotate = 0, style }: Frame & {
  size?: number;
  rows?: number;
  cols?: number;
  skew?: number;
  rotate?: number;
}) {
  const id = `checker-${useId().replace(/:/g, '')}`;
  return (
    <Svg {...decorative} width={width} height={height} style={[style, { transform: [{ skewX: `${skew}deg` }, { rotate: `${rotate}deg` }] }]}>
      <Defs>
        <Pattern id={id} width={size * 2} height={size * 2} patternUnits="userSpaceOnUse">
          <Rect width={size * 2} height={size * 2} fill={colorsR.asphalt} />
          <Rect width={size} height={size} fill={colorsR.chalk} />
          <Rect x={size} y={size} width={size} height={size} fill={colorsR.chalk} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export function RakeLines({ opacity = 0.035, spacing = 22, color = colorsR.chalk, width = '100%', height = '100%', style }: Frame & {
  opacity?: number;
  spacing?: number;
  color?: string;
}) {
  const id = `rake-${useId().replace(/:/g, '')}`;
  const tileWidth = spacing / Math.cos(Math.PI / 6);
  const tileHeight = tileWidth * Math.sqrt(3);
  return (
    <Svg {...decorative} width={width} height={height} style={style} opacity={opacity}>
      <Defs>
        <Pattern id={id} width={tileWidth} height={tileHeight} patternUnits="userSpaceOnUse">
          <Line x1={0} y1={0} x2={-tileWidth} y2={tileHeight} stroke={color} strokeWidth={2} />
          <Line x1={tileWidth} y1={0} x2={0} y2={tileHeight} stroke={color} strokeWidth={2} />
          <Line x1={tileWidth * 2} y1={0} x2={tileWidth} y2={tileHeight} stroke={color} strokeWidth={2} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export function TrackLane({ height = 92, width = '100%' }: { height?: number; width?: SvgProps['width'] }) {
  return (
    <Svg {...decorative} width={width} height={height}>
      <Rect width="100%" height={height} fill={colorsR.asphalt} />
      <Rect width="100%" height={6} fill={colorsR.flame} />
      <Rect y={height - 6} width="100%" height={6} fill={colorsR.flame} />
      <Line x1={0} y1={height / 2} x2="100%" y2={height / 2} stroke={colorsR.chalk} strokeWidth={4} strokeDasharray="26 20" />
    </Svg>
  );
}
