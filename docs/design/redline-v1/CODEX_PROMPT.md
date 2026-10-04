# Hand-off prompt: implement Redline V1 (for Codex or any coding agent)

Copy everything inside the fence into a fresh agent session that has this repository
checked out. It is self-contained. Below it is a shorter per-issue prompt for
running one issue at a time.

````markdown
You are implementing the **Redline V1 racing identity** in the Redline ID iOS app:
React Native 0.85 + Expo SDK 56 + expo-router, in `apps/mobile`. Redline ID revives the
discontinued Hot Wheels id Race Portal over Bluetooth. This is a **visual re-skin for
the App Store V1 launch**: new colours, bundled fonts, a slanted motorsport language,
trackside motifs (kerbs, checkers, race plates, start lights, flames) and a few new UI
states. The app's structure, data, BLE/protocol, persistence and behaviour stay as
they are.

## 0. Ground truth: read these first, in this order

1. `docs/design/redline-v1/README.md`: what's in the design folder.
2. `docs/design/redline-v1/SPEC.md`: **the spec.** Tokens, type, motifs, components,
   every screen, motion, accessibility, app icon, store screenshots.
3. `docs/design/redline-v1/ISSUES.md`: the work, split into issues RL-01 … RL-19,
   with a Definition of Done that applies to every issue.
4. `docs/design/redline-v1/png/*.png`: **look at the reference image for every screen
   you touch** (2× renders of the design artboards).
5. `docs/design/redline-v1/source/*.dc.html`: the original artboard markup. Take
   exact hex values, sizes, offsets and **SVG paths** from here; copy paths verbatim.
   `docs/design/redline-v1/static/*.html` are runtime-free renders you can open in a
   browser.
6. Existing context: `docs/design/ui-overhaul/IMPLEMENTATION.md` (the current
   "Trackside Telemetry" implementation you are re-skinning, including the verified
   gauge motion you must not regress), `docs/design/ui-overhaul/00-research.md`
   §4–§8 (hard constraints), `docs/architecture/design-language.md`, and the ADRs in
   `docs/adr/`.

**Precedence when sources disagree:** for visual values, `source/*.dc.html` beats
SPEC.md, which beats the PNGs. For behaviour, data, accessibility and constraints,
SPEC.md and ISSUES.md beat the mockups. The mockups use **sample numbers**; never
hard-code them.

## 1. Hard rules (a PR that breaks one of these is wrong even if it looks right)

- **Do not modify** `packages/protocol`, `apps/mobile/src/ble`, `src/transport`,
  `src/portal` (you may import selectors and actions; do not change them),
  `src/store/**` shapes, the persistence/SQLite schema, the eight settings keys
  (`playerName, defaultLaps, haptics, sound, reduceMotion, mockModeDefault,
  speedUnit, speedCalibration`), or the `TvStage` contract.
  - **TV mode stays visually as it is.** `TvStage` keeps the needle gauge. Add the
    new gauge as `variant="redline"` on `Speedometer`, with `'needle'` as the
    default.
- **Tokens are additive.** Add the new `colorsR` / `fontR` / `radiusR` / `skewR` /
  `typeR` to `apps/mobile/src/theme/tokens.ts`. Never rename or delete existing
  tokens.
- **No new native dependencies.** JS-only packages are fine: the
  `@expo-google-fonts/*` font packages, and an image-export devDependency for the
  icon. Anything that needs a native module, such as alternate app icons (RL-19), is
  **out of scope** unless the owner approves.
- Keep **existing tests** passing. Update a test only when a visual string it asserts
  has deliberately changed, and say so in the PR.
- **Reduce motion:** all decorative motion goes through `useTelemetryMotion` (OS flag
  OR the `reduceMotion` setting). Keep haptics and sound gated by their settings.
- **Accessibility:** touch targets ≥ 44 pt; decorative motifs hidden from VoiceOver;
  numbers spoken with units; colour never the only signal; keep every existing
  `announceForAccessibility` call.
- **Do not invent data.** When the design shows something the data doesn't have, use
  the fallback named in SPEC.md, or omit it. Examples: top speed per race, gate speed
  per lap, record detection.
- **No Mattel/Hot Wheels branding** in UI chrome or store art. The app is
  "Redline ID". Keep the not-affiliated disclaimer.
- On iOS, set **only `fontFamily`** for custom faces; don't also set `fontWeight` or
  `fontStyle` (it causes faux bold/italic). Put `fontVariant: ['tabular-nums']` on
  every number.
- React Native has no CSS repeating gradients or `inset` box-shadow tricks. Build
  stripes and checkers with `react-native-svg` `<Pattern>`. Build accent top-bars as
  real `View`s.

## 2. Repository orientation

- App code: `apps/mobile/src/`
  - routes: `app/`; tabs live in `app/(tabs)/`
  - components: `components/`; telemetry components in `components/telemetry/`,
    gauge in `components/gauge/`
  - race UI: `race/components/`
  - theme: `theme/tokens.ts`
- Create new primitives in `apps/mobile/src/components/redline/`.
- Path alias: `@/` → `apps/mobile/src/`.
- Tests are vitest with a React Native stub (`src/test/reactNativeStub.ts`). Unit-test
  **pure logic**. Don't try to snapshot native views.
- Demo mode (`src/mock/mockPortal.ts`) makes every screen reviewable without hardware.
- Car photos: use `catalog/CarPhoto.tsx` when artwork exists; use the new
  `CarSilhouette` only as a fallback.

## 3. How to work

Work through the issues **in order** (RL-01 → RL-18). They are filed on GitHub under epic **#67**; RL-n is issue **#(67+n)**, so RL-01 = #68 … RL-18 = #85, and RL-19 = #86 is stretch and must not be started. Reference the GitHub issue in each PR (`Closes #68`). Use **one branch and one PR per
issue**, named `redline/rl-XX-short-name`. Base it on the branch that contains
`docs/design/redline-v1/` (`claude/nice-newton-zavuvp` until that branch is merged,
then `main`). If you can't open PRs, make one commit per issue on a single branch,
with the issue id in each commit subject.

For each issue:
1. Read its section in ISSUES.md, the SPEC sections it cites, its PNG and its source
   artboard. Open the existing file(s) you are changing and understand their current
   props and behaviour first.
2. Implement the smallest change that meets the issue. Restyle existing components in
   place and keep their props stable. Create new components only where the issue says
   to.
3. Put new derivations in **pure functions with vitest tests**: plate numbers,
   countdown → lights, pace projection, record detection, heat buckets, session
   grouping, series filters, bar colours, the achievement icon map.
4. Run the CI checks from the repo root:
   ```bash
   npm ci
   npm run typecheck
   npm test
   npm run lint --workspace mobile
   npm run web:export --workspace mobile
   ```
5. **Visual check.** Start the web build (`npm run web --workspace mobile`), switch on
   demo mode, and capture the screen with Playwright: viewport 390 × 844,
   deviceScaleFactor 2. Compare it with `docs/design/redline-v1/png/<Screen>.png` and
   attach both images to the PR (or save them under `docs/design/redline-v1/review/`).
   Native-only effects (glass, haptics, BLE) can't be checked on web; say so. If the
   web build can't show a screen, say why and describe what you checked instead.
6. Update `docs/design/redline-v1/IMPLEMENTATION.md`: what landed, deviations and
   follow-ups.
7. Commit in the repo's style (`feat(ui): …`, `fix(ui): …`, `docs: …`), with the issue
   id in the subject, e.g. `feat(ui): redline tokens and bundled fonts (RL-01)`. The
   PR body says `Closes #<issue number>`.

## 4. Known corrections to the mockups (implement the spec, not the picture)

- **Race live, track markers:** the portal only sees gate crossings. Markers are a
  time projection (best-lap ghost and last-lap marker) along a decorative path, and
  the panel is labelled "PACE ESTIMATE". The mockup draws the ghost ahead of the car
  while the delta says ahead; follow SPEC §4.5.
- **Full-width skewed buttons** stick out past their container in the mockups. Inset
  them by `height × tan(12°)` per side.
- **Results TOP SPEED:** `RaceResult` has no speed. Compute it from portal passes in
  the race window, or show AVG LAP.
- **Race plate numbers** are derived (position by `firstSeen`), not stored.
- **"Find your portal"** is a state of the Speed tab, not a new route, and adds no
  persisted flag.
- **App icon:** the board draws it with rounded corners. The shipped PNG must be
  full-bleed, square and opaque.
- **App Store frames:** the store artboards embed design mockups. The real pipeline
  composites **real simulator captures**. Confirm the pixel sizes App Store Connect
  currently requires.

## 5. Fonts

Install `@expo-google-fonts/barlow`, `@expo-google-fonts/barlow-condensed` and
`@expo-google-fonts/chakra-petch`, and load only the faces listed in SPEC §1.2. If npm
has no network access, get TTFs from Google Fonts. The css2 API returns TTF URLs when
requested with a non-browser User-Agent. Put them in `apps/mobile/assets/fonts/` and
load them with `expo-font`. The `.woff2` files in `docs/design/redline-v1/static/fonts/`
are latin web subsets for the mockups only; iOS cannot use them. Credit the OFL
licence in `THIRD_PARTY_NOTICES.md` and on the Credits screen.

## 6. When to stop and ask

Stop and ask the owner only for: adding a native dependency, changing anything in a
protected area, changing a settings key or the database schema, or a product decision
the spec leaves open with no fallback. Otherwise make the call, note it in the PR
under "Decisions", and keep going. If one issue is blocked, record why in
IMPLEMENTATION.md and move on to the next one that doesn't depend on it.

## 7. Report back

After each issue, give:
- what changed (files);
- checks run, with results;
- before/after or design-vs-build screenshots;
- deviations from the design and why;
- follow-ups.

At the end, summarise which RL issues are done, partial or blocked.
````

---

## Short per-issue prompt

Use this to run one issue at a time once the agent has read the full prompt, or
paste it with the full prompt above it.

````markdown
Implement **RL-XX** from `docs/design/redline-v1/ISSUES.md` in this repo.

Before coding, read the RL-XX section and the SPEC.md sections it cites, look at the
reference PNG(s), and open the source artboard(s) in
`docs/design/redline-v1/source/` for exact values. Follow the hard rules and the
Definition of Done in ISSUES.md: protected areas untouched, additive tokens only, no
native dependencies, reduce-motion gating, accessibility, pure logic unit-tested, CI
checks green.

Finish with a web demo-mode screenshot at 390×844 @2x next to the reference PNG, an
updated `docs/design/redline-v1/IMPLEMENTATION.md`, and one commit
`feat(ui): … (RL-XX)` on branch `redline/rl-XX-<slug>`. Report changed files, checks,
screenshots, deviations and follow-ups.
````
