# 6. State management and local persistence

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md), [ADR-0004](0004-shared-typescript-protocol-package.md)

## Context

The app has two very different kinds of state:

1. **Ephemeral, high-frequency runtime state** — connection status, the current car, the
   live speed sample, the in-progress race. This updates many times per second during a
   race and drives animation.
2. **Durable data** — the car collection ("garage"), per-car best speeds/laps, saved race
   results, and leaderboards. The upstream tool explicitly lacks persistence ("results
   lost on exit"); fixing that is on its roadmap and ours.

We want runtime state that is simple and fast, and durable storage that can answer
relational questions ("best lap per car", "all passes in session X") without bespoke file
juggling.

## Decision

- **Runtime state: [Zustand](https://github.com/pmndrs/zustand).** A tiny store holds
  connection state, current car, latest speed sample, and race state. The BLE event stream
  ([ADR-0003](0003-bluetooth-with-react-native-ble-plx.md)) parses bytes via
  `@hotwheelsid/protocol` ([ADR-0004](0004-shared-typescript-protocol-package.md)) and
  dispatches into this store. High-frequency animation values are held in Reanimated
  shared values to keep re-renders off the JS thread.
- **Durable storage: [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/)**
  for the relational data (cars, sessions, passes, races, leaderboard entries), optionally
  with a thin typed query layer (e.g. Drizzle) added later.
- **Small key/value settings** (theme, last-connected portal UUID, units) via
  **`react-native-mmkv`** or `expo-secure-store` for anything sensitive.

Proposed initial schema (illustrative): `cars(uid, serial, mattel_id, name, first_seen,
…)`, `sessions(id, started_at, …)`, `passes(id, session_id, car_uid, ts, speed,
lap_ms)`, `races(id, mode, laps, started_at, …)`, `race_results(race_id, player, total_ms,
best_lap_ms)`.

## Consequences

### Positive
- Zustand keeps runtime state boilerplate-free and decoupled from the view tree.
- SQLite gives durable, queryable history and a real "garage" — directly enabling the
  persistent-DB, collection, and leaderboard features on the roadmap.
- Clear split: animation-critical values in Reanimated, app state in Zustand, durable
  facts in SQLite.

### Negative / costs
- Introduces a schema and lightweight migration discipline.
- Two storage mechanisms (SQLite + KV) to reason about; kept simple by clear ownership.

## Alternatives considered

- **Redux Toolkit.** More structure/boilerplate than this app needs; Zustand is lighter.
- **React Context for runtime state.** Re-renders too broadly for high-frequency speed
  updates; Zustand + Reanimated shared values avoid that.
- **AsyncStorage/JSON files for durable data.** Fine for tiny KV, poor for relational
  history and leaderboards; SQLite scales better with negligible extra cost.
- **WatermelonDB.** Powerful for large/synced datasets, heavier than needed here.
