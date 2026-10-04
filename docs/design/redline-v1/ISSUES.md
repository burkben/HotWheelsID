# Redline V1 — Issue Drafts

Ready-to-file issues for implementing the Redline V1 racing identity in `apps/mobile`.
Each block below is one GitHub issue: title, labels, body. They are ordered so each
builds on the previous ones. **RL-00 is the tracking epic.**

Shared references for every issue:
- Spec: `docs/design/redline-v1/SPEC.md` (§ numbers below refer to it)
- Reference images: `docs/design/redline-v1/png/<Screen>.png`
- Exact values: `docs/design/redline-v1/source/<Screen>.dc.html`
- Offline mockups: `docs/design/redline-v1/static/<Screen>.html`

---

## Definition of done (applies to every issue)

- [ ] `npm run typecheck`, `npm test`, `npm run lint --workspace mobile` and
      `npm run web:export --workspace mobile` all pass from the repo root, the same
      steps as CI (`.github/workflows/ci.yml`).
- [ ] **Protected areas are untouched:** `packages/protocol`, `apps/mobile/src/ble`,
      `src/transport`, `src/portal` (selectors may be *read*, not changed),
      `src/store/**` shapes and persistence/SQLite schema, the eight settings keys,
      the `TvStage` contract, and existing tests (which may only be updated where a
      visual string they assert has deliberately changed; say so in the PR).
- [ ] All decorative motion is gated by `useTelemetryMotion` (OS reduce-motion OR the
      `reduceMotion` setting). Haptics and sound stay gated by their settings.
- [ ] Touch targets are ≥ 44 pt. Decorative motifs are hidden from VoiceOver. Numbers
      have spoken units. Colour is never the only signal.
- [ ] New pure logic (derivations, mappings, projections) has vitest unit tests next
      to it.
- [ ] Visual check: run the web build in **demo mode** at 390 × 844 and capture the
      screen with Playwright. Put it next to `png/<Screen>.png` in the PR description.
      Note any deliberate deviation and why.
- [ ] `docs/design/redline-v1/IMPLEMENTATION.md` is updated (create it in RL-01) with
      what landed.

---

## RL-00 · Epic: Redline V1 racing identity

**Labels:** `epic`, `design`, `mobile`, `v1-launch`

Re-skin Redline ID with the Redline V1 racing identity for the App Store launch.
Design: `docs/design/redline-v1/` (SPEC, PNGs, sources). It builds on the existing
Trackside Telemetry components; it does not rewrite them.

**Phases and order**
1. Foundation: RL-01 tokens & fonts → RL-02 motif primitives → RL-03 controls → RL-04 app shell
2. Race-day screens: RL-05 Speed & gauge → RL-06 first-run Connect state → RL-07 Countdown → RL-08 Race live → RL-09 Results, setup, lineup & tournament
3. Collection screens: RL-10 Garage → RL-11 Car detail → RL-12 History → RL-13 More, Trophy case & unlock banner → RL-14 Settings
4. Launch: RL-15 remaining surfaces & splash → RL-16 app icon → RL-17 App Store screenshots → RL-18 docs
5. Stretch (needs owner approval): RL-19 alternate app icons

**Done when** every screen in `png/` is implemented (or deliberately deviated with a
note), the launch assets (icon, splash, screenshots) are replaced, and the design
docs describe the new system.

---

## RL-01 · Redline tokens and bundled fonts

**Labels:** `design-system`, `mobile` · **Size:** S · **Depends on:** —

**Why.** Everything else reads these tokens and faces.

**Scope**
- [ ] Add an additive token block to `apps/mobile/src/theme/tokens.ts` per SPEC §1:
      `colorsR` (all of §1.1, including the soft status fills and the heat ramp),
      `fontR` (§1.2), `radiusR`, `skewR`, and a `typeR` style map for the type scale
      in §1.2 (`fontFamily`, `fontSize`, `lineHeight`, `letterSpacing`, `fontVariant`
      where relevant). Do not rename or remove existing tokens.
- [ ] Add `@expo-google-fonts/barlow`, `@expo-google-fonts/barlow-condensed` and
      `@expo-google-fonts/chakra-petch` (JS-only; uses the installed `expo-font`).
      Load only the faces in SPEC §1.2.
- [ ] Load the fonts at app start in `src/app/_layout.tsx` with `useFonts`, keeping
      the splash screen up until they load (`expo-splash-screen` is installed). If
      loading fails, fall back to system fonts rather than block the app.
- [ ] Add a `Text` helper (e.g. `components/redline/RText.tsx`) that takes a `typeR`
      variant. It must never combine `fontFamily` with `fontWeight`/`fontStyle` on
      iOS (SPEC §1.2).
- [ ] Credit the fonts (SIL OFL 1.1) in `THIRD_PARTY_NOTICES.md` and in the Credits
      screen's licence list.
- [ ] Create `docs/design/redline-v1/IMPLEMENTATION.md` (a status tracker like
      `docs/design/ui-overhaul/IMPLEMENTATION.md`).

**Acceptance**
- A demo screen or test renders each `typeR` variant with the correct face on web
  and iOS.
- Typecheck, tests and lint pass. The web export includes the font files.

---

## RL-02 · Trackside kit: motif primitives

**Labels:** `design-system`, `mobile` · **Size:** M · **Depends on:** RL-01

**Scope.** Create `apps/mobile/src/components/redline/` with the primitives in SPEC §2:
`Kerb`, `Checker`, `RakeLines`, `TrackLane`, `RacePlate`, `Roundel`, `StartLights`,
`SpeedStreaks`, `Chevrons`, `FlameTongues`, `CarSilhouette`, `Medallion`,
`Wordmark` and `SkewBox`. Add an `index.ts` barrel.

**Implementation notes**
- Use `react-native-svg` for drawn shapes. Repeating fills (kerb, checker, rake
  lines) use an SVG `<Pattern>`; RN has no CSS repeating gradients. Copy SVG paths
  verbatim from `source/*.dc.html` (the car silhouette, flame tongues, chevron,
  hexagon and portal arch).
- All primitives are decorative: hide them from accessibility.
- `RacePlate` and `Roundel` take a `number`. Add a pure `plateNumber(cars, uid)`
  helper in `src/garage/` that returns the 1-based position by `firstSeen`, padded to
  2 digits, with unit tests.
- `CarSilhouette` supports `outline` (dashed, for unidentified cars).

**Acceptance**
- A dev-only gallery screen (behind `__DEV__`, not in production navigation) renders
  every primitive. Its web screenshot matches the "Trackside kit" row of
  `png/Main.png`.
- `plateNumber` has unit tests, including ties and missing cars.

---

## RL-03 · Controls and building blocks

**Labels:** `design-system`, `mobile` · **Size:** M · **Depends on:** RL-02

**Scope (SPEC §3)**
- [ ] New: `RaceButton` (primary / ghost / destructive, skewed, optional chevron,
      pressed/disabled states), `StatusChip` (4 tones, same tap behaviour as
      `StatusPill`), `SectionHeader` (plain + numbered), `ScreenHeader` (title,
      right slot, optional back link), `TimingRow` (normal / fastest / running),
      `FilterChip`, `SkewSwitch` (accessible switch, animated knob).
- [ ] Restyle in place: `TelemetryValue` → `StatCell` look (eyebrow, value, unit,
      optional accent bar), `TelemetrySegmentedControl` (skewed segments),
      `CompactStepper`, `SettingRow` / `SettingGroup` / `SettingsSection` (square
      `pitLane` groups, 54 pt rows, dividers). Keep their props stable so callers
      don't break.
- [ ] Inset full-width skewed buttons by `height × tan(12°)` per side (SPEC §1.3).

**Acceptance**
- Each component is in the dev gallery in every state. The web screenshot matches the
  "Pit equipment" row of `png/Main.png`.
- `SkewSwitch` announces as a switch with its checked state. Every control is ≥ 44 pt.

---

## RL-04 · App shell: tab bar, headers and portal status

**Labels:** `mobile`, `navigation` · **Size:** M · **Depends on:** RL-03

**Scope**
- [ ] Restyle the tab bar in `src/app/(tabs)/_layout.tsx` per SPEC §3: `pitWall`
      background, hairline top border, `tabLabel` text, flame active state with a
      skewed 3 pt indicator that springs between tabs (instant under reduce-motion).
      Keep the `MaterialCommunityIcons` icons and the five routes.
- [ ] Restyle `PortalStatusRibbon` in the chip language and **hide it on the Speed
      tab** (`index`), where the screen header shows a `StatusChip` instead. Both read
      the same selectors and actions; don't duplicate the logic.
- [ ] Use `ScreenHeader` on the tab screens. Screens adopt it fully in their own
      issues; this issue only needs the shell wiring.

**Acceptance**
- Tab bar and ribbon match `png/Speed.png` / `png/Garage.png` on web.
- Status-change accessibility announcements still fire.
- `/tv` is unaffected (verify it still renders).

---

## RL-05 · Speed screen and the redline gauge

**Labels:** `mobile`, `screen:speed`, `gauge` · **Size:** L · **Depends on:** RL-04

**Design:** `png/Speed.png`, `source/Speed.dc.html`, SPEC §4.2.

**Scope**
- [ ] Add `variant?: 'needle' | 'redline'` to `components/gauge/Speedometer.tsx`.
      **`'needle'` stays the default** so `TvStage` is unchanged. `'redline'`
      implements the 240° arc, zone ring, ticks, labels and tip comet. Add
      `REDLINE_START_ANGLE` / `REDLINE_END_ANGLE` (−120 / +120) to `geometry.ts`, with
      unit tests for the redline angle maths.
- [ ] Drive the arc dash and tip position from the **existing** UI-thread shared value
      and choreography. Keep every verified behaviour in
      `docs/design/ui-overhaul/IMPLEMENTATION.md` → "Native polish and motion
      verification": sweep timing, retrigger by pass id, race "track" mode, and the
      static target under reduce-motion.
- [ ] `FlameTongues` at the arc ends, with opacity driven by the animated value
      (threshold from `speedGauge.flameThreshold`).
- [ ] NEW BEST tag; "SCALE MPH" / unit label from `speedUnitLabel`.
- [ ] Header: `Wordmark` + `StatusChip`. Background `RakeLines`.
- [ ] Restyle `ActiveCarStrip` into the race-plate car card: `Kerb` top, `RacePlate`
      via `plateNumber`, ON PORTAL / LAST SCANNED eyebrow, `CarPhoto` or
      `CarSilhouette` fallback. It links to car detail.
- [ ] Stats row: LAST / BEST / PASSES `StatCell`s.
- [ ] `SpeedTrace` → recent-pass **bars** (colour rules and the 220 line in §4.2).
      Put the colour mapping in a pure, tested function.
- [ ] Keep the iPad two-pane layout.

**Acceptance**
- In demo mode the web screenshot matches `png/Speed.png` (allowing for live data).
- A 280 mph demo pass sweeps the arc and the flames reach full opacity. A second
  equal-speed pass retriggers the sweep. Reduce Motion shows a static target.
- The TV screen still shows the needle gauge.

---

## RL-06 · First-run "Find your portal" state

**Labels:** `mobile`, `screen:speed`, `onboarding` · **Size:** M · **Depends on:** RL-05

**Design:** `png/Connect.png`, SPEC §4.1.

**Scope**
- [ ] On the Speed tab, show the Connect hero **instead of the gauge** when: there is
      no portal connection, no current car, no pass this session, and the app is not
      in demo mode. Put this condition in a pure, unit-tested selector.
- [ ] Illustration (copy the SVG from the source), `Kerb`, a searching `StatusChip`,
      copy, three step tiles, and a ghost "NO PORTAL? TRY DEMO MODE" button that calls
      the existing demo-mode controller action.
- [ ] Bluetooth off or unauthorised → fault tone with the existing `bleStatus` message
      and action.
- [ ] Radar pulse and rotating dashed ring, static under reduce-motion.

**Not in scope:** any new persisted "has onboarded" flag; settings keys must not change.

**Acceptance**
- A fresh install (or a cleared demo default) shows the state. Connecting, or
  switching to demo, shows the gauge.
- The selector has unit tests for each condition.

---

## RL-07 · Race countdown with start lights

**Labels:** `mobile`, `screen:race` · **Size:** M · **Depends on:** RL-03

**Design:** `png/Countdown.png`, SPEC §4.4. File: `race/components/RaceCountdown.tsx`.

**Scope**
- [ ] Gantry with 3 pods × 2 lights, mapped from the existing `count`: 3 → 1 pod,
      2 → 2 pods, 1 → 3 pods red; GO (0) → all lights `greenFlag` and the digit reads
      "GO". Put the mapping in a pure, tested function.
- [ ] Giant display digit with two outline echoes. Spring and slide on tick,
      none under reduce-motion.
- [ ] Cancel button (44 pt, labelled), "SPRINT · N LAPS" caption, "LINE UP AT THE
      GATE", racer card, and an "UP NEXT" row for race-night lineups.
- [ ] Start-line strip with `Checker` and lane line.
- [ ] Keep `useRaceSession`'s haptics, sound cues and announcements exactly as they
      are.

**Acceptance**
- The web screenshot at count 2 matches `png/Countdown.png`.
- Cues, haptics and announcements are unchanged (existing tests pass).

---

## RL-08 · Race live: lap header, track map and timing tower

**Labels:** `mobile`, `screen:race` · **Size:** L · **Depends on:** RL-07

**Design:** `png/Race.png`, SPEC §4.5. Files: `RaceProgress.tsx`, `RaceLeaderboard.tsx`,
`race/components/styles.ts`.

**Scope**
- [ ] Header: LAP n/N, GREEN FLAG, and the total timer (`MM:SS.mmm`).
- [ ] Lap segments (completed flame, fastest electric, current a `Kerb` fill to the
      pace estimate, future `steel`).
- [ ] Track map: decorative loop, gate, chevrons. **Pace-estimate markers:**
      best-lap ghost (electric) and last-lap marker (chalk), projected by
      `currentLapElapsed / referenceLap` along a precomputed polyline. Rules are in
      SPEC §4.5, including the **mockup correction** and the "PACE ESTIMATE" label.
      Put the projection maths in a pure, tested module (`race/paceProjection.ts`):
      fraction, wrap, overflow, no-reference case.
- [ ] Current-lap timer (HUD 64, UI-thread ticking) and VS FASTEST delta badge
      (hidden on lap 1).
- [ ] Timing tower of `TimingRow`s. Gate-speed column only if derivable client-side
      (SPEC §4.5 "Gate speed").
- [ ] "END RACE EARLY" destructive button, keeping today's no-confirm behaviour.
- [ ] Lineup/tournament heats reuse the layout with the racer's plate and name.

**Acceptance**
- In a demo race the web screenshot matches `png/Race.png`, except that the marker
  positions follow the corrected rule.
- The projection module has unit tests. Timer and markers are smooth on device.

---

## RL-09 · Race results, setup, lineup and tournament

**Labels:** `mobile`, `screen:race` · **Size:** L · **Depends on:** RL-08

**Design:** `png/Results.png`, SPEC §4.3, §4.6. Files: `RaceResults.tsx`,
`RaceSetup.tsx`, `RaceNightLineup.tsx`, `RaceTournament.tsx`, `PortalReadiness.tsx`.

**Scope**
- [ ] Results: checker banner, FINISH, a NEW RECORD stamp via a new pure
      `race/records.ts` that compares `result.bestLap` with the car's `bestLap`
      **snapshotted at race start**, stats (TOTAL, BEST LAP, TOP SPEED computed from
      portal passes in the race window, or AVG LAP fallback), the lap-by-lap chart,
      the car row, and RACE AGAIN + share (existing `share/summary.ts`).
- [ ] Setup (no mockup): mode cards, lap `FilterChip`s, an inset player field, the
      car picker with `RacePlate`, `PortalReadiness` as a `StatusChip`, and a pinned
      primary "START RACE".
- [ ] Lineup and tournament (no mockup): apply panels, plates, `TimingRow` ranking and
      the winner in caution.

**Acceptance**
- The results web screenshot matches `png/Results.png`.
- `records.ts` has tests: first race, beat the best, miss the best, tie.
- Setup, lineup and tournament flows still work end to end in demo mode. Existing
  race tests pass.

---

## RL-10 · Garage trading cards and series filters

**Labels:** `mobile`, `screen:garage` · **Size:** M · **Depends on:** RL-03

**Design:** `png/Garage.png`, SPEC §4.7. File: `src/app/(tabs)/garage.tsx`.

**Scope**
- [ ] `ScreenHeader` with summary and count.
- [ ] Series `FilterChip` row with client-side filtering. Put series derivation and
      sorting in a pure, tested helper.
- [ ] Trading cards: photo bay (`CarPhoto` or tinted `CarSilhouette`), `Roundel` plate
      number, name, series, best speed and races. On-portal ring, glow and ribbon.
      Unidentified "MYSTERY CAR" card routes to identify.
- [ ] Keep the grid column behaviour from `useLayout()` (iPad).
- [ ] New empty-state illustration (no emoji).

**Acceptance**
- With demo data the web screenshot matches `png/Garage.png`.
- Filter helper tests pass. Cards route to car detail; mystery cards route to
  identify.

---

## RL-11 · Car detail

**Labels:** `mobile`, `screen:garage` · **Size:** M · **Depends on:** RL-10

**Design:** `png/CarDetail.png`, SPEC §4.8. File: `src/app/garage/[uid].tsx`.

**Scope**
- [ ] Back link, ON PORTAL chip, and hero bay (photo or silhouette, plate, toy-number
      ribbon).
- [ ] Name, series and Change/Identify.
- [ ] Best-speed panel with mini arc and a GARAGE #n tag (rank ≤ 3; pure, tested
      helper).
- [ ] 4-up stats, nickname field (existing persistence), and catalog rows with the
      Source link.
- [ ] Keep the "car not in garage" state, restyled.

**Acceptance**
- The web screenshot matches `png/CarDetail.png`.
- Rank helper tests pass. Nickname saves as before.

---

## RL-12 · History list, 14-day strip and history detail

**Labels:** `mobile`, `screen:history` · **Size:** M · **Depends on:** RL-03

**Design:** `png/History.png`, SPEC §4.9. Files: `src/app/(tabs)/history.tsx`,
`src/app/history/[id].tsx`, `src/history/format.ts`.

**Scope**
- [ ] `ScreenHeader` with Clear (existing confirm).
- [ ] 14-day heat strip from `listSessions()`: local-day buckets, heat levels and
      totals in a pure, tested `history/heat.ts`. One accessibility label.
- [ ] Session ticket rows grouped TODAY / THIS WEEK / EARLIER (pure, tested grouping),
      with a LIVE tag and bar, and best mph.
- [ ] **Optional** sparkline from `passesForSession(id)`, lazy and memoised. Skip it
      rather than change persistence.
- [ ] History detail (no mockup): header, stats, session bar chart and pass list.

**Acceptance**
- The web screenshot matches `png/History.png`.
- Heat and grouping tests cover day boundaries and time zones. No repository or
  schema changes.

---

## RL-13 · More, Trophy case and unlock banner

**Labels:** `mobile`, `screen:achievements` · **Size:** M · **Depends on:** RL-03

**Design:** `png/Achievements.png`, SPEC §4.10. Files: `src/app/achievements.tsx`,
`src/app/(tabs)/more.tsx`.

**Scope**
- [ ] More screen restyle (no mockup), with trophy progress on the Achievements row.
- [ ] Trophy case: title with count, kerb progress, latest unlock panel, and grouped
      `Medallion` grid with progress lines from `engine.ts`.
- [ ] Map achievement id → `MaterialCommunityIcons` icon (table in SPEC §4.10). Add a
      unit test asserting **every catalog id has an icon**. Keep the catalog `emoji`
      field.
- [ ] Trophy-unlocked banner driven by `newlyUnlockedIds()`: success haptic (gated),
      2.5 s auto-dismiss, static under reduce-motion.

**Acceptance**
- The web screenshot matches `png/Achievements.png`.
- The icon-map test passes. The banner appears once per unlock in demo mode.

---

## RL-14 · Settings restyle and portal card

**Labels:** `mobile`, `screen:settings` · **Size:** M · **Depends on:** RL-03

**Design:** `png/Settings.png` (full-length capture), SPEC §4.11. File: `src/app/settings.tsx`.

**Scope**
- [ ] Portal card (connected / searching / idle tones, connect/disconnect using the
      existing actions and confirm).
- [ ] Numbered section headers 01–07.
- [ ] `SkewSwitch` for haptics, sound, reduce motion and start in demo mode.
- [ ] Skewed unit segments, steppers, inset player field and community rows.
- [ ] Reset in its own group (existing confirm).
- [ ] Footer: wordmark, version/build from `expo-constants`, Credits link, Mattel
      disclaimer.
- [ ] **No settings key or store API changes.** Keep the earlier overhaul's alignment
      fixes.

**Acceptance**
- The web screenshot matches `png/Settings.png`.
- Every setting still persists and applies. Existing settings tests pass.

---

## RL-15 · Remaining surfaces, banners, empty states and splash

**Labels:** `mobile`, `polish` · **Size:** M · **Depends on:** RL-03

**Scope (SPEC §4.12)**
- [ ] Restyle the Live log, Credits and Identify screens.
- [ ] Restyle `BleStatusBanner` and `PersistenceStatusBanner` (top tone bar).
- [ ] Replace every remaining emoji empty-state illustration with motif illustrations.
- [ ] Splash: `expo-splash-screen` background `#07090F` and the track glyph image.
- [ ] Leave TV mode alone.

**Acceptance**
- `grep` finds no emoji used as UI illustration outside the achievements catalog data.
- Each screen has been checked on web in demo mode.

---

## RL-16 · App icon (iOS and Android)

**Labels:** `release`, `assets` · **Size:** S · **Depends on:** —

**Design:** `png/Icon.png`, SPEC §5.

**Scope**
- [ ] Commit `apps/mobile/assets/images/icon.svg`: the Track master, **full-bleed with
      no rounded mask**, filled `#07090F`.
- [ ] Add a reproducible export: a devDependency (e.g. `@resvg/resvg-js`) plus an
      npm script, or a documented CLI. Generate an opaque 1024 × 1024 `icon.png`
      (no alpha).
- [ ] Android adaptive foreground (safe zone 66 %), background `#07090F`, monochrome
      silhouette. Update `app.json` (`adaptiveIcon.backgroundColor`).
- [ ] Favicon from the same master.

**Acceptance**
- `icon.png` is 1024², opaque and has no rounded corners (verify with an image
  probe in a script/test).
- Regenerating produces identical bytes.

---

## RL-17 · App Store screenshot pipeline and submission doc

**Labels:** `release`, `app-store` · **Size:** M · **Depends on:** RL-05 – RL-14, RL-16

**Design:** `png/Store01.png` … `png/Store06.png`, SPEC §6.

**Scope**
- [ ] `docs/release/screenshots/`: an HTML template reproducing the six frames
      (headline, background, motif, bezel, Dynamic Island, bleed). Playwright
      composites raw simulator captures into frames at App Store Connect's required
      pixel sizes. **Check the current required sizes**; the mockups are at 6.7"
      (1290 × 2796).
- [ ] Use the bundled fonts from `docs/design/redline-v1/static/fonts/` (or the app's
      font packages).
- [ ] An iPad landscape variant of the template.
- [ ] Update `docs/release/app-store-submission.md`: screenshot table (order and
      captions per SPEC §6, reconciled with the existing lineup/tournament shots),
      capture instructions and the no-Mattel-marks rule.

**Acceptance**
- Running the script on a folder of captures outputs correctly sized PNGs for every
  frame.
- No "Hot Wheels" or Mattel marks appear in any frame.

---

## RL-18 · Design docs: describe the Redline system

**Labels:** `docs` · **Size:** S · **Depends on:** RL-01 – RL-15

**Scope**
- [ ] Update `docs/architecture/design-language.md` to the Redline system (colour,
      type, shape/skew, motifs, components, motion, icon vocabulary including the
      achievement icon map). Mark the Trackside tokens as legacy (TV only).
- [ ] Add an ADR, `docs/adr/0016-redline-v1-visual-identity.md`, covering bundled
      fonts, square panels and the skew language, the gauge variant, and TV left on
      legacy.
- [ ] Point `docs/design/ui-overhaul/README.md` at `docs/design/redline-v1/` as the
      current direction.
- [ ] Finalise `docs/design/redline-v1/IMPLEMENTATION.md`.

---

## RL-19 · (Stretch, owner approval) Alternate app icons unlocked by trophies

**Labels:** `stretch`, `needs-decision` · **Size:** M · **Depends on:** RL-13, RL-16

**Why this needs a decision.** Switching icons at runtime needs a native module for
`setAlternateIconName` (a config plugin plus alternate icon assets), which is **a new
native dependency**. The project rules say to call that out as a cost.

**Scope if approved:** Redline / Burnout / Checkered icons from `png/Icon.png`,
unlocked by Into the Red / Regular Racer / Century of Laps; a picker in Settings
showing locked and unlocked states.

**Not in V1** unless the owner approves.
