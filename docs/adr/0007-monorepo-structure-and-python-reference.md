# 7. Monorepo layout; keep Python as a reference implementation

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0002](0002-adopt-react-native-and-expo.md), [ADR-0004](0004-shared-typescript-protocol-package.md)

## Context

The repository currently contains a flat Python project at its root (`hwportal/`,
`dashboard.py`, `race_mode.py`, etc.). We are adding a TypeScript Expo app and a shared
protocol package. We need a structure that:

- cleanly separates the **app** from the **reusable protocol package**;
- preserves the **Python tools** as a working reference / hardware-validation utility
  (they are the fastest oracle when decoding new portal behavior);
- keeps merges from upstream `mtxmiller/hotwheels-portal` tractable where practical.

## Decision

Adopt a lightweight **monorepo**:

```
HotWheelsID/
├── apps/
│   └── mobile/            # Expo (React Native) app — the product
├── packages/
│   └── protocol/          # @hotwheelsid/protocol — TS port of the BLE protocol
├── python/                # existing Python tools, moved here as reference/desktop utility
│   ├── hwportal/
│   ├── dashboard.py
│   └── …
├── docs/
│   ├── adr/               # this directory
│   ├── architecture/      # current-state architecture + diagrams
│   └── ROADMAP.md
├── PROTOCOL.md            # canonical protocol spec (stays at root; cited by both impls)
└── README.md
```

- The JS workspace (npm/pnpm/Bun workspaces) links `apps/mobile` → `packages/protocol`.
- Moving the Python files under `python/` is a **roadmap task (Phase 0)**, done in one
  focused commit so history is easy to follow. Until then, the Python tools remain at root
  and this ADR documents the target.
- `PROTOCOL.md` remains at the repository root as the single canonical spec referenced by
  both the Python and TypeScript implementations.

## Consequences

### Positive
- Clear ownership: product (`apps/mobile`), reusable logic (`packages/protocol`),
  reference (`python/`), knowledge (`docs/`, `PROTOCOL.md`).
- The protocol package is independently testable and publishable.
- Python remains runnable for hardware bring-up and protocol verification.

### Negative / costs
- Relocating Python files diverges from upstream's layout, making direct merges harder.
  Accepted: this fork is intentionally diverging, and upstream changes can still be
  cherry-picked. The fork relationship to upstream is retained for visibility.
- A JS monorepo adds workspace tooling; kept minimal (a single app + single package).

## Alternatives considered

- **Separate repositories** for app, protocol, and Python. Rejected for a solo/small
  project: more overhead (versioning, cross-repo PRs) than value.
- **Drop the Python entirely.** Rejected: it is the working reference against real
  hardware and a useful desktop tool; deleting it discards validated knowledge.
- **Keep everything flat and drop the app under a subfolder only.** Rejected: a real
  `packages/` boundary is what makes the protocol port reusable and testable.
