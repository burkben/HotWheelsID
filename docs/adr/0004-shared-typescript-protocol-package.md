# 4. Port the BLE protocol to a shared TypeScript package

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0002](0002-adopt-react-native-and-expo.md), [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md), [ADR-0007](0007-monorepo-structure-and-python-reference.md)

## Context

The valuable, hard-won asset in this project is the **reverse-engineered protocol**, not
any particular UI. Today it lives in two places in Python: `hwportal/constants.py`
(UUIDs) and `hwportal/portal.py` (connection + event handling), with the byte formats
documented in [`PROTOCOL.md`](../../PROTOCOL.md).

To build the React Native app we must re-express this knowledge in TypeScript. We want
that logic to be:

- **transport-agnostic** — pure functions over byte arrays, with no dependency on
  `react-native-ble-plx` or any UI, so it can be unit-tested in plain Node and reused by a
  future web/desktop client;
- **the single source of truth** for UUIDs and parsing, so the app and any tooling agree.

The protocol surface to port (from `PROTOCOL.md`):

- **Service/characteristic UUIDs** (auth `…-000a-…`, data `…-000b-…`, control `…-000c-…`).
- **Car detection** event: `0x04` followed by a 6-byte NFC UID; empty payload = car removed.
- **Speed** event: 4-byte **little-endian IEEE-754 float32**; multiply by 64 for "scale mph".
- **Serial number**: ASCII string; empty = car removed.
- **NDEF / Mattel car-id** record on event channel 1 (`https://www.pid.mattel/<base64>`),
  including the embedded NFC UID — used for car identification/lookup.
- **Control register** 5-byte status patterns (idle / car-present / transitional).

## Decision

Create a standalone package **`@hotwheelsid/protocol`** (in `packages/protocol/`,
see [ADR-0007](0007-monorepo-structure-and-python-reference.md)) containing:

- `uuids.ts` — all service/characteristic UUID constants, ported 1:1 from
  `hwportal/constants.py`.
- `events.ts` — typed event models (`CarDetected`, `CarRemoved`, `SpeedSample`,
  `SerialChanged`, `ControlStatus`, `NdefCarId`) and a `parseCharacteristicValue(uuid,
  bytes)` function that maps a raw indication to a typed event.
- `decode.ts` — small pure helpers: `bytesToHex`, `parseNfcUid`, `parseSpeedFloat`
  (`DataView.getFloat32(0, /*littleEndian*/ true) * 64`), `parseSerialAscii`, and NDEF/
  base64 car-id extraction.
- `index.ts` — public exports. **No** dependency on React, React Native, or any BLE lib.

The app's BLE layer ([ADR-0003](0003-bluetooth-with-react-native-ble-plx.md)) decodes
base64 characteristic values to `Uint8Array` and feeds them to `parseCharacteristicValue`.

The port is validated with **unit tests using the byte samples already documented** in
`PROTOCOL.md` (e.g. `04 6c c4 5a 2b 64 81` → UID `6C:C4:5A:2B:64:81`; `b01c143e` →
≈0.1446 → scale speed). The Python implementation remains the oracle for new captures.

## Consequences

### Positive
- One tested, framework-free module owns all protocol knowledge; the UI and BLE layers
  stay thin.
- Reusable by any future TS client (web companion, Node CLI, tests) without React Native.
- Encodes the protocol as **types**, catching format mistakes at compile time.

### Negative / costs
- Two implementations (Python + TS) can drift. Mitigation: `PROTOCOL.md` stays the
  canonical written spec; both implementations cite it, and the TS tests use the spec's
  sample vectors.
- Some areas of the protocol are still partially understood (auth handshake, full NDEF/
  car-id schema, exact speed units). The package will model what is known and expose raw
  bytes for the rest.

## Alternatives considered

- **Parse inline inside React components / the BLE hook.** Rejected: couples protocol
  logic to the UI, makes it untestable without a device, and prevents reuse.
- **Generate TS from a shared schema.** Overkill for a handful of byte formats; a small
  hand-written, well-tested module is clearer.
- **Call into Python from the app.** Not feasible on-device (no CPython on iOS); only
  possible in the rejected "bridge" architecture.
