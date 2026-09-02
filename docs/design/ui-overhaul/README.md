# UI Overhaul — Proposals for Review

> **Status: direction chosen.** The owner selected **Proposal B — Trackside
> Telemetry**. Implementation is tracked in **[IMPLEMENTATION.md](IMPLEMENTATION.md)**;
> the Settings alignment overhaul and the global telemetry shell are already in.

Three candidate directions for a **dynamic, animated** Redline ID UI, produced by a
multi-agent pipeline (research + design across local OpenCode, Claude Code, and Codex).

## ▶ Start here

Open **`index.html`** in a browser — it embeds all three animated mocks side by side
with a comparison table. The mockups are self-contained (no network/assets) and loop
their signature motion automatically.

```
open docs/design/ui-overhaul/index.html
```

## The three directions

| | Direction | Designer | One-liner | Nav | Risk |
|---|---|---|---|---|---|
| **A** | [Arcade Racer](01-proposal-arcade-racer.md) · [mock](mockups/arcade-racer/index.html) | Claude (Opus) | Toy-box arcade: chunky sticker cards, big numbers, bouncy springs, confetti on records | Tab bar (restyled) | Lowest |
| **B** | [Trackside Telemetry](02-proposal-trackside-telemetry.md) · [mock](mockups/trackside-telemetry/index.html) | Codex (GPT) | Motorsport timing console: glass panels, tabular numerals, live sparkline, status ribbon | Tab bar + ribbon | Low |
| **C** | [Night Rally](03-proposal-night-rally.md) · [mock](mockups/night-rally/index.html) | OpenCode (local) | Full-bleed cockpit: swipe between pages, morphing speed readout, drifting light streaks | Swipe pager + mode rail | Highest |

## Documents

- **[00-research.md](00-research.md)** — current-state audit: screens, components,
  motion inventory, the Settings alignment bug list (§5), library/capability audit,
  hard constraints, and what must not change. **This is the brief all proposals follow.**
- **01 / 02 / 03** — the three full proposals (concept, token deltas, per-screen specs,
  motion spec mapped to Reanimated 4, component plan, risks/effort).

## What every proposal commits to

- **Settings rebuilt** to fix all audited alignment bugs (research §5) — 44-pt rows,
  control on the label line, hint below in secondary, grouped cards, even section
  rhythm. The Settings store API (`settingsStore`) is unchanged.
- Dark-only, offline-first, reduce-motion honored, flame-orange/electric-blue identity,
  no Mattel/Hot Wheels brand assets.
- TV mode (`TvStage`), protocol/BLE, persistence, and settings keys untouched.

## Next step

Pick a direction (A, B, C, or a blend — e.g. "B's shell with A's gauge FX"). A coding
agent then implements it in `apps/mobile`, with the Settings fix landing first as the
fastest zero-risk win.
