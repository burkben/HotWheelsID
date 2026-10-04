/**
 * Design tokens — the starting palette/scale for the Redline ID UI.
 *
 * Direction from `docs/architecture/ui-and-design.md`: a dark "track" background,
 * high-contrast flame-orange / electric-blue accents, and semantic green→yellow→red
 * speed zones. Hand-rolled (no component library yet) per ADR-0005.
 */

import type { TextStyle } from 'react-native';

export const colors = {
  /** App background — deep "night track". */
  bg: "#0b0f1a",
  /** Raised card / panel surface. */
  surface: "#111827",
  /** Slightly different surface for nested rows. */
  surfaceAlt: "#0f1626",
  /** A touch lighter than `surface` — for hero/"raised" cards that should pop. */
  surfaceRaised: "#16203a",
  /** Hairline borders on cards. */
  border: "#1e2a44",

  textPrimary: "#ffffff",
  textSecondary: "#8aa0c6",
  textMuted: "#6b7a99",

  /** Hot-Wheels-style flame orange — primary accent + needle. */
  accent: "#ff7a1a",
  /** Electric blue — secondary accent. */
  accentBlue: "#26c6ff",

  /** Translucent accent washes — for soft "alive"/selected fills behind content. */
  accentSoft: "rgba(255,122,26,0.12)",
  accentBlueSoft: "rgba(38,198,255,0.12)",

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

  // ---- Trackside Telemetry (UI overhaul, proposal B) -----------------------
  // Lower, cooler blacks and purpose-built glass/fallback surfaces. These are
  // additions alongside the legacy ramp above; new telemetry screens use these,
  // and existing tokens keep working while surfaces migrate.
  /** Screen void — the deepest black the app sits on. */
  void: "#05080d",
  /** Opaque fallback for every glass surface (never legibility-dependent). */
  panelSolid: "#0d1520",
  /** Inset/nested telemetry surface (inputs, unselected segments, inset rows). */
  panelInset: "#09111b",
  /** Raised telemetry surface — active car, current heat, selected record. */
  panelRaised: "#132131",
  /** Default glass fill when liquid glass is unavailable or transparency-reduced. */
  glassFill: "rgba(13,21,32,0.78)",
  /** One-pixel top/inner highlight on glass/telemetry surfaces. */
  glassHighlight: "rgba(255,255,255,0.07)",
  /** Cooler hairline for telemetry cards, rows, graph grids. */
  hairline: "rgba(135,174,214,0.20)",

  /** Telemetry ink ramp. */
  ink: "#f5f8fb",
  inkSecondary: "#9bb0c4",
  inkMuted: "#64788a",

  /** Calibrated accents (close to the brand pair, tuned for glass). */
  flame: "#ff7418",
  electric: "#2bd1ff",

  /** Status semantics tuned for the darker void (always paired with text/icon). */
  okT: "#39d98a",
  caution: "#ffd15c",
  fault: "#ff5a67",
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

/**
 * Trackside Telemetry precision radius scale — tighter than the legacy ramp.
 * Primary telemetry cards use 12, list groups 10, fields/segments 6.
 */
export const radiusT = {
  xs: 4,
  sm: 8,
  card: 12,
  group: 10,
  field: 6,
  pill: 999,
} as const;

/**
 * Reusable depth presets. Per `docs/architecture/design-language.md` §4, depth is
 * restrained: a subtle ambient lift separates cards from the night-track bg, and a
 * soft *accent glow* — not a heavy drop shadow — signals an "active/alive" state
 * (the car on the portal, a record speed, a selected casting). Spreads cleanly into
 * a `StyleSheet` style; iOS reads the `shadow*` keys, Android reads `elevation`.
 */
export const elevation = {
  /** Ambient lift so a card reads as a distinct object above the background. */
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  /** Flame-orange glow for "alive"/record states (on-portal car, best speed). */
  accentGlow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
  /** Electric-blue glow for secondary emphasis. */
  blueGlow: {
    shadowColor: colors.accentBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 16,
  lg: 20,
  xl: 28,
  display: 64,
} as const;

/** Trackside Telemetry extensions — tiny channel labels and hero readouts. */
export const fontSizeT = {
  /** 9pt channel/axis labels — supplemental only, never core. */
  nano: 9,
  xs: 11,
  sm: 13,
  md: 16,
  lg: 20,
  xl: 24,
  /** Live speed / hero value. */
  hero: 88,
  /** Race countdown digits. */
  raceDisplay: 112,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "600",
  bold: "700",
  heavy: "800",
} as const;

/**
 * Numeric/telemetry face. San Francisco stays the reading face; the mono face is
 * reserved for values where digits must align in stable columns (speed, lap
 * times, counters, UID fragments, timestamps). No font download — iOS SF Mono.
 */
export const fontFamily = {
  telemetry: "SFMono-Regular",
} as const;

// ---- Redline V1 (additive; legacy and TV tokens above remain unchanged) ----
// SPEC §1; exact visual values live in docs/design/redline-v1/source/.
export const colorsR = {
  asphalt: '#07090F',
  pitWall: '#0B0E15',
  pitLane: '#111620',
  inset: '#0D1119',
  gridBox: '#1A2230',
  trackGrey: '#161C27',
  steel: '#232C3B',
  barMuted: '#2E3A4D',
  tickMinor: '#3A4556',
  chalk: '#F5F7FA',
  inkSecondary: '#A3B1C2',
  inkMuted: '#8494A6',
  /** Decorative only; use inkMuted or lighter for readable text. */
  inkDisabled: '#6E7D8E',
  flame: '#FF6A13',
  flameDeep: '#B84A0B',
  flameMid: '#E35C10',
  electric: '#2BD1FF',
  caution: '#FFD23F',
  greenFlag: '#39D98A',
  redFlag: '#FF4D5E',
  lightOff: '#2A1418',
  deltaSlower: '#FF8F8F',
  destructiveInk: '#FF6B78',
  hairline: 'rgba(163,177,194,0.14)',
  divider: 'rgba(163,177,194,0.12)',
  rule: 'rgba(163,177,194,0.18)',
  chartBaseline: 'rgba(163,177,194,0.20)',
  fieldBorder: 'rgba(163,177,194,0.30)',
  ghostBorder: 'rgba(163,177,194,0.35)',
  status: {
    connected: { fill: 'rgba(57,217,138,0.12)', border: 'rgba(57,217,138,0.50)', ink: '#39D98A' },
    searching: { fill: 'rgba(255,210,63,0.10)', border: 'rgba(255,210,63,0.45)', ink: '#FFD23F' },
    onPortal: { fill: 'rgba(255,106,19,0.12)', border: 'rgba(255,106,19,0.55)', ink: '#FF6A13' },
    demo: { fill: 'rgba(163,177,194,0.08)', border: 'rgba(163,177,194,0.35)', ink: '#A3B1C2' },
    ahead: { fill: 'rgba(57,217,138,0.15)', border: 'rgba(57,217,138,0.60)', ink: '#39D98A' },
  },
  heat: ['#161C27', '#5A2A0E', '#A8460C', '#FF6A13'],
  zones: { green: 'rgba(57,217,138,0.75)', caution: '#FFD23F', red: '#FF4D5E' },
} as const;

/** Each name is a separately loaded face. Never add fontWeight/fontStyle. */
export const fontR = {
  display: 'BarlowCondensed_900Black_Italic',
  display800: 'BarlowCondensed_800ExtraBold_Italic',
  display700: 'BarlowCondensed_700Bold_Italic',
  hud: 'ChakraPetch_600SemiBold',
  hudBold: 'ChakraPetch_700Bold',
  hudMedium: 'ChakraPetch_500Medium',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodySemi: 'Barlow_600SemiBold',
  bodyBold: 'Barlow_700Bold',
} as const;

export const radiusR = {
  panel: 0,
  plateSmall: 6,
  plate: 7,
  plateLarge: 8,
  plateHero: 10,
  pod: 14,
  pill: 999,
} as const;

export const skewR = {
  button: '-12deg',
  plate: '-10deg',
  segment: '-20deg',
  lapBar: '-18deg',
  indicator: '-24deg',
  ribbon: '-14deg',
} as const;

const displayR = { textTransform: 'uppercase', fontVariant: ['tabular-nums'] } satisfies TextStyle;
const hudR = { ...displayR, fontFamily: fontR.hudBold } satisfies TextStyle;

/** Default screen sizes from SPEC §1.2. Screen-specific sizes may override these.
 * React Native lineHeight is absolute points, unlike the source's CSS ratios.
 */
export const typeR = {
  wordmark: { ...displayR, fontFamily: fontR.display, fontSize: 30, lineHeight: 30, letterSpacing: -0.5 },
  screenTitle: { ...displayR, fontFamily: fontR.display, fontSize: 52, lineHeight: 44.2, letterSpacing: -0.5 },
  raceDigit: { ...displayR, fontFamily: fontR.display, fontSize: 320, lineHeight: 272, letterSpacing: -1 },
  storeHeadline: { ...displayR, fontFamily: fontR.display, fontSize: 64, lineHeight: 55.04, letterSpacing: -1 },
  sectionTitle: { ...displayR, fontFamily: fontR.display800, fontSize: 17, lineHeight: 20.4, letterSpacing: 1 },
  carName: { ...displayR, fontFamily: fontR.display800, fontSize: 23, lineHeight: 24.15, letterSpacing: 0 },
  buttonPrimary: { ...displayR, fontFamily: fontR.display, fontSize: 24, lineHeight: 28.8, letterSpacing: 1 },
  buttonGhost: { ...displayR, fontFamily: fontR.display800, fontSize: 22, lineHeight: 26.4, letterSpacing: 1 },
  tabLabel: { ...displayR, fontFamily: fontR.display800, fontSize: 12, lineHeight: 14.4, letterSpacing: 1 },
  gaugeReadout: { ...hudR, fontSize: 84, lineHeight: 84, letterSpacing: -2 },
  heroNumber: { ...hudR, fontSize: 64, lineHeight: 64, letterSpacing: -1 },
  statValue: { ...hudR, fontSize: 30, lineHeight: 33, letterSpacing: 0 },
  lapTime: { ...hudR, fontFamily: fontR.hud, fontSize: 20, lineHeight: 24, letterSpacing: 0 },
  eyebrow: { ...hudR, fontFamily: fontR.hud, fontSize: 11, lineHeight: 13.2, letterSpacing: 2 },
  chip: { ...hudR, fontSize: 12, lineHeight: 14.4, letterSpacing: 1.5 },
  body: { fontFamily: fontR.body, fontSize: 16, lineHeight: 23.2, letterSpacing: 0 },
  bodySmall: { fontFamily: fontR.body, fontSize: 14, lineHeight: 19.6, letterSpacing: 0 },
} satisfies Record<string, TextStyle>;

export type TypeRVariant = keyof typeof typeR;
