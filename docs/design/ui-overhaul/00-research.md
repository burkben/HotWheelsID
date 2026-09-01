# UI Overhaul — Research Brief & Constraints

Input document for the UI-overhaul design proposals (Proposals A/B/C in this folder).
Compiled from a code audit of `apps/mobile` on branch `burkben/ui-overhaul-proposals`.
Design agents: treat **Sections 4–6 as hard constraints**; everything else is context.

## 1. What the app is

Redline ID resurrects the discontinued Hot Wheels id Race Portal hardware. iOS app
(React Native 0.85 + Expo SDK 56, expo-router). Dark-only, offline-first, no accounts.
Users are families/kids at a play mat — glanceable from a few feet away. Unofficial
project: **evoke racing, never copy Hot Wheels/Mattel brand assets.**

## 2. Screens (expo-router)

| Route | File | Purpose | Notes |
|---|---|---|---|
| `/(tabs)/index` | `src/app/(tabs)/index.tsx` | Speed: hero gauge, car hero, stat row, recent passes, connection pill | iPad 2-pane |
| `/(tabs)/race` | `src/app/(tabs)/race.tsx` | Race: setup, countdown, live laps, results, night lineup queue | rich sub-components in `src/race/components/` |
| `/(tabs)/garage` | `src/app/(tabs)/garage.tsx` | Car collection grid, detail at `/garage/[uid]` | multi-column on iPad |
| `/(tabs)/history` | `src/app/(tabs)/history.tsx` | Session history, detail at `/history/[id]` | |
| `/(tabs)/more` | `src/app/(tabs)/more.tsx` | Menu rows → Achievements, Live log, TV mode, Settings, Credits | |
| `/settings` | `src/app/settings.tsx` | Preferences (see §5 audit) | pushed from More |
| `/live` | `src/app/live.tsx` | Raw BLE event log | |
| `/tv` | `src/app/tv.tsx` + `src/tv/TvStage.tsx` | AirPlay-mirror stage (landscape) | **separate surface — keep working** |
| `/achievements`, `/credits`, `/identify` | `src/app/*.tsx` | badges, credits, offline car-ID picker | |

Tab bar (`(tabs)/_layout.tsx`): 5 tabs, MaterialCommunityIcons, active `accent` /
inactive `textMuted` on `surface` with 1px top border. Speed index is the home tab.

## 3. Design system today

Tokens in `src/theme/tokens.ts` (source of truth): night-track `bg #0b0f1a`, `surface
#111827`, hairline `border #1e2a44`, flame-orange `accent #ff7a1a`, electric-blue
`accentBlue #26c6ff`, speed zones green→yellow→red, 4-pt `spacing(n)`, radius
8/12/16/24/pill, `elevation` presets (`card`, `accentGlow`, `blueGlow`), type scale
11–64, weights 400/600/700/800. Full language: `docs/architecture/design-language.md`.

Components: `StatusPill` (connection state = the connect control), `CurrentCarHero`,
`RecentPasses`, `BleStatusBanner`, `PersistenceStatusBanner`, and the gauge trio
(`Speedometer`, `FlameField`, `geometry`).

## 4. Motion today (audit)

Reanimated 4.3.1 is installed; actual animation is confined to the gauge:

- `Speedometer.tsx`: needle `useSharedValue` angle → `withSpring` on pass,
  `useAnimatedProps` (UI thread). Signature motion: snap, hold ~1.3 s, ease back.
- `FlameField.tsx`: `withTiming` heat bloom past 240 mph + `withRepeat` ember drift.
- Everything else is **static**: tab bar, cards, lists, countdown, toggles, results.
- Haptics (`expo-haptics`) wired for pass/record/countdown; gated by `haptics` setting.
- Sound (`expo-audio`) for race cues; gated by `sound` setting.

**Key finding: `expo-glass-effect` and `react-native-gesture-handler` are installed
but NOT used anywhere in src.** `expo-font` is installed but no custom font is loaded
(system SF only). `react-native-svg` renders the gauge. **react-native-skia is NOT
installed** (ADRs mention it as a possible future; do not require it).

## 5. Settings screen — alignment/quality audit (user-reported)

All refs `src/app/settings.tsx`:

1. **Header not centered** (L158–170): `‹ Back` button (variable width) + title
   `flex:1` + a fixed 4-pt `headerSpacer` (L169). Title is optically pushed right of
   center; on wide/iPad the row is full-width while content below is capped.
2. **Switch floats mid-block** (L379–392): `toggleRow` centers the `Switch` against a
   2-line label+hint stack, so the switch sits at the hint's height instead of aligning
   with the label (iOS grouped-list convention: control on the same line as the label).
3. **Stepper same problem** (L247–282): 48-pt `−`/`+` buttons center against the tall
   label+3-line-hint block; visually the stepper "hangs" low.
4. **Chips overstretch** (L201–218, 226–245): `chip { flex: 1 }` makes 4 lap chips and
   2 unit chips fill the full card width — 2 unit chips become comically wide pills,
   inconsistent with iOS segmented-control sizing.
5. **Double section spacing**: `content { gap: spacing(2) }` + `sectionLabel
   { marginTop: spacing(4) }` (L410–425) compounds to uneven rhythm between sections.
6. **Cramped card rhythm**: uniform `card { padding: 16, gap: 8 }` (L426–433) — hint
   text crowds controls; dividers get only `marginVertical: 4`.
7. **Reset button orphaned** at the bottom (L356–361) with no section context.
8. Settings keys (store API must not change): `playerName, defaultLaps, haptics, sound,
   reduceMotion, mockModeDefault, speedUnit, speedCalibration` — defaults in
   `DEFAULT_SETTINGS` (`src/store/settingsStore.ts`).

**Every proposal MUST include a redesigned Settings screen that fixes 1–7** (grouped
inset-list or equivalent: 44-pt rows, label row + control on one line, hint below in
secondary color, right-aligned controls, grouped cards, even section rhythm).

## 6. Hard constraints

- RN 0.85 + Expo SDK 56, expo-router; TypeScript strict-ish; `npm run typecheck` and
  `npm test` must pass.
- Reanimated 4 (worklets/UI-thread for hot paths), target 60–120 fps.
- Dark-only. Offline-first. No accounts. No network dependencies in UI.
- iPad: `useLayout()` (`contentMaxWidth` ~420 phone column; 2-pane ≥ `TWO_PANE_MIN_WIDTH`).
- **TV mode (`TvStage`) is a separate mirrored surface — do not break its contract.**
- `reduceMotion` setting OR'd with the OS flag must gate all decorative motion.
- Haptics/sound stay gated by their settings. Accessibility: ≥44-pt targets,
  color-blind-safe speed zones (position+labels, never color alone).
- May extend the token palette/type scale; keep flame-orange/electric-blue identity.
- May use already-installed libs: reanimated, gesture-handler, svg, expo-glass-effect,
  expo-haptics, expo-font (a custom display font is allowed if bundled). No new native
  deps without calling it out as a cost.

## 7. Must NOT change

`packages/protocol`, `src/ble`, `src/transport`, `src/portal`, store shapes/persistence
(`src/store/*`, sqlite schema), settings keys, TV stage contract, existing tests.

## 8. Opportunities (what a great overhaul should exploit)

1. The gauge is the only animated thing — extend its life to the whole shell: animated
   tab indicator, screen transitions, card entrances, countdown theater, confetti/
   glow on records, car "crossing the beam" pass animation.
2. `expo-glass-effect` for iOS 26 liquid-glass tab bar/sheets (with opaque fallback).
3. Gesture-handler: swipe between race stages, pull-for-live-log, scrub a speed trace.
4. A live speed sparkline/trace (svg) — telemetry feel with zero new deps.
5. Empty states are emoji-only today — elevate with illustration/motion.
6. Settings is a form dump today — restructure into iOS-quality grouped lists.
7. Demo/mock mode exists, so all of this is reviewable without hardware.
