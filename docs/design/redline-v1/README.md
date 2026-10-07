# Redline V1 — Racing Identity

The design for Redline ID's App Store V1 launch: a motorsport-flavoured identity
(asphalt and track orange, slanted condensed type, upright HUD numerals, kerbs,
checkers, race plates, start lights and flames) applied to every screen, plus a new
app icon and App Store screenshot frames.

It **replaces the look** of the earlier *Trackside Telemetry* overhaul
(`docs/design/ui-overhaul/`), which is already implemented. It keeps that work's
structure, components and behaviour.

| | |
|---|---|
| **Status** | Implemented as RL-01 … RL-18 (stacked PRs #88–#105); RL-19 is out of scope. Details and follow-ups in [`IMPLEMENTATION.md`](IMPLEMENTATION.md). The system is summarised in [`docs/architecture/design-language.md`](../../architecture/design-language.md) and [ADR-0016](../../adr/0016-redline-v1-visual-identity.md). |
| **Spec** | [`SPEC.md`](SPEC.md): tokens, type, motifs, components, screens, motion, icon, screenshots |
| **Work** | [`ISSUES.md`](ISSUES.md): epic RL-00 and issues RL-01 … RL-19, with the Definition of Done |
| **Agent hand-off** | [`CODEX_PROMPT.md`](CODEX_PROMPT.md): self-contained prompt for Codex or another coding agent |

## The artboards

| Image | Screen | Route / file it maps to |
|---|---|---|
| [`png/Main.png`](png/Main.png) | Identity and system sheet: wordmark, palette, type, trackside kit, controls | `theme/tokens.ts`, `components/redline/` |
| [`png/Icon.png`](png/Icon.png) | App icon, sizes, home screen, alternates | `assets/images/icon.png` |
| [`png/Connect.png`](png/Connect.png) | 01 · Find your portal (first run) | Speed tab, disconnected state |
| [`png/Speed.png`](png/Speed.png) | 02 · Speed (live gauge) | `app/(tabs)/index.tsx` |
| [`png/Countdown.png`](png/Countdown.png) | 03 · Race countdown | `race/components/RaceCountdown.tsx` |
| [`png/Race.png`](png/Race.png) | 04 · Race live | `race/components/RaceProgress.tsx` |
| [`png/Results.png`](png/Results.png) | 05 · Finish | `race/components/RaceResults.tsx` |
| [`png/Garage.png`](png/Garage.png) | 06 · Garage | `app/(tabs)/garage.tsx` |
| [`png/Achievements.png`](png/Achievements.png) | 07 · Trophy case | `app/achievements.tsx` |
| [`png/History.png`](png/History.png) | 08 · History | `app/(tabs)/history.tsx` |
| [`png/CarDetail.png`](png/CarDetail.png) | 09 · Car detail | `app/garage/[uid].tsx` |
| [`png/Settings.png`](png/Settings.png) | 10 · Settings (full-length capture) | `app/settings.tsx` |
| [`png/Store01.png`](png/Store01.png) … [`Store06`](png/Store06.png) | App Store screenshot frames | `docs/release/` |

## Folder layout

- `source/`: the original artboard files (`*.dc.html`) and `canvas.json`. They were
  authored in a claude.ai Design canvas. They are plain HTML plus a tiny template
  layer (`{{holes}}`, `<sc-for>`, `<sc-if>`, `<dc-import>`, and a `renderVals()`
  script). **Exact values live here.**
- `static/`: runtime-free HTML renders of each artboard. Open one in a browser; it
  works offline with the vendored fonts in `static/fonts/`, which are latin subsets
  of Barlow, Barlow Condensed and Chakra Petch (SIL OFL 1.1).
- `png/`: 2× reference screenshots of the static renders.
- `tools/render-static.mjs`: regenerates `static/` and `png/` from `source/`. Run it
  after editing an artboard:

  ```bash
  NODE_PATH=$(npm root -g) node docs/design/redline-v1/tools/render-static.mjs
  ```

  It needs Playwright with Chromium.

## Notes

- Mockup numbers (speeds, lap times, counts, dates) are **sample data**.
- Car names, series, toy numbers, achievement titles and settings rows come from the
  real catalog, `achievements/catalog.ts` and `settings.tsx`.
- No Hot Wheels or Mattel marks are used anywhere. The app is Redline ID.
