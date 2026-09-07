# Proposal A — **Arcade Racer**

> *The app should feel like the loudest cabinet in the arcade — die-cut stickers, fat
> chrome numbers, a needle that slams and a crowd that goes wild when you beat your best.*

Companion mockup: [`mockups/arcade-racer/index.html`](./mockups/arcade-racer/index.html)
(open directly from disk — looping, non-interactive).

Input constraints: [`00-research.md`](./00-research.md) §4–§6 are treated as binding.
Nothing in this proposal touches `packages/protocol`, `src/ble`, `src/transport`,
`src/portal`, store shapes, settings keys, or the TV stage contract.

---

## 1. Concept & personality

Redline ID today is a *tasteful telemetry dashboard*. It's dark, restrained, hairline
borders, one moving part. It reads like an instrument. But the actual context is a kid
lying on the carpet next to a play mat, three feet from a phone propped against a
cereal box, yelling at a sibling. That context wants an **arcade cabinet**, not an
instrument cluster.

**Arcade Racer** rebuilds the shell around four ideas:

1. **Toy-box geometry.** Everything is a die-cut sticker: fat 20–32pt corners, a 2px
   bright rim, and a *hard* offset shadow (no blur) so cards look like vinyl decals
   peeled onto a night track rather than translucent panes floating in space.
2. **Numbers are the hero.** Speed, lap time, lap count, car count — every number that
   a kid cares about gets promoted to a chunky wide display face at 40–96pt with
   tabular figures, glanceable from across the room. Labels shrink to tiny uppercase
   eyebrows and get out of the way.
3. **Motion is a reward, not decoration.** Today one component moves. Here, every
   meaningful event has a physical consequence: the needle slams and rebounds, the
   flame field breathes, a light streak crosses the gauge as the car crosses the beam,
   confetti bursts on a record, the lap ribbon pops as each segment fills, the tab puck
   springs. Springs overshoot on purpose — the whole shell is slightly rubbery.
4. **Track dressing, used sparingly.** Checkered flags, speed lines, and starting-grid
   lamps appear as *motifs* (a corner ribbon, a 6px edge stripe, a divider), never as
   wallpaper. Two-to-three per screen, max. This is the line between "arcade" and
   "clip art".

**Kid-friendly, not childish.** No rounded cartoon mascots, no comic-sans energy, no
baby-blue. The palette stays hot and high-contrast; the typography stays a real
industrial grotesque; the layout stays disciplined on a 4pt grid. It reads the way a
good die-cast blister pack reads: loud, but *designed*.

**And it is emphatically not a Hot Wheels reskin.** The flame is a gradient, not a logo;
the checkers are a 6px stripe, not a flag graphic; no Mattel marks, colours-as-trade-dress,
or casting art anywhere in the chrome.

---

## 2. Design language — deltas vs. today's tokens

All changes to `src/theme/tokens.ts` are **additive**. Every existing key keeps its name
and meaning so no consumer (including `TvStage`) breaks; a few values are re-tuned.

### 2.1 Colour

| Token | Today | Arcade Racer | Why |
|---|---|---|---|
| `bg` | `#0b0f1a` | `#070a12` | Deeper black so the sticker rims and glows read as *light*, not paint. |
| `bgLift` | — | `#0e1424` | New. Top-of-screen wash under headers (paired with `bg` in an SVG vertical gradient). |
| `surface` | `#111827` | `#141d33` | Nudged up: cards must clearly sit *above* the deeper bg. |
| `surfaceAlt` | `#0f1626` | `#0d1424` | Nested/inset (segmented tracks, inputs). |
| `surfaceRaised` | `#16203a` | `#1b2745` | Hero/"alive" cards. |
| `border` | `#1e2a44` | `#26355c` | Hairlines only. |
| `rim` | — | `rgba(255,255,255,0.10)` | New. The 2px sticker outline on every card. |
| `rimHot` | — | `rgba(255,168,64,0.55)` | New. Sticker outline for accent/alive cards. |
| `accent` | `#ff7a1a` | **unchanged** | Identity. Non-negotiable. |
| `accentBlue` | `#26c6ff` | **unchanged** | Identity. |
| `flameHi` | — | `#ffd166` | New. Hot end of the flame ramp (gradient stop 0). |
| `flameLo` | — | `#ff2d55` | New. Cool end of the flame ramp (gradient stop 1). |
| `arcadeViolet` | — | `#8b5cf6` | New tertiary. Achievements, tournament brackets, "special" states — gives the palette a third leg so orange/blue don't have to carry every meaning. |
| `lime` | — | `#a3e635` | New. GO lamp, "live" indicators — reads brighter than `zoneGreen` at speed. |
| `chalk` | — | `#f2f6ff` | New. Checker white / display-number white (slightly cool, never pure `#fff` on large areas). |
| `accentSoft` / `accentBlueSoft` | 0.12 alpha | 0.14 alpha | Marginally stronger; the deeper bg ate the old wash. |
| `zoneGreen/Yellow/Red`, `ok/warn/danger/idle`, `track` | — | **unchanged** | Semantics stay. |

Three new **gradient recipes** (constants, rendered through `react-native-svg`'s
`LinearGradient`/`RadialGradient` — `expo-linear-gradient` is *not* installed and this
proposal does not add it):

- `gradients.flame` — `flameHi → accent → flameLo`, used on the gauge's hot zone, the
  primary button fill, and record numerals.
- `gradients.cool` — `accentBlue → arcadeViolet`, used on the blue/secondary family.
- `gradients.nightSky` — `bgLift → bg`, the ambient backdrop behind every screen header.

**Colour-blind safety is unchanged and re-verified:** speed zones keep their *position*
on the arc, their numeric tick labels, and a text zone name ("HOT ZONE") in the readout.
Colour is never the only carrier. Same rule for the countdown lamps (position + digit)
and the race lap ribbon (fill position + `n / N` text).

### 2.2 Type — yes, bundle a display font

**Recommendation: bundle one display family via `expo-font`, keep body text on system SF.**

- **Display face: Archivo Expanded** (SIL OFL 1.1) — weights **700** and **800**, wide
  industrial grotesque with true tabular figures. Two static `.ttf` cuts, subset to
  Latin uppercase + digits + `/ . : ° #` ≈ **~55 KB each, ~110 KB total**. Loaded via
  `useFonts` in the root layout, gated behind the existing splash screen so there is no
  flash of fallback text.
- **Everything else stays system SF.** Body copy, hints, list subtitles, and all
  long-form text keep Dynamic Type behaviour and iOS's own hinting. If the font load
  fails, the app degrades to SF-Heavy and still looks intentional — the display face is
  a *finish*, never a load-bearing dependency.

Rationale for a *wide* rather than *condensed* face: the hero numbers are short (2–3
glyphs: `247`, `4/8`, `12.4s`). Wide glyphs fill the hero area with weight instead of
needing 96pt of height, and tabular figures stop the speed readout from jittering as
digits change.

Scale (additive):

| Token | Today | Arcade Racer | Use |
|---|---|---|---|
| `xs` | 11 | 11 | Eyebrows (uppercase, `letterSpacing: 1.4`) |
| `sm` | 13 | 13 | Hints, subtitles |
| `md` | 16 | 16 | Row labels, body |
| `lg` | 20 | 20 | Card headings |
| `xl` | 28 | 28 | Screen titles (now display face) |
| `xxl` | — | **40** | New. Stat-tile numbers, lap counter |
| `display` | 64 | 64 | Secondary hero numbers (results time) |
| `display2` | — | **96** | New. The speed readout, the countdown digit |

New `fontFamily` token: `{ display: 'ArchivoExpanded-Bold', displayHeavy:
'ArchivoExpanded-ExtraBold', body: undefined /* system */ }`, plus a
`numeric` style constant that always pairs `fontVariant: ['tabular-nums']` with it.

### 2.3 Radius — chunkier across the board

| Token | Today | Arcade Racer |
|---|---|---|
| `sm` | 8 | 10 |
| `md` | 12 | 16 |
| `lg` | 16 | 22 |
| `xl` | 24 | 30 |
| `xxl` | — | **40** (new — hero cards, the gauge frame) |
| `pill` | 999 | 999 |

Cards move from `radius.md` (12) to `radius.xl` (30). Icon tiles and chips use `lg`.
The rule: **the bigger the object, the fatter the corner** — the opposite of the usual
"constant radius" system, and it's what makes things read as toys.

### 2.4 Elevation — sticker, not fog

Existing `card` / `accentGlow` / `blueGlow` stay (TV stage and other consumers use them).
Three additions:

```ts
elevation.sticker   // shadowOffset {0, 6}, shadowRadius 0, opacity 0.55 — hard die-cut edge
elevation.stickerLg // shadowOffset {0, 10}, shadowRadius 0, opacity 0.5 — hero cards
elevation.pop       // accent glow, radius 28, opacity 0.7 — record/alive states
```

The hard-offset shadow (`shadowRadius: 0`) is the single biggest visual delta. Paired
with the 2px `rim` border it reads unmistakably as a sticker. Press states **collapse
the shadow** (`translateY: +4`, offset → `{0, 2}`), which is what makes buttons feel
physically depressible.

Android note: `shadowRadius: 0` has no Android equivalent; the `elevation` key stays set
so Android degrades to a soft shadow. iOS is the only shipping target today.

### 2.5 Motion tokens (new)

```ts
motion.spring = {
  pop:    { damping: 11, stiffness: 240, mass: 0.9 },  // overshoots ~8% — buttons, tiles, puck
  snap:   { damping: 9,  stiffness: 260, mass: 1.1 },  // the needle — overshoots hard
  settle: { damping: 20, stiffness: 150 },             // layout, entrances
}
motion.timing = { quick: 140, base: 260, slow: 460, hold: 1300 }
motion.stagger = { step: 40, cap: 8 }  // list entrances; delay = min(i, cap) * step
```

### 2.6 Iconography

- **Primary: `expo-symbols` (SF Symbols)** — already installed, unused today. SF Symbols
  in `.palette` rendering mode give two-tone chunky glyphs (orange body, chalk accent)
  that match the toy-box weight far better than MaterialCommunityIcons' uniform strokes.
- **Fallback: MaterialCommunityIcons** (current dep) behind a tiny `Glyph` component, so
  every icon has a guaranteed render path and nothing regresses if a symbol name is
  unavailable on the running iOS version.
- Icons are **never bare**. They sit in an `IconTile`: a 40×40 rounded-square
  (`radius.lg`) with an `accentSoft` fill and a 1.5px `rimHot` outline. This is what
  turns a settings list from a form into a shelf of objects.
- Two **motifs** carry the theme, both pure `react-native-svg`, no assets:
  `CheckerStrip` (a 6pt-tall two-row checker used as a card edge or divider) and
  `SpeedLines` (3–5 tapering horizontal streaks at 8° used behind hero numbers).

---

## 3. Per-screen redesign

### 3.1 Speed / home — **"The Dash"** (`(tabs)/index.tsx`)

Layout order on phone (single scroll column, unchanged structure):

1. **Header.** Wordmark `REDLINE ID` in display-heavy 28pt with a 3-line `SpeedLines`
   lockup to its left, subtitle unchanged (`Portal "…" · live BLE`). Right: `StatusPill`,
   restyled as a **pit light** — a 10pt colour dot, uppercase label, pill with a 2px rim
   and a matching-colour glow. Its props, behaviour, and role as *the connect control*
   are unchanged.
2. **Mode toggle** (demo/live) becomes the shared `SegmentedControl` with a spring puck.
3. **Banners** (`BleStatusBanner`, locked-firmware) restyled to sticker cards with a
   left 4pt colour bar; content and logic unchanged.
4. **The gauge** — the centrepiece, grown to ~55% of the first viewport.
   - Arc stroke thickens 12 → **22pt**, and the three zone bands are drawn as *separate*
     chunky segments with a 4° gap between them (arcade segmentation, not a smooth ramp).
   - The hot zone is filled with `gradients.flame` instead of flat `zoneRed`.
   - Ticks get display-face numerals at every `tickStep`; minor ticks are 2pt chalk dashes.
   - Needle: a tapered blade (wide at the hub, sharp at the tip) in `accent` with a 1pt
     `chalk` core highlight and a round chrome hub. Behind it, a **ghost needle** at 30%
     opacity that lags — a motion-blur trail, free, one extra animated prop.
   - The whole dial sits in a `radius.xxl` frame card with `elevation.stickerLg` and a
     `CheckerStrip` along its bottom edge.
5. **Readout.** Speed number at `display2` (96pt) tabular, centred, with the unit as a
   small pill tag beneath (`MPH` / `KM/H`) and the zone name as an eyebrow
   (`GREEN ZONE` / `HOT ZONE`) — the colour-blind-safe carrier.
6. **Speed trace** — *new*. A 44pt-tall SVG sparkline of the last 20 pass speeds with a
   flame-gradient stroke and a dot on the best. Zero new deps (research §8.4), and it's
   the single cheapest thing that makes the screen feel like live telemetry.
7. **Stat row.** Three sticker tiles (Best / Passes / Last), numbers at `xxl` (40pt),
   labels as `xs` eyebrows. The Best tile carries `elevation.pop` when the session best
   was set in the last 10 s.
8. **Car hero** (`CurrentCarHero`) → a **boarding-pass card**: car photo in a
   `radius.lg` rounded square with a rim, name in display uppercase, "ON THE MAT" /
   "LAST SEEN" as a corner ribbon, best-speed numeral bottom-right.
9. **Pass strip** (`RecentPasses`) → a horizontally scrolling row of chunky pass chips
   (`247 MPH · 2m ago`), best chip flame-filled with a tiny crown glyph.
10. **Controls.** Demo `Trigger pass` becomes a full-width `ChunkyButton` — flame
    gradient, 56pt tall, `radius.pill`, hard shadow, checker edge stripe.
11. **Empty state.** Replaces the current bare hint text with an `EmptyState`: an SVG
    starting-grid lamp tree, "ROLL A CAR ACROSS THE PORTAL", and the existing `liveHint`
    copy as the body.

**iPad**: the existing two-pane split (`layout.isSplit`) is preserved exactly — gauge +
stats + controls left, banners + hero + passes + trace right. Component identity across
rotation (the comment at `index.tsx:160`) is respected: regions stay as locals.

#### Motion — Speed

| Event | API | Reduce-motion fallback |
|---|---|---|
| Needle → pass | `angle.value = withSpring(target, motion.spring.snap)` driving `useAnimatedProps` on the SVG needle `Path` (unchanged mechanism, re-tuned to overshoot) | `withTiming(target, { duration: 0 })` — instant jump, no overshoot |
| Needle hold + return | `withDelay(motion.timing.hold, withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) }))` chained on the UI thread — **replaces the JS `setTimeout` at `index.tsx:118`**, removing a JS round-trip per pass | Same chain with `duration: 0` on the return |
| Ghost needle | Second shared value, `withSpring(target, { damping: 14, stiffness: 160 })` — lags the real needle by ~120 ms | Opacity forced to `0`; not rendered |
| Readout digits | `readout.value = withTiming(mph, { duration: 420, easing: Easing.out(Easing.expo) })` → `useDerivedValue` → `useAnimatedProps({ text })` on an animated `TextInput` (no per-frame JS re-render) | `withTiming(mph, { duration: 0 })` |
| Flame pulse ≥ `flameThreshold` | `heat.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.62, { duration: 700 })), -1, true)`; `cancelAnimation(heat)` on drop below threshold | `cancelAnimation` + `heat.value = 0.5` (static bloom, still communicates "hot") |
| Car-pass flash | `flash.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 260 }))`; a skewed chalk streak with `translateX: interpolate(flash, [0,1], [-W, W])` and `opacity: interpolate(flash, [0,.2,1], [0,.9,0])` | Not rendered |
| New record | `<RecordBurst/>`: 14 SVG chips, each `entering={ZoomIn.springify().damping(9).delay(i * 18)}`, `exiting={FadeOut.duration(220)}`; the Best tile scales `withSequence(withSpring(1.14, pop), withSpring(1, pop))` | A static `NEW BEST` sticker badge fading in over 120 ms with `FadeIn` at `duration: 0`; no chips, no scale |
| Section entrances | `entering={FadeInDown.springify().damping(15).delay(min(i, 8) * 40)}` on stat tiles, trace, hero, pass strip | `entering={undefined}` |
| Speed trace draw-in | `useAnimatedProps` on `strokeDashoffset`, `withTiming(0, { duration: 600 })` | Rendered fully drawn |

All of the above route through one gate: `useMotion()` returns
`{ reduced: useReducedMotion() || settings.reduceMotion, spring, timing, enter }`, and
every animated component takes its config from that hook. **There is exactly one place
in the codebase that decides whether motion happens.**

---

### 3.2 Race — **"Starting Grid"** (`(tabs)/race.tsx` + `src/race/components/*`)

The phase machine (`setup → countdown → racing → results`), the engine, the store, race
night, and tournament logic are all untouched. This is a presentation pass over
`race/components/styles.ts` plus one component-internal rewrite (countdown).

#### Setup
- **Mode** (Solo / Race night) → two big sticker tabs, 64pt tall, selected one lifts with
  `elevation.pop` and a flame edge.
- **Laps** → `SegmentedControl` in its *stacked* variant (4 options): a
  `surfaceAlt` track capped at 320pt, cells `minWidth: 56`, big display numerals, a
  spring puck.
- **Racer lineup** → numbered **grid slots**: `P1`, `P2`… in display face on a
  checkered slot card, with the assigned car photo and a drag-free reorder-by-tap.
  Add-racer input is a chunky field with a `+` `ChunkyButton`.
- **Portal readiness** (`PortalReadiness`) → a lamp row: three lamps that light as
  preconditions are met (portal connected · racer named · car on mat). Same underlying
  `canStartRace` logic; it just becomes legible at a glance.
- **Start** → `START RACE` in the flame `ChunkyButton`, 64pt, checker stripe. Disabled
  state desaturates and shows the blocking reason as a line beneath (today it's silent).

#### Countdown — **"Christmas tree"**
Full-bleed takeover. Three stacked lamp rows (amber · amber · green) above a `display2`
digit, racer name and car above that, `Cancel` as a ghost pill at the bottom.

**This is the one component with an internal API change:** `RaceCountdown` currently
takes `pulse: Animated.Value` (legacy RN `Animated`, plumbed from `useRaceSession`).
It should own its animation with Reanimated instead and drop the prop — the sequencing
that produces `count` stays in the engine/session, unchanged. Callers: `race.tsx` and
`useRaceSession`; check `useRaceSession`'s tests before removing the pulse.

#### Live
- **Lap ribbon** — *new*, replaces the plain lap hero. A chunky segmented bar with one
  segment per target lap; completed segments fill flame, the current one pulses, the
  `n / N` counter sits at `xxl` beside it. Position + text carry the state, not colour.
- **Lap timer** in display digits, tabular, driven through `useAnimatedProps` on an
  animated text so the ticking never re-renders the tree.
- **Lap list** rows become mini tickets; the best lap gets a rotated `BEST` sticker.
- Trigger-pass / Finish become `ChunkyButton` ghost + danger.

#### Results
- **Trophy card**: total time at `display` (64pt) over a flame wash, `FINISHED` eyebrow,
  racer · lap count beneath, `Up next` as a checkered footer strip.
- Best/Average/Worst as three sticker tiles.
- Share + primary action as chunky buttons; tournament `ChampionBanner` gets a foil shine.

#### Motion — Race

| Event | API | Reduce-motion fallback |
|---|---|---|
| Setup section entrance | `entering={FadeInDown.springify().damping(15).delay(i * 40)}` | none |
| Lineup slot add/remove | `entering={ZoomIn.springify()}`, `exiting={ZoomOut.duration(160)}`, container `layout={LinearTransition.springify().damping(18)}` | `entering/exiting/layout` all `undefined` (instant reflow) |
| Segmented puck | `x.value = withSpring(cellX, motion.spring.pop)`, `w.value = withSpring(cellW, pop)` | `withTiming(…, { duration: 0 })` |
| Countdown digit | `key={count}` + `entering={ZoomIn.springify().damping(10).stiffness(300)}`, `exiting={ZoomOut.duration(140)}` | `entering={FadeIn.duration(0)}`, no exit — digit swaps instantly |
| Countdown lamps | `lamp[i].value = withTiming(1, { duration: 120 })` staggered by `withDelay(i * 90, …)` | `withTiming(1, { duration: 0 })` — lamps still light (they carry meaning), just without ramp |
| GO flash | `go.value = withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 300 }))` on a full-screen lime wash | Not rendered |
| Lap segment fills | `seg[i].value = withSpring(1, pop)`; the just-filled segment scales `withSequence(withSpring(1.12), withSpring(1))` | `withTiming(1, { duration: 0 })`, no scale |
| Current-segment pulse | `withRepeat(withTiming(0.55, { duration: 800 }), -1, true)` on opacity | `cancelAnimation`, static opacity 1 |
| New lap row | `entering={SlideInRight.springify().damping(16)}` | none |
| Results hero | `entering={FadeInUp.springify().damping(13)}`; personal best triggers `<RecordBurst/>` | `FadeIn.duration(0)`; static `PB` sticker |
| Champion foil | `shine.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false)` → translateX sweep | Not rendered |

Existing haptics (`raceHaptic`) and race-cue sound stay exactly as gated today.

---

### 3.3 Garage — **"The Shelf"** (`(tabs)/garage.tsx`)

- **Header**: `GARAGE` in display face, the count promoted to a big `xxl` numeral in a
  sticker chip, subtitle unchanged.
- **Filter row** — *new*: three chips (`ALL` · `IDENTIFIED` · `ON PORTAL`) using
  `SegmentedControl`. Purely local `useState` over the already-computed identity
  snapshot; **no store change**.
- **Cards → die-cut tiles.** `radius.xl`, 2px rim, hard shadow, photo in a rounded-square
  with its own rim, name in display uppercase (2 lines max), best speed as a big flame
  numeral bottom-right, series/last-seen as a hint line. Identified cars get a
  **checkered corner ribbon** instead of today's subtle photo ring.
- **On-portal car floats to the top** as a full-width hero tile with a pulsing `rimHot`
  border and `elevation.pop` — today it's just a highlighted row wherever it sorts.
- **Grid: 2-up on phone.** This is a change to `layout.columns`' phone value (from 1).
  It's what makes the collection read as a *shelf of toys* rather than a spreadsheet.
  Cost: fewer stats per tile — the full stat block (best lap, race count) moves to
  `/garage/[uid]`, which already exists. Flagged as a change; `useLayout`'s API and the
  `key={cols-${columns}}` remount guard are untouched.
- **Empty state** → `EmptyState` with an SVG empty-shelf illustration and a bouncing
  arrow pointing at the Speed tab, replacing the 🏎️ emoji.

#### Motion — Garage

| Event | API | Reduce-motion fallback |
|---|---|---|
| Tile entrance | `entering={FadeInUp.springify().damping(15).delay(Math.min(i, 8) * 40)}` — delay is **capped** so a 60-car garage doesn't cascade for 3 s | none |
| Press | `scale.value = withSpring(0.96, pop)` on `pressIn`, `withSpring(1, pop)` on `pressOut` | `withTiming(0.98/1, { duration: 0 })` — keep a press state for feedback, drop the bounce |
| On-portal rim pulse | `pulse.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true)`; `useAnimatedStyle` → `interpolateColor(pulse, [0,1], [rim, rimHot])` | `cancelAnimation`, static `rimHot` |
| On-portal shimmer | A chalk gradient sweep, `withRepeat(withTiming(1, { duration: 2600 }), -1, false)`, **only on the single hero tile** | Not rendered |
| Filter change | `layout={LinearTransition.springify().damping(20)}` on tiles | `layout={undefined}` |
| New car arrives | `entering={ZoomIn.springify().damping(10)}` + one `RecordBurst` if it's the first time this UID is seen | `FadeIn.duration(0)`, no burst |

---

### 3.4 History — **"Race Log"** (`(tabs)/history.tsx`)

- **Sessions as ticket stubs**: a card with a dashed perforation down the left edge and
  two half-circle notches punched out of the sides (pure `View` + `borderRadius`, no
  assets). Date in display face, duration/pass-count/best-speed as three inline stats.
- **Live session** (`endedAt == null`) gets a pulsing `REC` dot and a lime rim.
- **Mini speed bar strip** on each stub: 12 tiny bars for the session's passes, tallest
  flame-tinted. Uses data the summary already carries; degrades to a pass-count pill if
  not available.
- **Day grouping** with sticky uppercase section headers (`SectionList` — swaps
  `FlatList`, same repo read, no store).
- Header uses the new shared `ScreenHeader`; `Clear` becomes a danger ghost pill in the
  right slot (fixed 64pt width, so the title stays centred whether or not it's shown —
  today it's swapped for a `clearPlaceholder`, which is the same instinct done ad hoc).
- **Empty state** → `EmptyState` with an SVG stopwatch/flag illustration.

#### Motion — History

| Event | API | Reduce-motion fallback |
|---|---|---|
| Stub entrance | `entering={FadeInDown.springify().damping(16).delay(Math.min(i, 8) * 40)}` | none |
| REC dot | `withRepeat(withSequence(withTiming(0.3, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true)` | Static opacity 1 (the dot still means "recording") |
| Clear / delete | `exiting={SlideOutLeft.duration(220)}`, list `itemLayoutAnimation={LinearTransition.springify()}` | both `undefined` |
| Bar strip grow | `height` per bar `withSpring(h, settle)` staggered `i * 25` | `withTiming(h, { duration: 0 })` |

---

### 3.5 More — **"Pit Wall"** (`(tabs)/more.tsx`)

- Rows grow to **64pt** and gain a 40pt `IconTile` (accent-soft fill, hot rim) on the
  left, title in display uppercase 16pt, subtitle in `sm` secondary, and a chevron in a
  28pt circular chip on the right.
- Rows group into **two sticker cards** with inset hairline separators, not five floating
  cards: *Play* (Achievements, Live portal, TV mode) and *App* (Settings, Credits).
- **TV mode** is visually flagged as a different surface — blue `IconTile`, blue rim, and
  a small `AIRPLAY` tag — because it's a mirrored stage, not another page.
- **Achievements** row shows its `unlockedCount/total` as a slim progress bar under the
  subtitle instead of plain text.
- Routes, hrefs, and the `Link asChild` pattern are unchanged.

#### Motion — More

| Event | API | Reduce-motion fallback |
|---|---|---|
| Row entrance | `entering={FadeInRight.springify().damping(16).delay(i * 40)}` | none |
| Press | `scale.value = withSpring(0.98, pop)`; `IconTile` `rotate: withSpring('4deg', pop)` | `withTiming(0.99, { duration: 0 })`, no rotate |
| Achievement bar | `w.value = withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) })` on focus | `withTiming(pct, { duration: 0 })` |

---

### 3.6 Settings — **"Garage Setup"** (`/settings`) — *the alignment fix*

This screen is rebuilt on a strict, shared row grammar. **Every settings key, store
selector, and setter call is unchanged** (`playerName, defaultLaps, haptics, sound,
reduceMotion, mockModeDefault, speedUnit, speedCalibration`) — this is presentation only.

#### The row grammar

```
SettingsSection                          ← owns ALL vertical rhythm
├─ eyebrow    xs / uppercase / ls 1.4 / textMuted / marginBottom 8
└─ StickerCard  radius.xl · rim 2px · elevation.sticker · padding 0
   ├─ SettingsRow  paddingH 16 · paddingV 10
   │  ├─ CONTROL LINE   minHeight 44 · row · alignItems 'center'
   │  │  ├─ label       flex 1 · md 16 · semibold · numberOfLines 1
   │  │  └─ control     right-aligned, vertically centred ON THIS LINE ONLY
   │  └─ hint           sm 13 / lineHeight 18 / textSecondary / marginTop 2
   ├─ Separator  1px · colors.border · marginLeft 16 · NO vertical margin
   └─ SettingsRow …
```

The one rule that fixes most of the audit: **the control is a sibling of the label
inside a 44pt line box; the hint is a sibling of that line box, not of the control.**
Today the control is a sibling of the whole `label + hint` stack, so it centres against
a two- or four-line block.

Row variants:

| Variant | Control placement | Used by |
|---|---|---|
| `switch` | On the control line, right | Haptics, Sound, Reduce motion, Start in demo mode |
| `stepper` | On the control line, right | Calibration |
| `value` | Right-aligned muted value + chevron | (future: any drill-in) |
| `segmentedInline` | On the control line, right — **only when ≤3 options** | Units |
| `segmentedStacked` | Full row below the label line, capped width | Default laps (4 options) |
| `input` | Field below the label line, full width | Player name |
| `action` | Full-width `ChunkyButton` as its own row | Share identities, Reset |
| `link` | Left-aligned accent text + `↗` | How to contribute |

#### Fix map — research §5, one by one

**1. Header not centred (`settings.tsx:158–170`, `headerSpacer` L169).**
New shared `ScreenHeader` with a **three-slot balanced grid**: `left` and `right` are
both fixed `width: 64`, `center` is `flex: 1` with `textAlign: 'center'`. The title is
now geometrically centred regardless of what's in the side slots. The back control
becomes a **44×44 circular chip** with a chevron glyph and `accessibilityLabel="Go back"`
— fixed width, so no optical drift, and it's a proper 44pt target. The header's inner
content is wrapped in the same `contentMaxWidth` column as the scroll content (the
background stays full-bleed), fixing the iPad mismatch where the header ran edge-to-edge
while content was capped.

**2. Switch floats mid-block (`settings.tsx:379–392`).**
`ToggleRow` is replaced by `SettingsRow variant="switch"`. The `Switch` sits inside the
44pt control line next to the label; the hint renders *below the line*. The switch's
vertical centre now lands on the label's cap-height centre — the iOS grouped-list
convention. The native `Switch` component is kept (correct VoiceOver semantics and
platform feel); only its container changes. `trackColor.true` moves to `colors.accent`
(unchanged) with `ios_backgroundColor: colors.track`.

**3. Stepper hangs low (`settings.tsx:247–282`).**
Same fix: `SettingsRow variant="stepper"`, stepper on the control line. Buttons shrink
from 48 → **36×36** (`radius.lg`, rim, `surfaceAlt`) with `hitSlop: 8` so the effective
target stays ≥44pt per the accessibility constraint. The value sits between them,
`minWidth: 56`, `textAlign: 'center'`, tabular display face. The three-line calibration
hint drops below the whole line at full width.

**4. Chips overstretch (`settings.tsx:201–218, 226–245`; `chip { flex: 1 }`).**
`flex: 1` on chips is deleted. A shared `SegmentedControl` replaces both cases with an
explicit sizing contract:
- Track: `surfaceAlt`, `radius.pill`, `padding: 3`, `alignSelf` set by variant.
- Cells: `minWidth: 56`, `paddingHorizontal: 16`, `flex: 1` **only within the track** —
  and the track itself is content-sized, never screen-sized.
- **≤3 options → `segmentedInline`**: track `alignSelf: 'flex-end'` on the control line.
  The two unit chips become a ~148pt segmented control on the right of the label — exactly
  iOS sizing, no more comically wide pills.
- **≥4 options → `segmentedStacked`**: track `alignSelf: 'stretch'`, `maxWidth: 320`,
  below the label line. Four lap cells at equal width inside a bounded track.
- Selection is an absolutely-positioned puck that springs between cells (see motion).

**5. Double section spacing (`content.gap` + `sectionLabel.marginTop`, L410–425).**
`content` drops to `gap: 0`. **All** vertical rhythm moves to one owner,
`SettingsSection`: `marginTop: 28` on every section, overridden to `marginTop: 8` on the
first. `sectionLabel` keeps only `marginBottom: 8`. One rule, one owner, perfectly even
rhythm — and no compounding when a section is conditionally hidden.

**6. Cramped card rhythm (`card { padding: 16, gap: 8 }`, dividers `marginVertical: 4`).**
The card becomes a pure container: `padding: 0`, `gap: 0`. Rows own their own
`paddingVertical: 10 / paddingHorizontal: 16` (→ 44pt line + 10pt top + hint + 10pt
bottom ≈ 76pt for a hinted row, 64pt for a bare one). Separators are 1px, inset
`marginLeft: 16`, **zero vertical margin** — the row padding *is* the breathing room, so
a hint can never crowd the next control. Hint `lineHeight: 18`, `marginTop: 2`.

**7. Reset orphaned (`settings.tsx:356–361`).**
It gains a home: a final `DANGER ZONE` section with its own eyebrow and sticker card
(danger rim), containing the destructive action row plus a hint explaining exactly what
it restores. Identical `Alert.alert` confirm flow. It now looks like the rest of the
screen instead of a button floating in space.

#### Resulting section order

1. `PROFILE` — Player name (`input`)
2. `RACING` — Default laps (`segmentedStacked`)
3. `SPEED` — Units (`segmentedInline`) · Calibration (`stepper`)
4. `FEEDBACK` — Haptics · Sound · Reduce motion (three `switch` rows)
5. `STARTUP` — Start in demo mode (`switch`)
6. `COMMUNITY` — Share identities (`action`) · How to contribute (`link`)
7. `DANGER ZONE` — Reset to defaults (`action`, danger)

#### Motion — Settings

Restrained on purpose: this is a form, and it is also *where you turn motion off*.

| Event | API | Reduce-motion fallback |
|---|---|---|
| Section entrance | `entering={FadeInDown.springify().damping(18).delay(i * 40)}` | none |
| Switch flipped | `flash.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 320 }))` → row background `interpolateColor` to `accentSoft` | Not run — row background static |
| Segmented puck | `x.value = withSpring(cellX, motion.spring.pop)`, `w.value = withSpring(cellW, pop)` via `useAnimatedStyle` | `withTiming(x/w, { duration: 0 })` — puck jumps, still correct |
| Stepper press | `scale.value = withSequence(withSpring(0.9, pop), withSpring(1, pop))`; value text `withSpring` scale 1.08 → 1 | `withTiming(1, { duration: 0 })` — no bounce; disabled state still dims to 0.35 |
| Reduce-motion toggled ON | Every looping animation across the app is cancelled on the next render because `useMotion()` re-reads the setting — no restart required | n/a |

Haptic `tick()` on every selection change is unchanged and still gated by the `haptics`
setting.

---

### 3.7 Tab bar — **"Pit Row"** (`(tabs)/_layout.tsx`)

Same five tabs, same order, same routes. Restyle only:

- Bar height +8pt, `surface` with a 2px top rim (replacing the 1px border) and an
  optional `expo-glass-effect` blur — **behind a capability check with an opaque
  `surface` fallback**, since it's iOS-26-only.
- Active tab gets a `radius.lg` flame **puck** behind its icon; the puck springs between
  tabs: `x.value = withSpring(tabX, motion.spring.pop)`.
- Active icon scales `withSequence(withSpring(1.18, pop), withSpring(1, pop))` on select.
- The Race tab's icon tile is slightly larger (visual emphasis only — no route change).
- Reduce-motion: puck `withTiming(tabX, { duration: 0 })`, no icon scale.

---

## 4. Component plan

### New shared components (`src/components/ui/`)

| Component | Purpose |
|---|---|
| `useMotion()` | The single reduce-motion gate: `{ reduced, spring, timing, enter }`, reading `useReducedMotion() \|\| settings.reduceMotion`. Every animation in the app goes through it. |
| `ScreenHeader` | Balanced 3-slot header (fixed 64pt sides, centred title), column-capped for iPad. Adopted by Settings, More, Garage, History, Live, Achievements, Credits. |
| `StickerCard` | The card primitive: rim, hard shadow, radius, `accent`/`danger`/`blue` variants, optional `pressable` with spring press. |
| `SettingsSection` / `SettingsRow` | The row grammar of §3.6, with the eight variants. |
| `SegmentedControl` | Spring puck, content-sized track, `inline` (≤3) vs `stacked` (≥4) variants. Replaces every `chip { flex: 1 }` in the app. |
| `ChunkyButton` | `primary` (flame gradient) / `ghost` / `danger`; hard shadow that collapses on press. |
| `DisplayNumber` | Display-face tabular numeral with optional animated roll via `useAnimatedProps` on an animated `TextInput`. |
| `IconTile` | 40pt rounded-square icon chip; wraps `Glyph`. |
| `Glyph` | `expo-symbols` SF Symbol with a MaterialCommunityIcons fallback. |
| `SpeedTrace` | SVG sparkline of recent speeds with an animated draw-in. |
| `RecordBurst` | Reduce-motion-safe confetti (≤16 SVG chips; static sticker when reduced). |
| `CheckerStrip` / `SpeedLines` | The two SVG motifs. |
| `EmptyState` | SVG illustration + title + body + optional action; replaces four emoji empty states. |

### Changed existing components

| File | Change | Risk |
|---|---|---|
| `theme/tokens.ts` | Additive: new colours, `radius.xxl`, `fontSize.xxl/display2`, `elevation.sticker*/pop`, `fontFamily`, `motion`, `gradients`. Re-tuned values for `bg`/`surface*`/`border`/`radius`. | Low — every existing key survives |
| `gauge/Speedometer.tsx` | Chunky geometry, segmented zones, gradient hot band, tapered needle + ghost, `withDelay` hold on the UI thread, animated readout | Medium — hot path, has the app's only existing animation |
| `gauge/FlameField.tsx` | Pulse loop, car-pass streak, `cancelAnimation` discipline | Low |
| `gauge/geometry.ts` | New helpers for segmented arcs + the tapered needle path | Low |
| `StatusPill.tsx` | Restyle to a pit light. **Props and behaviour unchanged** — it stays the connect control | Low |
| `CurrentCarHero.tsx` | Boarding-pass card restyle | Low |
| `RecentPasses.tsx` | Horizontal pass-chip strip | Low |
| `BleStatusBanner` / `PersistenceStatusBanner` | Sticker-card restyle, colour bar | Low |
| `race/components/styles.ts` | Rewritten against the new tokens (the single biggest style file) | Medium |
| `race/components/RaceCountdown.tsx` | Lamp tree; **drops the `pulse: Animated.Value` prop** and owns Reanimated internally | Medium — touches `race.tsx` + `useRaceSession`; check their tests |
| `race/components/RaceProgress.tsx` | Lap ribbon, animated timer | Medium |
| `race/components/RaceSetup.tsx` | Grid slots, `SegmentedControl`, readiness lamps | Medium |
| `race/components/RaceResults.tsx` | Trophy card, `RecordBurst` | Low |
| `app/settings.tsx` | Rebuilt on the row grammar; **zero store-API change** | Medium |
| `app/(tabs)/index.tsx` | New sections (trace, empty state) + restyle; split-pane structure preserved | Medium |
| `app/(tabs)/garage.tsx` | Tiles, filter chips, on-portal hero, 2-up phone grid | Medium |
| `app/(tabs)/history.tsx` | Ticket stubs, `FlatList` → `SectionList` day grouping | Medium |
| `app/(tabs)/more.tsx` | Grouped rows + `IconTile` | Low |
| `app/(tabs)/_layout.tsx` | Pit Row tab bar with spring puck | Low |
| `layout/layout.ts` | Phone `columns` 1 → 2 for the garage grid | Low — has tests; update them |

---

## 5. What stays the same

- **Navigation model.** Five tabs, same order (`Speed · Race · Garage · History · More`),
  same home tab, same pushed routes (`/settings`, `/live`, `/tv`, `/achievements`,
  `/credits`, `/identify`, `/garage/[uid]`, `/history/[id]`). No new routes, no
  restructuring. The tab bar is restyled and animated; it is not re-architected.
- **TV mode.** `TvStage` is not modified and its contract is untouched. It consumes
  tokens, so the re-tuned `bg`/`surface`/`radius` values do reach it — that needs one
  visual pass on a real AirPlay mirror to confirm it still reads at 10 feet (listed as a
  risk below), but no code or prop change is proposed.
- **Stores and persistence.** `src/store/*`, the SQLite schema, the settings keys, the
  portal→garage bridge, session recording: unchanged. Every new affordance (garage
  filter, history grouping) is derived at render time from data already in the stores.
- **Protocol, BLE, transport, portal controller.** Untouched.
- **`useLayout()` API.** `contentMaxWidth`, `isSplit`, `gutter`, `gaugeSize`, `columns`
  all keep their names and meanings; only the phone `columns` *value* changes.
- **Haptics and sound gating.** Same settings, same call sites.
- **Offline-first, dark-only, no accounts, no network.** No new asset fetches — the
  bundled font ships in the binary; every illustration and motif is inline SVG.

---

## 6. Risks & rough effort

### Risks

| Risk | Mitigation |
|---|---|
| **Bundled font** adds ~110 KB and a `useFonts` gate that can flash unstyled text | Subset to uppercase + digits + punctuation; load behind the existing splash; keep body text on system SF so a load failure degrades to SF-Heavy rather than breaking layout |
| **`entering`/`exiting` on long lists** can jank on a 100-car garage or long history | Cap stagger at `min(i, 8) * 40 ms`; use `LinearTransition` only on filter changes, not on every scroll; entrances are on mount only |
| **Confetti on the UI thread** competing with the needle | Hard cap at 16 SVG nodes, one burst at a time, `exiting` unmounts them; skipped entirely under reduce-motion |
| **`RaceCountdown` prop change** ripples into `race.tsx` and `useRaceSession`, which have tests | Small, mechanical change; do it first and run `npm test` before styling anything else |
| **`expo-glass-effect` is iOS 26+** | Optional enhancement only, behind a capability check with an opaque `surface` fallback. If it's more trouble than it's worth, drop it — nothing depends on it |
| **TV stage inherits re-tuned tokens** | One verification pass on a real AirPlay mirror before merge; if contrast drops, pin `TvStage` to explicit values rather than reverting the tokens |
| **Deeper `bg` + hard shadows** could reduce contrast for low-vision users | All text pairs re-checked against WCAG AA at their rendered size; `rim` at 10% white keeps card edges visible independent of shadow |
| **2-up garage on phone** loses per-tile stat density | Full stats already live on `/garage/[uid]`; tile keeps the two stats kids actually read (name, best speed) |
| **Hard shadows have no Android equivalent** | `elevation` key stays set for a soft-shadow degrade; iOS is the only shipping target |
| **"Arcade" tipping into "clip art"** | Motif budget: max 2–3 checker/speed-line instances per screen, enforced in review |

### Effort

| Area | Size | Notes |
|---|---|---|
| Token extension + display font wiring | **S** | Additive; ~half a day including the subset build |
| Shared component kit (`ui/`, 13 components) | **M** | The foundation everything else depends on — build it first |
| `useMotion()` gate + reduce-motion audit | **S** | Small, but must land before any animation work |
| Speed screen | **M** | Gauge changes are the delicate part; the rest is restyle + two new sections |
| Race (setup + countdown + live + results) | **L** | Four sub-states, the countdown API change, the new lap ribbon, the most style surface |
| Garage | **M** | Tiles + filter + on-portal hero + the `layout.ts` column change and its tests |
| History | **M** | Ticket stubs are fiddly; `FlatList` → `SectionList` is the real work |
| More | **S** | Grouped rows + `IconTile` |
| Settings | **M** | Full rebuild on the row grammar, but zero store risk — the highest value-per-hour item on this list |
| Tab bar | **S** | Puck + restyle |
| Empty-state illustrations (4) | **S** | Inline SVG, no assets |
| TV-stage verification | **S** | One AirPlay pass, no code expected |

**Suggested order:** tokens + font → `useMotion()` → component kit → **Settings** (fastest
visible win, fixes reported bugs, zero risk) → Speed → Race → Garage → History → More →
tab bar → TV verification.
