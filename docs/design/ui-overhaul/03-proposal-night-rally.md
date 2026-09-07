# Proposal C — Night Rally

> **One thing at a time, full-bleed, always moving.** Redline ID stops being a tabbed
> utility and becomes a cockpit: one immersive surface per mode, traversed by swiping —
> like cycling through dashboard pages in a rally car at night.

## 1. Concept

Tab bars are chrome for apps that do many things. Redline ID does one thing: it makes a
toy car feel fast. Night Rally removes the tab bar from the primary experience and
replaces it with a **paged, gesture-driven flow**: Speed → Race → Garage → History as
full-bleed pages you swipe through horizontally, with a slim "mode rail" (4 glowing
ticks) at the top edge showing where you are. Secondary destinations (Achievements,
Live log, Settings, Credits) live behind a **pull-down "overhead console" sheet** —
like reaching up to the sun visor.

The signature: every page shares one persistent hero element — the speed readout —
which morphs between layouts with a shared-element transition (big dial on Speed,
compact strip on Race, corner badge elsewhere). The app feels like one continuous
surface, not five screens.

Palette shifts deeper and moodier than today: near-black asphalt `#070a12`, headlight
white text, flame orange reserved for *speed events only*, electric blue for chrome and
navigation. Long horizontal light-streak gradients (like motion-blurred streetlights)
drift slowly behind content at 2–4% opacity — the app is always quietly in motion, even
at idle. Records trigger a full-bleed "high-beam flash": a 200 ms white-orange bloom
that washes the page edge-to-edge.

## 2. Design language deltas vs today's tokens

| Area | Today | Night Rally |
|---|---|---|
| `bg` | `#0b0f1a` | `#070a12` (deeper) + drifting light-streak layer |
| Surfaces | flat `#111827` cards | borderless panels on 8–10% white scrims; hairline only on interaction |
| Radius | 12 default | 20 default, 28 hero — softer, cockpit-like |
| Type | SF all weights | SF stays, but speed numerals get `fontVariant: tabular-nums` everywhere + a bundled condensed display face (expo-font, e.g. "Barlow Condensed SemiBold") for the speed readout and countdowns |
| Accent use | orange = active tab + primary | orange = **speed/record events only**; blue = navigation/chrome. Hierarchy becomes semantic, not positional |
| Depth | `elevation.card` shadows | glow-only; light-streak parallax supplies depth |
| Icons | MaterialCommunityIcons | same set, 20% smaller, always paired with a label tick on the mode rail |

## 3. Screens

### Speed (page 1)
Full-bleed dial, center-weighted slightly low (thumb zone free). No cards on this page:
connection state is a glowing tick in the mode rail (green pulse = connected). Current
car slides in from the bottom as a "chase card" (miniature, 64-pt tall) — tap to expand
into the hero. Recent passes are a **vertical ticker** on the right edge, newest on top,
each row fading in then dimming over 8 s.

### Race (page 2)
Same dial, shrunk to a top strip via shared-element morph on swipe-in. Countdown is
full-bleed theater: 3-2-1 numerals at 200 pt slamming in with `withSpring` (damping 12)
+ haptic. Live laps render as a horizontal "lap rail" — each completed lap is a tick
whose length encodes lap time, so the race reads as a bar code at a glance. Results
page: winner's card gets the high-beam flash + confetti burst (respecting
reduce-motion: fade only).

### Garage (page 3)
Full-bleed dark showroom: cars on a horizontally-snapping "turntable" strip at top
(large art, parallax tilt via gesture-handler pan), stats grid below for the focused
car. No emoji empty state — an empty turntable shows a slow-rotating silhouette with a
"scan a car" pulse.

### History (page 4)
A night timeline: sessions as glowing nodes on a vertical line, fast-scroll produces a
subtle motion-blur streak effect (opacity streaks, not actual blur — cheap on UI
thread). Tapping a node expands it in place (shared layout) rather than pushing a
screen.

### More → Overhead console
Drag down from the top edge (or tap the rail) to drop a full-width sheet: big
list rows for Achievements / Live log / TV mode / Settings / Credits. Springy entrance,
glass-dark backdrop.

### Settings (fixes every bug in research §5)
Grouped inset list, iOS-quality:
- **Row pattern:** label (left, 16/700) + control (right, vertically centered with the
  label line) on one 44-pt-min row; hint text (13, `textSecondary`) wraps *below* the
  label inside the row's text column, never beside the control. → kills bugs 2 & 3.
- **Header:** large title, left-aligned; back is a compact circular chevron button,
  absolutely positioned, so the title is never squeezed (bug 1).
- **Choices:** lap count & units become real iOS-style segmented controls (intrinsic
  width, not `flex:1` stretch) — bug 4.
- **Rhythm:** section headers are plain 11-pt uppercase rows in the scroll flow with a
  fixed 24-pt top margin; content `gap` removed — spacing comes from section wrappers
  only (bug 5). Cards pad 16 with 12-pt row gaps and full-bleed inset dividers (bug 6).
- **Reset** becomes a destructive row inside a final "Danger zone" group (bug 7).
- Stepper keeps 48-pt buttons but sits on the label row with the value centered between
  `−`/`+`, hint below.

## 4. Motion spec (Reanimated 4)

| Moment | API | Spec | Reduce-motion |
|---|---|---|---|
| Page swipe | gesture-handler pan → `useAnimatedStyle` translateX, `withSpring` on release (velocity-aware) | 1:1 finger tracking, 15% parallax on light streaks | instant jump |
| Speed readout morph | shared layout via `useAnimatedStyle` measuring target slot | 320 ms `withTiming` (easeOutCubic) | crossfade |
| Countdown | `withSequence(withSpring(1), withTiming(0.9))` per numeral + haptic | 3-2-1 slam, 200 pt | static numerals |
| High-beam flash | `withSequence(withTiming(1,{duration:120}), withTiming(0,{duration:280}))` on a full-bleed overlay | records & race win | skip entirely |
| Lap rail ticks | `useAnimatedProps` on svg rect width | tick grows 240 ms after lap | final length instantly |
| Light-streak drift | `withRepeat(withTiming(1,{duration:26000}), -1, true)` translateX ±30 pt | always-on ambient | off |
| Overhead console | pan gesture → `withSpring` (damping 16) | 1:1 drag | fade in |
| Pass ticker row | entering: `FadeInDown.duration(240)`; dim: `withDelay(8000, withTiming(0.45))` | — | static list |

All hot paths (needle, streaks, page pan) stay on the UI thread via shared values;
`reduceMotion` (setting OR OS) gates every decorative layer.

## 5. Component plan

New: `ModeRail`, `PageFlow` (pager wrapper on gesture-handler), `OverheadConsole`
(sheet), `ChaseCarCard`, `LapRail`, `TimelineNode`, `SegmentedControl` (real, reusable),
`SettingsRow` / `SettingsGroup` (the fixed row patterns).

Changed: `(tabs)/_layout.tsx` replaced by the pager (tabs remain as the iPad/TV
fallback — see risks), `Speedometer` gains a `compact` variant for the strip morph,
`StatusPill` becomes a rail tick, Settings screen rebuilt on `SettingsRow`.

Unchanged: all stores, protocol, TV stage (its own surface), settings keys, tests
(navigation tests get updated, not deleted).

## 6. What stays the same

Navigation *destinations* (routes) are identical — only the shell around them changes.
TV mode, iPad two-pane, demo mode, persistence, protocol: untouched.

## 7. Risks & effort

| Risk | Mitigation |
|---|---|
| Pager + expo-router interplay is custom work (M) | keep routes; pager is a shell component, router still owns pushes |
| iPad two-pane already assumes tabs (M) | on ≥`TWO_PANE_MIN_WIDTH`, fall back to today's tab shell; pager is the phone experience |
| Swipe nav less discoverable than tabs (S) | mode rail ticks + first-run coach hint |
| Gesture-handler has zero usage today — new patterns to test (S) | isolated `PageFlow` component, unit-testable spring configs |

Effort: shell/pager **M**, Speed/Race pages **M**, Garage/History **S**, Settings
rebuild **S**, overhead console **S**.

## 8. Why pick this one

If Proposal A is the toy come alive and Proposal B is the instrument cluster, Night
Rally is the **car** — the most immersive, the most differentiated, and the boldest
break from "just another tabbed app." It's also the highest-effort shell change, which
is why the iPad fallback keeps the risk boxed.
