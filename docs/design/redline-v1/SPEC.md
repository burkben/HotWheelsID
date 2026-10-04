# Redline V1 — Racing Identity: Design Spec

The implementation spec for the **Redline V1** visual identity: a motorsport-flavoured
re-skin of the Redline ID iOS app for its App Store launch. It replaces the look of the
current *Trackside Telemetry* theme (see `docs/design/ui-overhaul/`) while **keeping
its structure, components, data flow and behaviour**.

- **Reference images (start here):** [`png/`](png/) — one PNG per artboard, rendered at 2×.
- **Exact values:** [`source/*.dc.html`](source/) — the original artboard markup. Every
  colour, size, offset and SVG path in this spec is taken from these files. When this
  document and a source file disagree, **the source file wins** for visual values, and
  **this document wins** for behaviour, data and accessibility.
- **Browsable mockups:** [`static/*.html`](static/) — runtime-free HTML renders that work
  offline. They use the bundled fonts in `static/fonts/`.
- **Issues:** [`ISSUES.md`](ISSUES.md). **Agent hand-off prompt:** [`CODEX_PROMPT.md`](CODEX_PROMPT.md).

> Mockup coordinates are CSS px at a 390 × 844 iPhone frame. Treat 1 px = 1 pt in
> React Native. Mockups draw no status bar: the top ~54 pt is the safe area.

---

## 0. Principles

1. **Slant means speed.** Display type is italic. Buttons, tags, chips and plates lean
   (`skewX`). **Numbers never lean.** Speeds, times and counts are upright tabular
   figures, so they don't jitter as they change.
2. **One loud colour.** Asphalt underneath, Track Orange on top. Electric blue means
   "fastest lap / link". Caution yellow means "record / trophy". Green means
   "connected / go". Red means "fault / redline / start lights".
3. **Trackside kit, used sparingly.** Kerb stripes, checkers, race plates, start lights,
   speed streaks, chevrons and flames. Use **one or two per screen**, never as wallpaper.
4. **Crisp, not bubbly.** Panels have **square corners**. Roundness is reserved for
   pills, plates, light pods and the phone itself.
5. **Not a Hot Wheels re-skin.** Do not use Mattel logos, wordmarks, flame logos,
   packaging or "Hot Wheels" in the UI chrome or the App Store art. The app is
   **Redline ID**. The Mattel disclaimer stays in Settings/Credits.

---

## 1. Tokens

Add these as a **new, additive** block in `apps/mobile/src/theme/tokens.ts`. Suggested
names: `colorsR`, `fontR`, `radiusR`, `skewR`. Do **not** delete or rename existing
tokens: `TvStage` and unmigrated code still import them. Once a surface is migrated,
it should read only the new tokens.

### 1.1 Colour

| Token (suggested) | Hex / value | Use |
|---|---|---|
| `asphalt` | `#07090F` | Screen background, dark ink on bright fills |
| `pitWall` | `#0B0E15` | Tab bar, sheet/page backgrounds behind boards |
| `pitLane` | `#111620` | Panels, cards, list groups (default surface) |
| `inset` | `#0D1119` | Inputs, steppers, track-map background, locked medallion fill |
| `gridBox` | `#1A2230` | Raised: lap-number cells, date tabs, unlocked medallion fill, tags |
| `trackGrey` | `#161C27` | Unfilled gauge track, progress-bar troughs, empty heat cells |
| `steel` | `#232C3B` | Empty lap segments, OFF switch track, light-gantry housing |
| `barMuted` | `#2E3A4D` | Non-highlighted chart bars, locked medallion ring |
| `tickMinor` | `#3A4556` | Minor gauge ticks |
| `chalk` | `#F5F7FA` | Primary ink, kerb white, race-plate fill |
| `inkSecondary` | `#A3B1C2` | Supporting copy, major gauge ticks |
| `inkMuted` | `#8494A6` | Eyebrow labels, units, inactive tab (≥ 4.5 : 1 on `pitLane`) |
| `inkDisabled` | `#6E7D8E` | Locked icons, dashed unidentified-car outline (decorative only) |
| `flame` | `#FF6A13` | **Primary accent**: CTAs, active tab, live state, gauge arc, track |
| `flameDeep` | `#B84A0B` | Track rails and edges (illustrations, app icon) |
| `flameMid` | `#E35C10` | Inner track lines (illustrations) |
| `electric` | `#2BD1FF` | Fastest lap, links, best-lap ghost, Bluetooth glyph |
| `caution` | `#FFD23F` | Records, NEW BEST, trophies, unlocked medallion ring |
| `greenFlag` | `#39D98A` | Connected, GO, "ahead" delta |
| `redFlag` | `#FF4D5E` | Faults, redline zone, start lights, destructive outline |
| `lightOff` | `#2A1418` | Unlit start light |
| `deltaSlower` | `#FF8F8F` | "Slower" lap delta text |
| `destructiveInk` | `#FF6B78` | "Reset to defaults" text |
| `hairline` | `rgba(163,177,194,0.14)` | Tab-bar top border, panel footers |
| `divider` | `rgba(163,177,194,0.12)` | Row dividers inside a group |
| `rule` | `rgba(163,177,194,0.18)` | Section-header rules, chart baselines (0.2) |
| `fieldBorder` | `rgba(163,177,194,0.30)` | Input/stepper borders; 0.35 for ghost chips |

**Soft status fills** (chips and badges) use a fill and a 1 px border in the same hue:

| Status | Fill | Border | Ink |
|---|---|---|---|
| Connected | `rgba(57,217,138,0.12)` | `rgba(57,217,138,0.50)` | `#39D98A` |
| Searching | `rgba(255,210,63,0.10)` | `rgba(255,210,63,0.45)` | `#FFD23F` |
| On portal | `rgba(255,106,19,0.12)` | `rgba(255,106,19,0.55)` | `#FF6A13` |
| Demo / idle | `rgba(163,177,194,0.08)` | `rgba(163,177,194,0.35)` | `#A3B1C2` |
| Ahead delta | `rgba(57,217,138,0.15)` | `rgba(57,217,138,0.60)` | `#39D98A` |

**History heat ramp** (sessions per day). It also differs in lightness, so it is
colour-blind safe: `0 → #161C27`, `1 → #5A2A0E`, `2 → #A8460C`, `3+ → #FF6A13`.

**Contrast rules:** text on a `flame`, `caution`, `electric` or `chalk` fill is always
`asphalt` (≈ 6.9 : 1 on flame). Never put white text on orange. Grey text is at least
`inkMuted` on `pitLane`.

**Speed zones** stay as today (`speedGauge.zones` 0–120 / 120–220 / 220–300). In the
new gauge they are green `#39D98A` at 75 % opacity, caution `#FFD23F` and red `#FF4D5E`.

### 1.2 Typography

Three Google Fonts families, all under the SIL Open Font License 1.1:

| Role | Family / face | Where |
|---|---|---|
| **Display** | Barlow Condensed **Black Italic** (900i) | Wordmark, screen titles, race digits, FINISH, store headlines, primary buttons |
| Display-2 | Barlow Condensed **ExtraBold Italic** (800i) | Section titles, car names, ghost buttons, tab labels |
| Display-3 | Barlow Condensed Bold Italic (700i) | Tagline (identity sheet only) |
| **HUD** | Chakra Petch **SemiBold** (600) / **Bold** (700) / Medium (500) | All numbers, eyebrow labels, chips, lap times, units, toy numbers |
| **Body** | Barlow Regular / Medium / SemiBold / Bold (400/500/600/700) | Reading copy, row labels, hints |

**How to bundle.** Use the `@expo-google-fonts/barlow`, `@expo-google-fonts/barlow-condensed`
and `@expo-google-fonts/chakra-petch` packages. They are JS-only, ship TTFs and work
with the already-installed `expo-font`. Load the faces at startup, either in
`src/app/_layout.tsx` via `useFonts`, holding the splash screen until they load, or via
the `expo-font` config plugin. Credit the fonts (OFL) in `THIRD_PARTY_NOTICES.md` and
on the Credits screen.

**Font names.** On iOS, refer to each face by its **own family name** and **do not also
set `fontWeight` or `fontStyle`**, or iOS may synthesise faux bold or italic. Example
token:

```ts
export const fontR = {
  display: 'BarlowCondensed_900Black_Italic',
  display800: 'BarlowCondensed_800ExtraBold_Italic',
  hud: 'ChakraPetch_600SemiBold',
  hudBold: 'ChakraPetch_700Bold',
  hudMedium: 'ChakraPetch_500Medium',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodySemi: 'Barlow_600SemiBold',
} as const;
```

Use whatever exact names the installed packages export; the names above are the
packages' convention. Add `fontVariant: ['tabular-nums']` on every HUD number.

**Type scale (pt).** Sizes, weights and letter-spacing come from the mockups:

| Style | Face | Size / line-height | Tracking | Example |
|---|---|---|---|---|
| `wordmark` | display | 30 / 1.0 (header), 22–24 (small) | −0.5 | REDLINE + ID tag |
| `screenTitle` | display | 52 / 0.85 (Garage, History, Settings); 46 (Trophy case); 54 (Connect) | −0.5 | GARAGE |
| `raceDigit` | display | 320 / 0.85 (countdown); 80 (lap number); 92 (FINISH) | −1 | 2 |
| `storeHeadline` | display | 64 / 0.86 | −1 | THE PORTAL IS BACK. |
| `sectionTitle` | display800 | 16–17 | +1 | RECENT PASSES, SPEED |
| `carName` | display800 | 23 (card), 21 (row), 18 (grid card), 36 display (detail) | 0 | '70 DODGE CHARGER R/T |
| `buttonPrimary` | display | 20–24 | +1 | START RACE |
| `buttonGhost` | display800 | 20–22 | +1 | TRY DEMO MODE |
| `tabLabel` | display800 | 12 | +1 | SPEED |
| `gaugeReadout` | hudBold | 84 / 1.0 | −2 | 247 |
| `heroNumber` | hudBold | 64 (current lap), 40 (best speed) | −1 | 2.31 |
| `statValue` | hudBold | 30 (Speed stats), 24 (Results), 18 (car stats) | 0 | 247 |
| `lapTime` | hud | 20 (tower), 14 (chart) | 0 | 2.847 |
| `eyebrow` | hud | 11 (10 in dense cells) | +2 | BEST, CURRENT LAP |
| `chip` | hudBold | 11–12 | +1.5 | PORTAL LIVE |
| `body` | body | 16 / 1.45 | 0 | settings row labels, Connect copy |
| `bodySmall` | body | 13–14 / 1.4 | 0 | hints, meta lines |

Uppercase everything in display and HUD styles. Body copy is sentence case.

### 1.3 Shape, skew and spacing

| Token | Value | Use |
|---|---|---|
| `radiusR.panel` | **0** | Every panel, card, row group, input, stepper, tab bar |
| `radiusR.plate` | 6–10 | Race plates (7 at 52×44, 8 at 62×50, 10 at 92×72) |
| `radiusR.pod` | 14 | Start-light pods |
| `radiusR.pill` | 999 | Status chips, the history "live" dot |
| `skewR.button` | −12° | Buttons, tags, chips, filters, switches, delta badges |
| `skewR.plate` | −10° | Race plates, chart bars, heat cells |
| `skewR.segment` | −20° | Lap segments, lap-chart bars (−18°) |
| `skewR.indicator` | −24° | Active-tab indicator |
| `skewR.ribbon` | −14° | Corner ribbons (ON PORTAL, toy number) |

**The skew pattern.** A skewed container holds content counter-skewed by the opposite
angle, so text stays upright and readable. Build a `SkewBox` primitive for this:
`transform: [{ skewX: '-12deg' }]` on the outer `View` and `[{ skewX: '12deg' }]` on the
inner one. A skewed full-width button sticks out past its box by
`height × tan(12°)` ≈ 12 pt at 56 pt tall. Inset full-width skewed buttons by that much
on each side, which the mockups don't yet do.

**Spacing.** Screen gutter 16 (headers 20). Panel padding 12–14. Rows in a list group
are 54 tall (≥ 44 touch target). Stat cells sit 2 apart on asphalt, which reads as a
hairline grid. Section gap 22 (Settings) and 14 (Trophy case). Tab bar is 86 tall:
62 of content plus the 24 home-indicator inset (use the real safe-area value).

### 1.4 Depth and glow

No drop shadows on panels. Glow marks a live state only:

- the gauge arc: `drop-shadow(0 0 8px rgba(255,106,19,0.7))`;
- the on-portal garage card: a 2 pt flame ring plus a 22 pt flame glow at 35 %;
- lit start lights: a 26 pt glow at 85 %;
- connected dots: a small glow in their own colour.

In React Native, use `boxShadow` (RN 0.85, new architecture) or the existing
`elevation.accentGlow` preset. Express "top accent bars" as a real 3–5 pt `View` at the
top of the panel, **not** an inset shadow.

---

## 2. Trackside kit: motif primitives

Build each as a small, pure component in `apps/mobile/src/components/redline/`. Drawn
items use `react-native-svg`; repeating fills use an SVG `<Pattern>`. React Native has
no CSS `repeating-linear-gradient`. All are decorative: mark them
`accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"`.

| Component | Spec (from source) | Props |
|---|---|---|
| `Kerb` | 45° diagonal stripes of two colours, stripe width ≈ height × 2 (10 at 5 pt tall, 18 at 20 pt). Default flame and chalk | `height`, `colors=[flame, chalk]`, `stripe?` |
| `Checker` | Square checkerboard, chalk and asphalt, square size `size`, optional skew or rotation | `size`, `rows/cols` or fill, `skew?`, `rotate?` |
| `RakeLines` | Background hatch: −60° lines, 2 pt thick, every 16–22 pt, `rgba(245,247,250,0.03–0.04)`. On orange: `rgba(7,9,15,0.06)`, 3 pt every 26 | `opacity`, `spacing`, `color` |
| `TrackLane` | Asphalt strip with flame edges (6 pt) and a dashed chalk centre line (26 on, 20 off, 4 pt) | `height` |
| `RacePlate` | Chalk rounded rectangle, skew −10°, asphalt digits in `display` face. Sizes 46×38 / 52×44 / 62×50 | `number`, `size` |
| `Roundel` | Circle plate: chalk or flame fill, asphalt display digits. 34 pt in garage cards | `number`, `fill` |
| `StartLights` | Asphalt housing with N pods; lit = `redFlag` plus glow, off = `lightOff`. The Countdown screen uses 3 pods × 2 lights (58 pt) | `count`, `lit`, `go?` |
| `SpeedStreaks` | Three or four rounded horizontal bars (3–8 pt tall) of different lengths: chalk at 0.2–0.6 opacity, plus one flame | `side`, `scale` |
| `Chevrons` | Chevron path `M4 4 L28 32 L4 60 L18 60 L42 32 L18 4 Z` (44×64 viewBox), repeated with rising opacity | `count`, `color` |
| `FlameTongues` | Flame paths from `Speed.dc.html` (two clusters, 120×96 viewBox, flame and caution fills) | `opacity` (animated) |
| `CarSilhouette` | Generic side-view car (200×60 viewBox) from the sources: body path, window path, two wheels with hubs. **Fallback only.** Use `CarPhoto` when catalog artwork exists | `color`, `width`, `outline?` (dashed, for unidentified) |
| `Medallion` | Pointy-top hexagon `M28 2 L54 17 L54 47 L28 62 L2 47 L2 17 Z` (56×64), 3 pt ring, icon centred (24 pt) | `unlocked`, `icon`, `size`, `featured?` |
| `Wordmark` | "REDLINE" in display face plus a skewed flame "ID" tag with asphalt text. Inverted on orange | `size`, `inverted?` |
| `SkewBox` | Skew container with counter-skewed child (see §1.3) | `angle`, `style` |

---

## 3. Components

Restyle the existing components wherever possible; create new ones only where noted.

| Component | Status | Spec |
|---|---|---|
| `RaceButton` (new) | new | Variants: **primary** (flame fill, asphalt display-900 text, 56 tall); **ghost** (2 pt chalk border, chalk display-800 text, 50–54 tall); **destructive** (2 pt `redFlag` border and text). All skewed −12° with counter-skewed label. An optional trailing chevron (`M9 5l7 7-7 7`, 3 pt stroke). Pressed: opacity 0.85 plus a slight scale. Disabled: 40 % opacity |
| `StatusChip` (new; same data as `StatusPill` / `PortalStatusRibbon`) | new | Pill, 1 pt border, 8 pt status dot, `chip` text. Tones per §1.1: connected / searching (hollow ring dot) / on portal / demo. Tap behaviour: same as the existing pill (connect / retry / confirm-disconnect) |
| `SectionHeader` (new) | new | `sectionTitle` text plus a flex-1 `rule` hairline plus an optional right-aligned HUD count. The Settings variant has a flame HUD index ("01") before the title |
| `ScreenHeader` (new) | new | Large `screenTitle` on the left, optional right slot (HUD count, text button, status chip). Optional back link above it (electric chevron + label, 32–44 tall) |
| `StatCell` / `StatRow` | restyle `TelemetryValue` | `pitLane` cell, eyebrow, `statValue`, unit line. An optional 3 pt top accent bar (caution = best, flame = total, electric = best lap). Cells are 2 pt apart |
| `TimingRow` (new) | new | 50 tall `pitLane` row. A 42 pt lap-number cell on the left (`gridBox`, display "L2"). Then time (HUD 20), delta (HUD 14, `deltaSlower` or `greenFlag`), gate speed (HUD 14). Fastest: electric number cell, electric time, a FASTEST label and a 1 pt electric ring. Running: 75 % opacity, flame lap number, "running…" |
| `SkewSwitch` (new; replaces RN `Switch` in Settings) | new | 54×30, skew −12°, 3 pt padding, 22×24 knob. ON: flame track, asphalt knob at the end. OFF: `steel` track, `inkMuted` knob at the start. `accessibilityRole="switch"` and `accessibilityState={{checked}}`. Animate the knob with a reanimated spring (respect reduce-motion) |
| `TelemetrySegmentedControl` | restyle | Skewed segments 34 tall, HUD bold 13. Selected: chalk fill with asphalt text. Unselected: `steel` with `inkSecondary` text |
| `CompactStepper` | restyle | `inset` box, `fieldBorder`, 44×36 −/+ buttons, HUD bold value in the middle |
| `SettingRow` / `SettingGroup` / `SettingsSection` | restyle | 54 pt rows on `pitLane` with square corners and `divider` lines between rows. Hints in `bodySmall` / `inkSecondary` below the label line. Keep the geometry fixes from the earlier overhaul |
| `FilterChip` (new) | new | Skewed −12°, 36 tall, display-800 16. Selected: chalk fill with asphalt text. Unselected: transparent with a 1 pt `fieldBorder` and an 8 pt series colour square. Horizontal scroll |
| `PortalStatusRibbon` | restyle | Keep its behaviour. Restyle with `StatusChip` language: asphalt background, `hairline` bottom border, HUD 11 tone label. **Hide it on the Speed tab**, where the header `StatusChip` replaces it (see §4.2) |
| Tab bar (`(tabs)/_layout.tsx`) | restyle | `pitWall` background, `hairline` top border, 5 tabs. Icons stay `MaterialCommunityIcons` (`speedometer`, `flag-checkered`, `garage`, `history`, `dots-horizontal`), 24 pt. Labels `tabLabel`. Active: flame, plus a 3 pt flame bar at the top edge spanning the middle 52 % of the tab, skewed −24°. Inactive: `inkMuted`. Animate the indicator between tabs with a spring (static under reduce-motion) |

---

## 4. Screens

Each section lists the reference image, the existing route or file, the layout, and the
data mapping. **"No mockup"** means: apply this system to the existing layout, keeping
its structure. Use the screens that do have mockups as the pattern.

### 4.1 First run: Find your portal — `png/Connect.png` (new state)

**What it is.** The **disconnected / searching state of the Speed tab**, shown instead of
the gauge when there is **no portal connection, no car and no pass in this session, and
the app is not in demo mode**. It is not a separate route and needs no new persisted
setting. Settings keys must not change.

- Centred small `Wordmark`, then the `screenTitle` "FIND YOUR / PORTAL" (54, two lines).
- **Illustration** (390×330 SVG, copy from source): radar rings around the portal gate,
  then an orange track in perspective with `flameDeep` / `flameMid` rails, then the
  portal arch (chalk stroke 10, `pitLane` fill, asphalt inner), an electric Bluetooth
  glyph with a glow dot, and speed streaks. Under reduce-motion it stays static.
  Otherwise the dashed inner ring rotates slowly and the outer rings pulse outward
  (2.4 s loop).
- A full-width 14 pt `Kerb` under the illustration.
- A `StatusChip` in the searching tone ("SEARCHING…"), plus copy: "Switch on your Race
  Portal and keep your phone close. We'll connect on our own."
- Three step tiles in a 3-column grid (`pitLane`, flame display number 01/02/03,
  body 13 semibold): "Power on the portal", "Allow Bluetooth", "Send a car through".
- A ghost `RaceButton` "NO PORTAL? TRY DEMO MODE" that switches to demo mode through
  the existing controller action.
- If Bluetooth is off or unauthorised, swap the chip to the fault tone and replace the
  copy with the existing `BleStatusBanner` message and action. Reuse `bleStatus.ts`.

### 4.2 Speed — `png/Speed.png` (`src/app/(tabs)/index.tsx`)

- **Header** (top 58, gutter 20): `Wordmark` (30) on the left, `StatusChip` on the right.
  The chip replaces the shell ribbon on this tab only.
- **Background:** `RakeLines` across the top 420 pt.
- **Gauge**: a new `variant="redline"` of `components/gauge/Speedometer.tsx`. **Keep the
  existing needle variant as the default** so `TvStage` is unchanged.
  - 340×300 box, centre (170, 165). **240° sweep**: −120° to +120° with 0° pointing up
    (SVG angle 150° → 30° clockwise). Add `REDLINE_START_ANGLE = -120` and
    `REDLINE_END_ANGLE = 120` next to the existing constants in `geometry.ts`.
  - Zone ring r = 152, width 4 (zones per §1.1). Track r = 134, width 18, `trackGrey`.
    **Progress arc** r = 134, width 18, flame, with glow.
  - Minor ticks every 10 scale mph (r = 116, length 5, `tickMinor`). Major ticks every
    30 (length 11, `inkSecondary`). Labels every 60 at r = 100: HUD 13, `inkMuted`;
    240 and 300 in `redFlag` bold.
  - **Tip "comet"** at the end of the arc: r = 15 flame circle at 30 % opacity under an
    r = 6 chalk dot.
  - **Readout:** HUD bold 84, tracking −2, centred at y ≈ 116–200 in the box, then
    "SCALE MPH" (HUD 13, tracking 3, `inkSecondary`). Replace "MPH" with the unit label
    from `speedUnitLabel` when km/h is selected.
  - **NEW BEST** tag above the readout (caution `SkewBox`, display 15) while the
    readout equals a new session best.
  - **Flames:** two `FlameTongues` clusters at the bottom-left and bottom-right of the
    box (behind the arc ends). Their opacity follows the **animated** value: 0 below
    200, ramping to 0.6 at 240, 1.0 at 240 and above. This reuses `FlameField`'s
    heat logic and threshold (`speedGauge.flameThreshold`).
  - **Motion:** drive the arc (`strokeDasharray` / `strokeDashoffset`) and the tip
    position from the **same UI-thread shared value and choreography** the needle uses
    today: 620 ms ascent, 900 ms hold, damped-spring return, equal-speed retrigger by
    pass id, "track" mode during races, and a static target under reduce-motion. Do not
    regress any behaviour listed in `docs/design/ui-overhaul/IMPLEMENTATION.md` →
    "Native polish and motion verification".
- **Car on portal** card (restyle `ActiveCarStrip`; it links to car detail): `pitLane`,
  96 tall, a 5 pt `Kerb` across the top.
  - Left: `RacePlate` (52×44) with the car's **plate number**: its 1-based position in
    the garage ordered by `firstSeen`, zero-padded to two digits. This is a stable
    derivation; do not store it.
  - Middle: a flame "● ON PORTAL" eyebrow (or "LAST SCANNED" in `inkMuted` when
    `!isCurrent`), the car name (display-800 23, ellipsised), and series · year.
  - Right: `CarPhoto` when artwork exists, otherwise `CarSilhouette` in flame (86×26).
- **Stats row:** three `StatCell`s: LAST (last pass), BEST (session best, caution with
  a caution top bar), PASSES (session count, unit "SESSION").
- **Recent passes:** restyle `SpeedTrace` as **bars**. `pitLane` panel, title
  "RECENT PASSES" with a "LAST N" HUD caption on the right. Show up to 14 bars, skewed
  −10°, height proportional to speed over the gauge max, 6 pt gap.
  - Colours: `barMuted` by default; flame at 220 mph or more; the latest bar caution
    if it is a new best, otherwise flame.
  - A dashed `redFlag` (50 %) line marks 220.
  - New bars grow in with a 240 ms ease-out (none under reduce-motion).
- iPad two-pane layout: keep the existing `useLayout()` behaviour. Put the gauge in the
  left pane and the car, stats and passes in the right pane.

### 4.3 Race: setup — no mockup (`race/components/RaceSetup.tsx`)

Apply the system:
- solo / lineup mode cards as `pitLane` panels, with a flame 3 pt top bar when
  selected;
- lap-count chips as `FilterChip`s;
- player name in an `inset` field;
- car picker using `RacePlate` + car name;
- a "START RACE" primary `RaceButton` fixed at the bottom (inset per §1.3).

Show `PortalReadiness` as a `StatusChip` row.

### 4.4 Race: countdown — `png/Countdown.png` (`RaceCountdown.tsx`)

- Immersive (no tab bar, matching today's behaviour). Header: a round 44 pt
  `pitLane` cancel button with an X glyph (accessibility label "Cancel race"), and a
  centred HUD caption "SPRINT · N LAPS" (or the mode name).
- **Start-light gantry:** a striped `steel` beam (12 pt) with three 4 pt hangers, over
  **3 pods × 2 lights** (58 pt), 14 pt gaps, 34 pt side insets.
  - The existing `count` drives the lights: **3 → pod 1 lit, 2 → pods 1–2, 1 → all three
    red, GO (0) → all six lights switch to `greenFlag`**. The giant digit becomes
    "GO", in green.
- **Giant digit:** display 320, chalk. Behind it, two outline "speed echoes"
  (2 pt flame stroke, no fill) offset −28 and −54 pt at 55 % and 25 % opacity.
  - On each tick the digit scales from 1.15 to 1.0 (spring) and the echoes slide in
    from the left (200 ms).
  - Under reduce-motion there are no scale or echo transitions. Keep the existing
    haptics, sound cues and accessibility announcements exactly.
- "LINE UP AT THE GATE" (display-800 26), a racer card (`pitLane` with a flame top
  bar, `RacePlate`, flame eyebrow "PLAYER · ON GRID", car name, BEST lap on the right),
  and an "UP NEXT" row (chevron + HUD eyebrow + body) when a race-night lineup has a
  next racer.
- **Start line** across the bottom: a 58 pt `pitLane` strip with a 5 pt flame top
  border, a dashed centre line and a 26 pt-wide `Checker` column in the middle.

### 4.5 Race: live — `png/Race.png` (`RaceProgress.tsx`, `RaceLeaderboard.tsx`)

- **Header:**
  - Left: display-800 "LAP" (22, `inkSecondary`), the lap number (display 80) and
    "/N" (display 36, `inkMuted`).
  - Right: a green "● GREEN FLAG" chip text, the total time (HUD 26, `MM:SS.mmm`) and
    a "TOTAL" eyebrow.
- **Lap segments:** N skewed (−20°) 14 pt segments with 8 pt gaps. Completed segments
  are flame; the fastest-lap segment is electric. The current segment is a `steel`
  trough filled with a flame/chalk `Kerb` to the **pace estimate** (below). Future
  segments are `steel`.
- **Track map** (`inset` background with a 24 pt grid at 5 % opacity):
  - a fixed decorative loop path (copy `d` from `Race.dc.html`), drawn as an asphalt
    shoulder (28) under a flame track (16) under a dashed centre line;
  - the **PORTAL GATE** (arch plus a checker block) on the top straight;
  - direction chevrons.
  - **Markers are a time projection, not a position.** The portal only sees gate
    crossings, so label the panel "PACE ESTIMATE". Compute
    `fraction = currentLapElapsed / referenceLap` along the path, using
    `getPointAtLength` maths. Precompute a polyline of about 200 points once for the
    worklet.
    - **Best-lap ghost:** electric ring. `referenceLap` is the fastest completed lap
      in this race; before any lap is complete, use the car's `bestLap`. If there is no
      reference, hide the ghost.
    - **Last-lap marker:** a chalk dot projected from the previous lap's time.
    - Wrap at 1.0. Past the reference time, park the marker on the gate and pulse it.
  - **Mockup correction:** the mockup draws the ghost *ahead* of "You" while showing
    −0.12 (ahead). Implement the rule above, not the mockup's dot placement. Legend
    labels: "Last lap" and "Best-lap ghost".
- **Current lap:** a "CURRENT LAP" eyebrow, then elapsed time in HUD bold 64 with a
  small "s" unit, ticking at UI-thread frame rate. On the right, "VS FASTEST": a
  skewed delta badge, green "−0.12" when ahead and `deltaSlower` "+0.08" when behind,
  compared with the fastest lap so far. Hide it on lap 1.
- **Timing tower:** a "TIMING" section header with a "GATE SPEED" caption, then a
  `TimingRow` per lap. Completed laps show the delta to the fastest lap. The fastest
  lap row is electric. The running lap is the last row. For the gate-speed column,
  see "Gate speed" below.
- **End race:** a destructive ghost `RaceButton` "END RACE EARLY", full width (inset
  per §1.3). It keeps today's behaviour: the race engine's early finish, with **no**
  confirmation dialog, as now. Don't add one in this pass.
- **Gate speed:** the race engine stores only `lapTimes`, not per-lap speeds. Show the
  GATE SPEED column only if you can match each lap-closing gate time to a
  `usePortalStore` pass client-side. Otherwise drop the column and its caption.
- Lineup / tournament heats: no mockup. Reuse this layout and put the racer's
  `RacePlate` + name in the header area.

### 4.6 Race: results — `png/Results.png` (`RaceResults.tsx`)

- **Checker banner:** a full-bleed `Checker` band (32 pt squares, 64 tall) rotated −6°
  with 4 pt flame top and bottom borders, at y ≈ 48.
- A HUD eyebrow ("SPRINT · 5 LAPS · P1"), then "FINISH" (display 92).
- **NEW RECORD stamp** (caution double border, display 18, rotated −8°) when
  `result.bestLap` beats the car's previous `CarRecord.bestLap`, or the car had no
  previous best.
  - No record logic exists in `src/race/` today. Snapshot the car's `bestLap` from
    `useGarageStore` **when the race starts**, because the garage value is re-derived
    from `race_results` once the result is saved. Compare against that snapshot.
  - Keep it in a pure, unit-tested helper (e.g. `race/records.ts`), with no store or
    schema change.
  - The car row's "Beat its old best by 0.165 s" uses the same snapshot.
- **Stats:** TOTAL (flame bar), BEST LAP (electric bar, `result.bestLapNum` as
  "LAP n"), TOP SPEED (caution bar).
  - `RaceResult` has no speed field. Compute TOP SPEED client-side as the max
    `scaleMph` of `usePortalStore` passes whose `at` falls in the race window, for this
    car.
  - If that isn't reliably available, show **AVG LAP** (`result.avgLap`) in that cell
    instead. Never show an invented value.
- **Lap-by-lap chart:** a `pitLane` panel titled "LAP BY LAP" with a caption
  "SHORTER = FASTER". One row per lap: display lap label, a skewed (−18°) 18 pt bar,
  and a HUD time on the right. Bar width = `lap / slowest` (the slowest lap is 100 %).
  The fastest lap is electric (label, bar and time); others are `barMuted`.
- A car row (`RacePlate`, name, "Beat its old best by 0.165 s" when applicable).
- Actions: primary "RACE AGAIN" (with chevron), plus a square ghost share button
  (64 × 56, share glyph) using the existing `share/summary.ts`.
- Tournament / multi-racer results: no mockup. Show a podium-style list of
  `TimingRow`s ranked by total, with the winner's row in caution.

### 4.7 Garage — `png/Garage.png` (`src/app/(tabs)/garage.tsx`)

- `ScreenHeader` "GARAGE" with the subtitle "{identified} identified · {n} on portal"
  (keep today's summary rules). On the right: the car count (HUD bold 40, flame) over
  a "CARS" eyebrow.
- **Series filters:** a horizontal `FilterChip` row: ALL, then one chip per series
  present in the garage, from the catalog `series` field, sorted by count. This is
  **new client-side filtering**; it does not change the store.
- **Trading-card grid:** two columns on phone, 12 pt gaps; keep `useLayout().columns`
  on iPad. Each card is 216 tall:
  - **Photo bay** (118, `pitWall`): `RakeLines`, a darker 22 pt "road" strip at the
    bottom, the car (`CarPhoto` if artwork, else `CarSilhouette` tinted by series
    colour), a `Roundel` (plate number) top-left, and optional speed streaks.
  - **Info:** car name (display-800 18, 2 lines max), a series line (7 pt colour
    square + body 12), then at the bottom best speed (HUD bold 20) with
    "MPH BEST · N RACES" (HUD 10).
  - **On portal:** a 2 pt flame ring plus glow, and a flame "ON PORTAL" corner ribbon
    (skew −14°) top-right.
  - **Unidentified:** a dashed `inkDisabled` silhouette, a dashed "?" roundel,
    the name "MYSTERY CAR" in `inkSecondary`, and an electric "Tap to identify" line.
    It routes to the existing identify flow.
  - Series colours: use the three accents in a fixed order (flame, electric, caution)
    and then `greenFlag` / `redFlag` for further series. Colour is never the only cue:
    the series name is always printed.
- Empty state (no mockup): replace the emoji with a `TrackLane` + `CarSilhouette`
  (outline) illustration, plus the copy "Your collection lives here. Send a car
  through the portal."

### 4.8 Car detail — `png/CarDetail.png` (`src/app/garage/[uid].tsx`)

- Back link "‹ Garage" (electric) and an "ON PORTAL" chip when the car is current.
- **Hero bay** (218 tall, full-bleed, `pitWall`):
  - `RakeLines`, a 56 pt road strip with a 4 pt flame top border and a dashed lane
    line, speed streaks;
  - a large car (`CarPhoto`, or a 290 pt-wide `CarSilhouette`);
  - `RacePlate` (62×50) top-left;
  - a toy-number ribbon (`gridBox`, skew −14°, HUD 12 `inkSecondary`, e.g. "FXB03")
    top-right.
- Name (display 36, wraps) and series · wave, with a 8 pt series square. "Change"
  (electric) opens the existing identity picker, or "Identify" when unidentified.
- **Best-speed panel** (76, caution top bar):
  - a mini 240° arc (74×56) filled to `bestMph / gauge max` in caution;
  - best speed (HUD bold 40, caution) with a "BEST SCALE MPH" eyebrow;
  - a caution "GARAGE #n" tag: the car's rank by `bestMph` in the garage, shown only
    when n ≤ 3.
- A 4-up stat grid: BEST LAP (electric), RACES, SCANS (= `detections`), SEEN
  (`formatLastSeen`; "Now" when on portal).
- **Nickname:** a labelled `inset` text field ("Give this car a name"). It keeps
  today's nickname persistence.
- **Catalog** section: a section header with an electric "Source ↗" link (existing
  wiki link), then rows for Toy number, Wave and Year (HUD values) with `divider`
  lines between them.

### 4.9 History — `png/History.png` (`src/app/(tabs)/history.tsx`)

- `ScreenHeader` "HISTORY" with a "Clear" text button (electric) on the right. It
  keeps the existing confirm.
- **Last 14 days** panel: the title, plus a "{sessions} SESSIONS · {passes} PASSES" HUD
  caption.
  - 14 skewed (−10°) 30 pt cells coloured by the heat ramp (§1.1), with weekday
    initials under them (HUD 10).
  - Today has a 2 pt chalk ring and a chalk initial.
  - A "Fewer ▢▢▢▢ More" legend.
  - Compute from `listSessions()` client-side (bucket by local day). It has one
    accessibility label summarising the strip.
- **Sessions** are grouped TODAY / THIS WEEK / EARLIER (`SectionHeader`). Each row is
  76 tall:
  - date tab (58 wide, `gridBox`, display 28 day plus HUD month);
  - a 2 pt dashed asphalt "perforation";
  - start time (HUD 16) with a green "● LIVE" tag while `endedAt == null`;
  - meta "{n} passes · {duration}";
  - a sparkline (58 wide, flame; caution if the session holds the all-time best);
  - best mph (HUD bold 24) with a "BEST MPH" caption.
  - Live rows have a 3 pt `greenFlag` top bar.
- **Sparkline data:** `passesForSession(id)` already exists. Load it lazily per visible
  row, memoised, with no schema change. If that is too costly, ship without the
  sparkline (it is optional) rather than change persistence.
- **History detail** (`history/[id].tsx`, no mockup): a `ScreenHeader` with the
  session date, then the `StatRow` (passes, duration, best), the Speed screen's
  recent-pass bar chart for the whole session, then a `TimingRow`-style list of passes
  (time, car, mph).

### 4.10 More and Trophy case — `png/Achievements.png` (`src/app/achievements.tsx`, `(tabs)/more.tsx`)

**More (no mockup):**
- `ScreenHeader` "MORE", then the existing rows on a `pitLane` group: flame
  `MaterialCommunityIcons` icons, body 16 titles, `inkSecondary` subtitles and
  chevrons.
- Add a small trophy-progress line ("8/13") on the Achievements row.

**Trophy case:**
- Back link "‹ More", then the title "TROPHY CASE" (display 46) with "8/13" (HUD bold
  22, the unlocked count in caution) and an 8 pt caution/chalk `Kerb` progress bar.
- **Latest unlock** panel (84): a large flame `Medallion` (58×66) with an asphalt icon
  and an inner hex outline, the eyebrow "LATEST UNLOCK", the title (display 26) and its
  description. Faint flames sit in the corner. Hide the panel if nothing is unlocked.
- **Groups** SPEED / RACING / GARAGE (the catalog's `speed` / `racing` / `collection`
  categories): `SectionHeader` with an "unlocked/total" count, then a 4-column grid.
  Each tile:
  - a `Medallion` (50×57): unlocked = `gridBox` fill, caution ring, chalk icon;
    locked = `inset` fill, `barMuted` ring, `inkDisabled` icon;
  - the title (body 12 semibold);
  - an optional HUD progress line for locked items ("64/100", "BEST 247/290"). Build
    it from `achievements/engine.ts`: `metricValue()` gives the current value and
    the definition gives the target. `AchievementView.progress` (0..1) already
    exists.
- **Icons replace emoji in the UI.** Keep the catalog's `emoji` field for sharing and
  tests, and map `id → MaterialCommunityIcons` name in the UI:

  | id | icon | id | icon |
  |---|---|---|---|
  | speed-100 | `speedometer-slow` | race-marathon | `road-variant` |
  | speed-200 | `lightning-bolt` | lap-sub3 | `timer-outline` |
  | speed-240 | `fire` | collect-1 | `key-variant` |
  | speed-290 | `star-four-points` | collect-5 | `car-side` |
  | race-first | `flag-checkered` | collect-10 | `view-grid-outline` |
  | race-10 | `repeat` | collect-25 | `layers-triple-outline` |
  | laps-100 | `timer-sand` | | |

- **Unlock moment** (new): when an achievement unlocks during use, show a toast-style
  banner from the top:
  - `pitLane` with a caution top bar, a `Medallion`, and "TROPHY UNLOCKED · {title}";
  - success haptic (gated by the haptics setting);
  - 2.5 s, then auto-dismiss;
  - no animation under reduce-motion.

  Drive it from `newlyUnlockedIds()` in `achievements/engine.ts`, observed where
  `useAchievementsStore` records unlocks. Do not change the engine's or the store's
  public API.

### 4.11 Settings — `png/Settings.png` (`src/app/settings.tsx`)

This is a full-length capture. Keep every row and setting key exactly as today:
`playerName, defaultLaps, haptics, sound, reduceMotion, mockModeDefault, speedUnit,
speedCalibration`.

- Back link "‹ More", then `screenTitle` "SETTINGS".
- **Portal card** (new, top):
  - `pitLane` with a 5 pt green/asphalt `Kerb` when connected (caution/asphalt when
    searching, `steel` when idle);
  - a portal-arch glyph;
  - the tone eyebrow ("● CONNECTED");
  - "RACE PORTAL" (display-800 22) with the hint "Auto-connects when it's switched on";
  - a skewed ghost "DISCONNECT" / "CONNECT" button using the same controller
    actions as the ribbon.
- Sections use the numbered `SectionHeader`: 01 PROFILE, 02 RACING, 03 SPEED,
  04 FEEDBACK, 05 STARTUP, 06 COMMUNITY, 07 SYSTEM.
- Controls:
  - player name: right-aligned `inset` input, 150 wide;
  - default laps: `CompactStepper`;
  - units: skewed segmented control;
  - calibration: stepper ("1.00×") with its hint below;
  - haptics, sound, reduce motion and start in demo mode: `SkewSwitch`;
  - Share car identities: a row with a hint, count and chevron;
  - How to contribute: a chevron row;
  - Reset to defaults: `destructiveInk` text button, in its own group.
- **Footer:** a small `Wordmark` at 60 % opacity, "VERSION x.y (build) · CREDITS" (HUD
  11, read from `expo-constants`), and the Mattel disclaimer (body 12, `inkMuted`).

### 4.12 Other surfaces (no mockup)

- **Live log** (`live.tsx`): `ScreenHeader` "LIVE PORTAL". Events as `TimingRow`-like
  rows: HUD timestamp, a coloured event-type tag (chip styles), and the payload in HUD
  medium.
- **Credits** (`credits.tsx`), **Identify** (`identify.tsx`): apply the panels, section
  headers and typography. Identify's catalog list uses the garage card info layout as
  rows.
- **TV mode** (`tv.tsx`, `TvStage.tsx`): **out of scope for V1 visuals.** Leave
  untouched unless a later issue says otherwise. It keeps the needle gauge variant.
- **Banners** (`BleStatusBanner`, `PersistenceStatusBanner`): `pitLane` with a 3 pt top
  bar in the tone colour, plus a HUD eyebrow and body text.
- **Splash screen:** asphalt background (`#07090F`) with the icon's track glyph. Update
  `app.json` `expo-splash-screen.backgroundColor`.

---

## 5. App icon — `png/Icon.png`

- **Master artwork:** the `Track · default` SVG in `source/Icon.dc.html` (1024 viewBox).
  It shows speed streaks, a track curve (`flameDeep` 210 + flame 176 + a dashed chalk
  centre line of 12 at 85 %) and a checkered finish line rotated 17.8° at (845, 385).
- **Export rules for iOS:** a 1024 × 1024 PNG, **opaque and full-bleed**, with **no
  rounded corners**. Delete the `<rect rx="229">` mask and fill the whole square with
  `#07090F`; iOS applies its own mask. No alpha channel.
- Replace `apps/mobile/assets/images/icon.png`. Commit the SVG source as
  `apps/mobile/assets/images/icon.svg` and add a reproducible export script, e.g.
  `node` + `@resvg/resvg-js` as a **devDependency**, or a documented `rsvg-convert`
  command.
- **Android adaptive icon:** the foreground is the track and finish line on a
  transparent background, inside the 66 % safe zone. The background is solid
  `#07090F`. The monochrome version is the track silhouette only. Update the
  `adaptiveIcon.backgroundColor` in `app.json` to `#07090F`.
- **Small sizes** drop detail (centre line first, then checker squares), as shown on the
  board. A single 1024 master is fine for iOS. The board shows intent only.
- **Alternate icons** (Redline / Burnout / Checkered, unlocked by trophies) need a
  native module for `setAlternateIconName`, which is a new native dependency. **Not V1.**
  Tracked as a stretch issue that needs owner approval.

## 6. App Store screenshots — `png/Store01.png` … `png/Store06.png`

- Six portrait frames, 430 × 932 in the mockup, which is ⅓ of **1290 × 2796** (6.7").
  **Check App Store Connect's current required sizes** (it may require 6.9",
  1320 × 2868) and render at whatever it asks for.
- Each frame:
  - **headline** in display 64 (two lines), with a HUD eyebrow or a `Wordmark` above;
  - **background:** flame (frame 1), asphalt (2, 4, 6), `inset` with a track ghost (3),
    or electric (5), plus one motif;
  - a **phone bezel** (324 × 678, radius 54, 10 pt bezel `#141A25` / `#1A2230`) holding
    a **real screenshot** of the matching screen from the app in demo mode;
  - a Dynamic Island pill.
- The phone bleeds off the bottom edge.
- Frames and captions:
  1. THE PORTAL IS BACK. — Speed (demo, readout ≥ 240 so flames show)
  2. LIGHTS OUT. LET'S RACE. — Countdown at "2"
  3. EVERY LAP ON THE CLOCK. — Race live, lap 3/5
  4. BEAT YOUR BEST. — Results with NEW RECORD
  5. EVERY CAR, REMEMBERED. — Garage
  6. 13 TROPHIES TO HUNT. — Trophy case
- **Reconcile** with `docs/release/app-store-submission.md`, which lists a different
  order including race-night lineup and tournament. Update that doc's table to the
  final set and keep its rules. Do not show "Hot Wheels" or Mattel marks. Avoid frames
  whose subject is a single full-bleed CC BY-SA car photo. iPad landscape frames are
  still required: same headline system, landscape bezel.
- **Build** the frames as a reproducible HTML template + Playwright script under
  `docs/release/screenshots/`. It takes simulator captures (PNG) and composites them at
  the exact pixel size. The artboards in `source/Store0*.dc.html` define the layout.

---

## 7. Motion summary

All decorative motion goes through `useTelemetryMotion` (the existing single
reduce-motion gate: OS flag OR the `reduceMotion` setting). Under reduce-motion,
everything below is static, except the tab indicator, which switches instantly.

| Moment | Motion |
|---|---|
| Pass on Speed | Arc + comet follow the existing sweep (620 ms up / 900 ms hold / spring back). Flames fade with the animated value. NEW BEST tag pops (scale 0.8→1, spring). Newest bar grows (240 ms) |
| Tab change | Indicator slides and its width springs |
| Countdown tick | Digit springs 1.15→1. Echoes slide in. Lights switch on with a 120 ms glow bloom. GO turns everything green |
| Lap complete | Segment fills (Kerb sweeps to full, 300 ms) then settles to flame or electric. A new TimingRow slides down from the top (220 ms) |
| Finish | Checker band slides in from the left (350 ms). Stamp drops in (scale 1.4→1, rotate −14→−8) when it's a record |
| Trophy unlock | Banner drops from the top (spring), holds 2.5 s, rises out |
| Connect | Radar rings pulse outward on a 2.4 s loop. Dashed ring rotates 20 s/rev |

## 8. Accessibility checklist

- Touch targets ≥ 44 pt (tab items, back links, steppers, chips, switches).
- Every number readable by VoiceOver with its unit: "247 scale miles per hour".
- Decorative motifs are hidden from accessibility.
- Speed zones and deltas are never colour-only: zones have labelled ticks; deltas carry
  a sign and the word "faster/slower" in the accessibility label.
- Heat strip, lap segments and progress bars have a single summarising label.
- Dynamic Type: body text scales. Display and HUD headings may cap at 1.3× and must not
  clip (`adjustsFontSizeToFit` on single-line display titles).
- Keep every existing `AccessibilityInfo.announceForAccessibility` call (status
  changes, car changes, countdown).
