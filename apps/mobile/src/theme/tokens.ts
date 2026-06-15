/**
 * Design tokens — the starting palette/scale for the Redline ID UI.
 *
 * Direction from `docs/architecture/ui-and-design.md`: a dark "track" background,
 * high-contrast flame-orange / electric-blue accents, and semantic green→yellow→red
 * speed zones. Hand-rolled (no component library yet) per ADR-0005.
 */

export const colors = {
  /** App background — deep "night track". */
  bg: "#0b0f1a",
  /** Raised card / panel surface. */
  surface: "#111827",
  /** Slightly different surface for nested rows. */
  surfaceAlt: "#0f1626",
  /** Hairline borders on cards. */
  border: "#1e2a44",

  textPrimary: "#ffffff",
  textSecondary: "#8aa0c6",
  textMuted: "#6b7a99",

  /** Hot-Wheels-style flame orange — primary accent + needle. */
  accent: "#ff7a1a",
  /** Electric blue — secondary accent. */
  accentBlue: "#26c6ff",

  /** Unfilled gauge track. */
  track: "#1b2540",

  /** Semantic speed zones. */
  zoneGreen: "#22c55e",
  zoneYellow: "#eab308",
  zoneRed: "#ef4444",

  /** Status semantics. */
  ok: "#22c55e",
  warn: "#eab308",
  danger: "#ef4444",
  idle: "#6b7a99",
} as const;

/** Speed gauge configuration (values are "scale mph" = parseSpeed.scaleMph). */
export const speedGauge = {
  /** Full-scale deflection of the dial. */
  maxMph: 300,
  /** Colored arc bands [from, to] in scale mph. */
  zones: [
    { from: 0, to: 120, color: colors.zoneGreen },
    { from: 120, to: 220, color: colors.zoneYellow },
    { from: 220, to: 300, color: colors.zoneRed },
  ] as const,
  /** Major tick interval. */
  tickStep: 60,
  /** At/above this, the gauge is "on fire" — Skia flame layer hook for Phase 2b. */
  flameThreshold: 240,
} as const;

/** 4-pt base spacing scale. */
export function spacing(steps: number): number {
  return steps * 4;
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 16,
  lg: 20,
  xl: 28,
  display: 64,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "600",
  bold: "700",
  heavy: "800",
} as const;
