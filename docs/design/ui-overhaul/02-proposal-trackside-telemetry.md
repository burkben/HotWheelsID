# Proposal B — Trackside Telemetry

## Concept & personality

**Trackside Telemetry** turns Redline ID into the compact timing console that belongs beside a real race portal. It borrows the discipline of a modern driver HUD—not the visual noise of an arcade cabinet. The screen is a field of blackened glass, precise hairlines, clipped labels, calibrated scales, and numbers that feel captured rather than decorated. Flame orange marks the decisive event: a pass, a record, the current lap, the action to take now. Electric blue carries context: portal link, selection, trace history, and secondary navigation.

The overhaul is deliberately structural. The Speed screen is no longer a vertical stack with a large dial in the middle; it becomes a live instrument cluster with a dominant speed module, a continuously updating trace, and recent passes arranged as timing data. Race becomes a staged timing workflow whose setup, countdown, running, and result states occupy the same stable cockpit geometry. Garage becomes a scannable parc fermé, and History becomes a session ledger. A slim **status ribbon** sits immediately below the app chrome on every app surface except TV mode, so portal state, mode, current car, and the latest event remain legible even when the user leaves Speed.

The tone is adult-serious at rest and playful only when something worth celebrating happens. A new record may fire a brief orange “sector flash,” a checkered micro-pattern, and a sharp haptic; ordinary state changes remain quiet. Motion is quick, damped, and purposeful. Nothing bounces. No animation delays access to a control or changes the location of a primary action. From several feet away, the largest number and the orange/blue hierarchy still tell the story; close up, the telemetry details reward attention.

This is still Redline ID: dark-only, local-first, family-friendly, and unofficial. It evokes motorsport instrumentation without copying Hot Wheels, Mattel, a vehicle manufacturer, or a broadcast package.

## System delta from today

### Color and material

The existing palette remains recognizable but gains lower, cooler blacks and purpose-built glass/fallback colors. These are additions or replacements in `tokens.ts`, not a second theme.

| Role | Today | Trackside Telemetry | Use |
|---|---|---|---|
| App void | `bg #0b0f1a` | `void #05080d` | Screen background and negative space |
| Solid fallback | `surface #111827` | `panelSolid #0d1520` | Opaque fallback for every glass surface |
| Nested surface | `surfaceAlt #0f1626` | `panelInset #09111b` | Inputs, unselected segments, inset rows |
| Raised surface | `surfaceRaised #16203a` | `panelRaised #132131` | Active car, current heat, selected record |
| Glass fill | none | `glassFill rgba(13,21,32,0.78)` | Default material over the void |
| Glass highlight | none | `glassHighlight rgba(255,255,255,0.07)` | One-pixel top/inner edge only |
| Hairline | `border #1e2a44` | `hairline rgba(135,174,214,0.20)` | Cards, rows, graph grids |
| Primary text | `#ffffff` | `ink #f5f8fb` | Main labels and values |
| Secondary text | `#8aa0c6` | `inkSecondary #9bb0c4` | Supporting labels and hints |
| Muted text | `#6b7a99` | `inkMuted #64788a` | Metadata and disabled states |
| Flame | `accent #ff7a1a` | `flame #ff7418` | Passes, primary action, record state |
| Electric | `accentBlue #26c6ff` | `electric #2bd1ff` | Selection, trace, portal link |
| Status | green/yellow/red | `ok #39d98a`, `caution #ffd15c`, `fault #ff5a67` | Always paired with text/icon/position |

`expo-glass-effect` is progressive enhancement, never a legibility dependency. A shared `TelemetrySurface` renders `GlassView` with `glassEffectStyle="regular"`, dark `tintColor`, and `isInteractive={false}` only when both `isLiquidGlassAvailable()` and `isGlassEffectAPIAvailable()` are safe. It also respects iOS Reduce Transparency. Otherwise it renders a normal `View` with `panelSolid`, the same hairline, and the same geometry. The fallback is intentionally opaque enough to look designed, not degraded. `GlassContainer` is reserved for the tab bar/action cluster where adjacent glass elements should visually cooperate; it is not placed around long virtualized lists. The Expo API already falls back at the component level, but the explicit adapter keeps behavior, contrast, and crash guards testable ([Expo GlassEffect documentation](https://docs.expo.dev/versions/latest/sdk/glass-effect/)).

### Type and numerals

- Keep the system San Francisco family for labels and reading text; no font download or network dependency.
- Add `fontSize.nano 9`, `hero 88`, and `raceDisplay 112`. Keep the current 11–28 body scale.
- Add `fontFamily.telemetry`: `SFMono-Regular` on iOS and `monospace` fallback. Use it only for speed, lap time, counters, UID fragments, timestamps, and tiny channel labels.
- Every changing value uses `fontVariant: ['tabular-nums']`. Decimal points occupy a stable column; units are separate, smaller nodes rather than part of the number string.
- Labels use 9–11 pt, weight 700, uppercase, and 1.2–1.8 pt tracking. Body copy remains sentence case at 13–16 pt.
- Headings become narrower and calmer: 20–24 pt/800 rather than making every title a 28 pt hero. The live value, not the page title, owns the screen.

### Geometry, density, depth

- Reduce the default radius from 12–16 to a precision scale of `4 / 8 / 12 / 16 / pill`; primary telemetry cards use 12, list groups use 10, fields/segments use 6.
- Keep the 4 pt spacing function. Establish explicit vertical rhythms: 8 pt within a reading, 12 pt between related modules, 24 pt between sections, 32 pt before a destructive section.
- Hairlines are 0.5 pt on high-density iOS displays and 1 physical pixel elsewhere. Dividers inset to the label column.
- Replace broad card shadows with a low ambient shadow (`y 8`, blur 24, 24% black) plus the top inner highlight. Orange/blue glow appears only on a live portal car, selected trace, or record and lasts no longer than the state itself.
- Background atmosphere is code-native: a faint 32 pt grid and two low-opacity radial washes. No raster background, no network asset, and no Skia requirement.

### Iconography and controls

- Keep MaterialCommunityIcons for navigation compatibility, but use 20–22 pt outline forms with a consistent 1.5–2 pt visual stroke. Active tabs get an orange 2 pt rail; inactive icons are muted rather than filled.
- Add tiny status glyphs built from text/vector primitives: link, gate, car, timing, record. Color is never the only status cue.
- Segmented controls are precise inset rails: 32 pt high for compact two-way choices, 36–44 pt for primary choices, content-sized or evenly distributed only within a deliberate fixed rail. The selected segment moves an electric-blue/orange indicator; it does not become an oversized pill.
- Minimum hit targets remain 44×44 pt even when the visible control is smaller.

## Global shell and status ribbon

The existing five-tab model remains: **Speed, Race, Garage, History, More**. The tab bar becomes a translucent/opaque telemetry dock with a single moving orange active rail. Labels remain visible, because the app is used by mixed ages and from odd angles.

Directly under the safe-area/header region, `PortalStatusRibbon` is 28 pt tall and spans the available app width. It reads like a timing channel:

`PORTAL  /  LIVE    ● READY    CAR HW50    LAST 247.8 MPH`

It collapses intelligently: phone shows mode + state + latest event; iPad adds car, signal/latency, and session count. Scanning, connecting, unsupported, demo, disconnected, and current-car states retain the existing `portalStatusPresentation` actions and accessibility language. Tapping the ribbon still connects, retries, or confirms disconnect. It never appears in `TvStage`; TV mode remains a separate mirrored surface.

## Screen redesigns

### Speed / home — live instrument cluster

**Phone.** The fixed top zone contains the compact `REDLINE ID / SPEED` title, Live BLE/Demo segmented control, then the status ribbon. The first scroll viewport is a single `VelocityModule`: a 220–240 pt cropped arc rather than a full circular speedometer, with the digital speed centered at 80–88 pt, unit beneath, scale labels around the arc, and explicit `LOW / PUSH / REDLINE` zone labels so zone meaning never depends on color. The needle remains the signature pass motion.

Immediately below, a 92 pt `SpeedTrace` plots the last 30 passes/time samples in electric blue using `react-native-svg`. It has a faint grid, a bright current-point marker, min/max annotations, and a selectable “PASS / SESSION” trace scope. A three-cell telemetry strip shows **BEST**, **PASSES**, and **DELTA**; delta compares the latest pass with the session best and uses `+/-` text as well as color.

`CurrentCarHero` becomes a horizontal 88 pt `ActiveCarStrip`: photo/silhouette, catalog name, UID tail, series, and an `ON PORTAL` edge marker. Recent passes become a dense timing ledger—position, speed, delta, car tail, timestamp—with the best row marked `PB`. Demo’s “Trigger pass” stays a 44 pt outlined control. Long explanatory copy moves behind a compact `INFO` disclosure so live data stays above the fold.

**iPad.** Preserve `useLayout()` and the two-pane threshold. The left pane is a fixed instrument cluster (arc, live value, trace, core stats); the right pane scrolls the active car and pass ledger. The status ribbon spans both panes and the title aligns to the shared outer gutter. The right pane may show up to 12 recent passes, as it does now.

**Empty/error states.** No emoji-only state. An SVG gate trace and plain instruction explain “Place a car on the portal.” Unsupported firmware keeps the complete diagnostic and demo escape hatch; it is presented as a red/fault telemetry card without hiding technical detail.

### Race — setup, live, and results in one cockpit

The Race route keeps the current race engine, solo/race-night modes, lineup, tournament option, portal readiness, audio, and haptics. The visual layout is a stable `RaceCockpit` so phase changes feel like one instrument changing state rather than unrelated screens mounting.

**Setup.** A 36 pt `SOLO / RACE NIGHT` rail sits under the status ribbon. Race length uses a compact four-position segment (`3 / 5 / 7 / 10`) bounded to its content column—not four full-width cards. Player and car form one `DriverSlot` with a 44 pt name field, portal-car assignment, and explicit readiness state. Race-night lineup becomes a numbered pit queue: current driver has an orange left rail, next driver an electric rail, later drivers are dense 52 pt rows. Tournament is a compact switch row with a short explanation. The primary button stays anchored at the bottom of the content column when space allows and remains ≥44 pt.

**Countdown.** The cockpit dims but remains visible for continuity. A full-width center timing band shows `3`, `2`, `1`, then `GO`; each digit is 112–148 pt tabular type with thin expanding tick rings and a moving starting-light rail. Player and car stay visible above. Countdown sound and haptic semantics do not change.

**Live.** The upper half locks to a large `LAP 03 / 05` and a running `THIS LAP 00:07.428`. Beneath it, LAST, BEST, and DELTA occupy three stable cells. Every crossing inserts a lap into a dense timing stack without shifting the live clock. The best lap receives one orange sector flash plus `BEST`; other rows use electric-blue hairline ticks. Finish and demo-trigger controls remain reachable but visually secondary to the running clock. On iPad, live clock/progress stays left and lap ledger/lineup stays right.

**Results.** Preserve total, best, average, worst, share, next racer, leaderboard, tournament bracket, and done/continue actions. The result opens as a timing sheet: total is the hero, best/average/worst form a comparison rail, and every lap remains inspectable. A record adds a brief orange edge flash and a small checkered `PB` stamp—no confetti cloud. Race-night emphasizes “UP NEXT” in electric blue and keeps the next primary action in the same bottom position used during setup.

### Garage — parc fermé index

Garage gains a 44 pt search/filter rail under the ribbon: **ALL**, **ON PORTAL**, **IDENTIFIED**, and **RECORDS**. The count and identified summary become small channel readouts instead of a floating count pill. Cards become more visual without requiring new assets: existing `CarPhoto` leads, followed by name/series, UID tail, last seen, best speed, best lap, and race count. The current portal car gets an orange edge rail and `LIVE` tag; identified cars get a small electric link marker.

Phone uses a single dense 96 pt card list for fast scanning. iPad uses the existing `layout.columns` grid with equal-height cards. The car detail route adopts a wide telemetry hero, personal-best trace, recent races, and the existing identification workflow; data and route parameters do not change. Empty Garage uses a simple portal/gate line illustration, “Scan your first car,” and a Demo shortcut only when that action already exists in scope.

### History — session telemetry ledger

History groups sessions by day with sticky date labels. Each 72 pt session row exposes start time, duration, pass count, best speed, and a tiny 48×20 trace thumbnail derived from stored passes when available. A running session has both `LIVE` text and an animated leading tick; completed sessions are static. `Clear` moves to an overflow/destructive action so it no longer competes with the page title.

The detail route opens into a summary header plus a sortable pass ledger (time, car, speed, delta). Phone remains one column. iPad preserves the current reduced column count and can present the selected session in a right detail pane when navigation work is scheduled; the initial overhaul may keep the current push route to reduce risk. Empty History uses the same gate-line visual family as Garage, with explanatory text and no emoji-only hero.

### More — systems bay

More becomes two grouped glass cards instead of five floating tiles. **Racing tools** contains Achievements, Live portal, and TV mode; **App** contains Settings and Credits & licenses. Each row is 56 pt with a 20 pt outline icon, title on the main line, short status/value right aligned where useful (`12/24`, `READY`), and a muted subtitle only when needed. Chevron alignment is fixed to the label line. The portal ribbon makes “Live portal” feel connected to the current state. TV remains a push route to its existing separate surface.

### Settings — precision grouped lists, all audit issues fixed

Settings uses the same maximum phone column (`contentMaxWidth ≈ 420`) on phone and iPad. The navigation header itself is capped to that column and uses a three-column grid: **44 pt back target / centered title / 44 pt balancing cell**. The visual back glyph does not determine layout width, so “Settings” is mathematically and optically centered at every width. This fixes audit item 1.

Every preference uses one reusable `SettingRow` pattern:

1. A **44 pt label line** (`minHeight: 44`) contains the label at left and its control at right, both vertically centered on that same line.
2. An optional hint sits **below the label line**, left-aligned to the label column in secondary text at 13/18. It never shares the control’s flex row.
3. The row adds 8 pt after a hint, and the divider starts at the label inset. Adjacent rows live inside a grouped card with no per-row outer border.
4. Section labels have exactly 24 pt before and 8 pt after. Cards have 12 pt horizontal insets. Every section follows the same rhythm; the scroll container has no competing `gap` plus label margin.

This pattern puts Switches and the calibration stepper on the label baseline, fixing audit items 2 and 3. Controls remain right aligned even when hints wrap to three lines.

Specific groups:

- **Profile:** Player name is one 44 pt row. The field is a trailing, right-aligned value that opens inline editing or a focused edit sheet; the hint follows below.
- **Racing:** Default laps uses a fixed-width 176 pt four-segment control on the label line (`3 / 5 / 7 / 10`). It never uses `flex: 1` chips across the card.
- **Speed:** Units uses a content-sized 116 pt two-segment control (`MPH / KM/H`). Calibration uses a 132 pt compact stepper (`−  1.00×  +`) on the label line, with each minus/plus hit box expanded to 44 pt. These fixed rails correct the oversized chip issue in audit item 4.
- **Feedback:** Haptics, Sound, and Reduce motion each use the exact label-line/hint pattern. Native switches are right aligned with their labels, not centered against the combined label/hint block.
- **Startup:** Start in demo mode uses the same row.
- **Community:** “Share car identities” is a navigation/action row with a right-aligned count, followed by concise privacy copy. “How to contribute” becomes a second 44 pt row. The longer export explanation appears in the share sheet or disclosure, not between unrelated controls.
- **System:** `Reset to defaults` becomes a destructive 44 pt row inside a labeled **System** grouped card, fixing the orphaned reset in audit item 7. Confirmation behavior stays the same.

Grouped cards use 0.5 pt inset dividers and predictable padding rather than `padding: 16, gap: 8` around every mixed block, fixing cramped dividers/hints (item 6). The single section cadence fixes compounded/double spacing (item 5). All eight existing setting keys and their store methods remain exactly unchanged.

## Motion specification

### Shared contract

`reduceMotion = useReducedMotion() || settings.reduceMotion` is computed once in a small hook and passed to every decorative motion component. OS Reduce Transparency separately disables native glass. Hot values live in Reanimated shared values; React state updates data and accessibility announcements, not per-frame animation. Default timing is `withTiming` at 140–220 ms with `Easing.bezier(0.2, 0.8, 0.2, 1)`. The only spring is the gauge needle: `withSpring` with high damping, high stiffness, `overshootClamping: true`, and no visible bounce. Repeated ambient animations pause when their screen loses focus.

| Surface | Motion and concrete Reanimated 4 mapping | Reduce-motion result |
|---|---|---|
| Global shell | Tab rail `translateX` uses `withTiming(180)` and `interpolate` from tab index to slot width. Status-ribbon state crossfade/slide uses `withTiming(160)` on a shared progress value; background/border color uses `interpolateColor`. | Rail and ribbon content snap to final state; state text and accessibility announcement still update. No opacity pulse. |
| Speed | Needle shared angle uses `withSpring({ damping: 28, stiffness: 260, mass: 0.7, overshootClamping: true })`, retains the 1.3 s hold, then `withTiming` home. `useAnimatedProps` writes the SVG needle rotation and trace `strokeDashoffset`; `interpolate` maps scale MPH to angle, readout scale, and brief sector brightness. New pass rows enter with `withTiming(160)` translateY 6→0 and opacity 0→1. | Needle and trace jump to the captured value/path, then reset without interpolation after the hold. New row appears in place. Record is conveyed by `PB`, color, and haptic—not animation. |
| Race setup | Segment indicator and lineup rail use `withTiming(160)` translateX/translateY; expanding/collapsing race-night fields use `withTiming(180)` height/opacity with measured final height. `interpolate` ties content opacity to the indicator progress. | Selected segment and complete form render immediately; focus/order stay unchanged. |
| Race countdown | One shared progress per count uses `withTiming(420)`; digit scale, ring radius, and opacity derive through `interpolate`. Starting-light SVG line length uses `useAnimatedProps`. No repeating springs. | Digits change discretely at the same audio/haptic schedule. Countdown remains fully legible and retains the cancel action. |
| Race live | The running clock is data-driven text, not a React animation loop. New lap rows use `withTiming(150)` translateY/opacity; best-sector edge flash uses two `withTiming` calls totaling ≤300 ms. Live progress bar and SVG tick use `useAnimatedProps`. | Rows append instantly; `BEST` text and orange rail remain. No sector flash. |
| Race results | Sheet content uses `withTiming(200)` translateY 12→0; comparison bars use `withTiming(260)` width via `useAnimatedProps`; PB stamp uses a clamped `withSpring` only if the needle spring utility is reused, otherwise timing. | Full result appears at once with all data and actions. PB stamp is static. |
| Garage | Filter rail uses `withTiming(160)` translateX. Newly detected car gets one `withTiming(220)` electric scan-line pass, implemented as overlay translateY. Grid/list reflow uses Reanimated layout transitions only when stable under `FlatList`; otherwise items fade in place. | Filter changes immediately; current car still has `LIVE` text and orange edge. No scan sweep or layout transition. |
| History | Live-session tick opacity uses a slow repeating `withTiming` only while focused. Session rows enter once with a 30 ms capped stagger and `withTiming(160)`; trace thumbnails use static SVG paths. | No pulse or stagger; `LIVE` text remains. Rows are immediately present. |
| More | Press state uses `withTiming(90)` background/scale 1→0.99. Group rows do not cascade. Pushed route content uses the existing native stack transition. | Native press feedback/color remains; no scale. |
| Settings | Segment indicators use `withTiming(140)`; calibration value uses a 100 ms opacity crossfade and no movement. Section/row geometry is never animated. If a custom visual switch wrapper is adopted, knob translation uses `withTiming(160)` while the underlying accessible switch state remains authoritative. | Controls update instantly. Hints and rows never move, and Reduce Motion itself takes effect immediately after its store update. |

Haptic and sound gates remain independent from motion. Pass/record/countdown haptics and race audio continue to consult their existing settings. Reanimated callbacks must not trigger store writes frame-by-frame.

## Component plan

### New shared components

- `TelemetrySurface`: glass/fallback adapter with border, tint, contrast, and Reduce Transparency handling.
- `PortalStatusRibbon`: global compact presentation/action wrapper around existing portal selectors; excludes `/tv`.
- `TelemetryHeader`: consistent compact title, channel label, optional centered back navigation, and iPad width rules.
- `TelemetrySegmentedControl<T>`: fixed/content-sized rail, 44 pt hit areas, animated indicator, screen-reader selected state.
- `TelemetryValue`: tabular/mono number, separately styled unit, optional delta and accessibility formatter.
- `SpeedTrace`: `react-native-svg` grid, line, point, min/max labels; `useAnimatedProps` for the live path reveal.
- `TimingRow` / `TimingLedger`: dense reusable pass/lap/session rows with aligned numeric columns.
- `SettingGroup`, `SettingRow`, `SettingHint`, and `CompactStepper`: encode the exact Settings geometry so alignment cannot regress.
- `GateEmptyState`: code-native portal/gate line visual with title, body, and optional action; replaces emoji-only empty states.
- `useTelemetryMotion`: returns the OR’d reduced-motion value and standard timing/spring configs.

### Changes to existing components

- `StatusPill` delegates presentation and actions to `PortalStatusRibbon`; keep a compact pill variant for race subcomponents if needed.
- `Speedometer` changes from full dial to cropped `VelocityModule` but keeps geometry, value/max/zones, format/calibration behavior, SVG implementation, and the signature hold.
- `CurrentCarHero` becomes `ActiveCarStrip` while retaining `CarHeroModel`, identity, and accessibility announcement behavior.
- `RecentPasses` becomes a `TimingLedger`; keep the input data and formatting helpers.
- `RaceSetup`, `RaceCountdown`, `RaceProgress`, `LapList`, and `RaceResults` restyle into `RaceCockpit` slots; the race engine and phase boundaries stay untouched.
- Garage/History `FlatList` renderers adopt the new cards/rows and filters. Filters are derived selectors over existing arrays, not new persisted state.
- `(tabs)/_layout.tsx` receives the telemetry dock/active rail and mounts the status ribbon at the app-shell level, with a route exclusion for TV.

## What stays the same

- The five primary tabs, their order, and Speed as home stay the same. Secondary destinations still push from More.
- `expo-router`, React Native 0.85, Expo SDK 56, TypeScript, `useLayout()`, safe areas, phone max-width columns, and iPad two-pane behavior remain the implementation frame.
- `TvStage` remains a distinct landscape mirrored surface. Its route, inputs, store reads, timing contract, and AirPlay behavior are not redesigned in this proposal.
- `packages/protocol`, BLE, transport, portal control, persistence, SQLite schema, stores and store shapes, speed calibration semantics, race engine, lineup/tournament logic, and tests do not change. The settings contract remains exactly `playerName`, `defaultLaps`, `haptics`, `sound`, `reduceMotion`, `mockModeDefault`, `speedUnit`, and `speedCalibration`, with the current defaults.
- Dark-only, offline-first, no account, no network UI dependency, and bundled catalog/photo behavior stay the same.
- Existing haptic/sound gating, portal status actions, accessibility announcements, minimum 44 pt targets, and text/position labels for speed zones stay intact.
- No new native dependency is required. The proposal uses only Reanimated 4, `react-native-svg`, gesture-handler where useful later, and `expo-glass-effect`, all already installed.

## Risks and rough effort

Effort is relative implementation size: **S** ≤2 focused days, **M** roughly 3–5 days, **L** roughly 1–2 weeks including tests and device polish.

| Area | Effort | Main risk and mitigation |
|---|---:|---|
| Token extension + telemetry primitives | M | Global drift if old and new surfaces coexist. Land primitives first, document replacement mapping, and migrate complete screens rather than mixing card styles within a screen. |
| Glass/fallback adapter | M | Native glass varies by iOS/compiler and opacity animation can fail. Guard both availability APIs, honor Reduce Transparency, never animate parent opacity, and snapshot/test the opaque fallback as the baseline. |
| Global ribbon + tab dock | M | Root placement could cover pushed routes or TV. Centralize safe-area height, add explicit `/tv` exclusion, and test every stack/tab transition on phone and iPad. |
| Speed cluster + SVG trace | L | Dense SVG updates can overwork JS if fed every event. Portal passes are low frequency; calculate points only on data changes and animate path props on the UI thread. Keep a capped point window. |
| Race cockpit, all phases | L | Highest state-combination risk: solo, race night, tournament, demo, disconnected, and iPad. Preserve phase components and engine boundaries; migrate visuals behind existing tests, then add phase screenshots/accessibility checks. |
| Garage + detail | M | Animated list reflow can conflict with `FlatList` column remounts. Disable layout transitions on column-count change and use a simple in-place filter fallback. |
| History + detail | M | Spark thumbnails may require extra per-session reads. Ship static summaries first or batch pass reads; do not create N+1 queries on every render. |
| More | S | Low risk; grouped-row migration only. |
| Settings rebuild | M | Dense alignment work and keyboard edge cases. Encode the 44 pt label-line pattern in one component, cap header/content to the same width, test long hints/Dynamic Type, and retain commit-on-blur behavior. |
| Accessibility, Reduce Motion/Transparency, Dynamic Type | M across all areas | Dense telemetry can become too small or truncate. Treat 9 pt labels as supplemental, keep core labels ≥11–13 pt, allow value compression before truncation, and test VoiceOver plus the combined OS/app motion gates. |
| Visual regression/device matrix | M | Glass and split layouts differ across OS/device sizes. Validate iPhone SE-class width, 375×812, large iPhone, iPad portrait, iPad split view, iPad landscape, iOS without liquid glass, and iOS with Reduce Transparency. |

**Overall:** Large. A sensible implementation sequence is primitives/shell → Settings and More → Speed → Garage/History → Race. Each screen can ship behind the same stores and navigation without a protocol or persistence migration.
