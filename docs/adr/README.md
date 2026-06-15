# Architecture Decision Records

This directory captures the significant architectural decisions for **HotWheelsID** —
the evolution of the forked [`hotwheels-portal`](https://github.com/mtxmiller/hotwheels-portal)
Python tool into a polished, **cross-platform mobile app that is installable on iOS**.

We use lightweight [Michael Nygard-style](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
ADRs. Each record is immutable once **Accepted**; if a decision changes, we add a new ADR
that **supersedes** the old one (and update the status header) rather than editing history.

## Index

| #    | Title                                                                 | Status   |
| ---- | --------------------------------------------------------------------- | -------- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions               | Accepted |
| [0002](0002-adopt-react-native-and-expo.md) | Adopt React Native + Expo for the new app      | Accepted |
| [0003](0003-bluetooth-with-react-native-ble-plx.md) | BLE via react-native-ble-plx + dev client | Accepted |
| [0004](0004-shared-typescript-protocol-package.md) | Port the BLE protocol to a shared TS package | Accepted |
| [0005](0005-ui-stack-reanimated-skia-expo-router.md) | UI stack: Expo Router + Reanimated + Skia | Accepted |
| [0006](0006-state-management-and-persistence.md) | State management & local persistence       | Accepted |
| [0007](0007-monorepo-structure-and-python-reference.md) | Monorepo layout; keep Python as reference | Accepted |
| [0008](0008-ios-distribution-with-eas-and-testflight.md) | iOS distribution via EAS Build + TestFlight | Accepted |
| [0009](0009-phase-2a-gauge-svg-first.md) | Phase 2a gauge: SVG-first, defer Skia FX to 2b | Accepted |
| [0010](0010-phase-2b-flame-fx-svg.md) | Phase 2b flame FX: SVG particles now, Skia still deferred | Accepted |

## Statuses

- **Proposed** — under discussion.
- **Accepted** — the decision we are building against.
- **Superseded by ADR-XXXX** — replaced by a later decision.
- **Deprecated** — no longer relevant.

## Creating a new ADR

1. Copy the structure of an existing record.
2. Use the next zero-padded number.
3. Keep it short: Context → Decision → Consequences (and Alternatives considered).
4. Open a PR. Merge marks it **Accepted**.
