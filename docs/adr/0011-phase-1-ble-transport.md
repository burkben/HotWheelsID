# 11. Phase 1 BLE transport: PortalTransport seam + Base64 codec in protocol

- **Status:** Accepted
- **Date:** 2026-06-15
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md),
  [ADR-0004](0004-shared-typescript-protocol-package.md),
  [ADR-0006](0006-state-management-and-persistence.md),
  [ADR-0009](0009-phase-2a-gauge-svg-first.md)

## Context

Phase 1 of the [roadmap](../ROADMAP.md) replaces the mock event source with **real
Bluetooth**: scan for the Hot Wheels id Race Portal, connect, subscribe to its control
service, and feed decoded events into the UI — the parity target is `python/monitor.py` /
`scanner.py`.

The groundwork is already laid:

- [ADR-0004](0004-shared-typescript-protocol-package.md) put all pure parsing in
  `@hotwheelsid/protocol` (`parseCharacteristicValue`).
- Phase 2a made the Zustand store **transport-agnostic** ([ADR-0006](0006-state-management-and-persistence.md)):
  it consumes already-decoded `PortalEvent`s via `dispatch` and lifecycle via
  `setConnection`. The mock encodes *real* portal bytes and runs them through the production
  parser, so the UI already exercises the actual protocol pipeline.

Two forces shape this decision:

1. **react-native-ble-plx has no web implementation** and throws if its `BleManager` is
   constructed off-device. But Expo Router's **static web export imports every route module**
   (to build the sitemap), and web is our **only hardware-free preview channel** (the user
   verifies on a physical iPhone later). A naive `import { BleManager }` at module scope in a
   routed screen would break `expo export --platform web` and the simulator.
2. **The BLE wire format is Base64.** ble-plx delivers every characteristic `value` across the
   RN bridge as a Base64 string. Something must convert Base64 → bytes before the existing
   byte parser runs — and that conversion is part of the protocol's wire contract.

## Decision

**1. A `PortalTransport` seam.** Define a minimal `{ start, stop }` contract
(`apps/mobile/src/ble/types.ts`) implemented by both the mock and the new BLE client. The
store is the integration point: the BLE client decodes bytes and calls the exact same
`dispatch` / `setConnection` the mock calls. Swapping transports changes nothing downstream.

**2. Put the Base64 codec in `@hotwheelsid/protocol`, not the app.** Add a dependency-free
`base64.ts` (`bytesFromBase64` / `base64FromBytes`, pure JS lookup-table — no `atob`/`btoa`/
`Buffer`). Rationale: it is the *wire* contract, it is pure (zero RN/UI deps, satisfies
[ADR-0004](0004-shared-typescript-protocol-package.md)), and putting it in the protocol
package ties the **entire** decode path — Base64 string → bytes → typed event — into the CI
vitest suite (CI only runs the protocol tests + typecheck). The BLE layer *calls* the codec;
the codec itself stays framework-free and portable.

**3. Lazy-load the native module; keep routes web-safe.** `blePortal.ts` uses **type-only**
imports from `react-native-ble-plx` and a **lazy `require()` inside functions** — the
`BleManager` is constructed only when `start()` runs on a real device. The Live screen guards
`Platform.OS === 'web'` and `Device.isDevice` (simulator) and never starts the transport
there, so the native module is never required during web export or on the simulator. Verified
headlessly: `expo export --platform web` still bundles and `/live` static-renders a
"Bluetooth isn't available" notice with no crash.

**4. Scan-all + name match.** Per [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md) we
scan and match on the advertised name `HWiD` **or** an advertised `SERVICE_CONTROL` UUID.
Because a peripheral may not include its 128-bit service UUID in the advertisement packet, we
pass a `null` service filter to `startDeviceScan` and match by name, which is more reliable
than a service-UUID scan filter alone.

**5. Monitor the control service; pass known UUIDs to the parser.** After
`discoverAllServicesAndCharacteristicsForDevice`, subscribe to the control-service indication
characteristics (`SERIAL_NUMBER`, `EVENT_1..3`, `CONTROL`, `COMMAND`) via
`monitorCharacteristicForDevice`. Each callback does `bytesFromBase64(value)` →
`parseCharacteristicValue(KNOWN_UUID, bytes)` → `dispatch`. We pass the **known constant**
UUID (not `characteristic.uuid`) to avoid any ble-plx casing/normalization mismatch.

**6. Separate Live route; keep the mock demo.** The hero gauge (`index.tsx`) keeps running the
mock so the app still demos with zero hardware. Real BLE lives on a dedicated **Live portal**
route (Connect + raw event log, monitor.py parity). A tiny **single-active-transport guard**
(`transport/active.ts`) ensures starting one source stops the other, so they can never
double-dispatch into the shared store.

**7. Lifecycle & resilience.** Handle adapter state (`PoweredOff` / `Unauthorized` /
`Unsupported`) with clear UI phases; request Android runtime permissions best-effort (iOS uses
the `NSBluetoothAlwaysUsageDescription` already in `app.json`); on unexpected disconnect, retry
with capped exponential backoff (re-attach to the last peripherally, else re-scan).

## Consequences

### Positive

- The mock remains a faithful reference implementation: BLE reuses the *same* parser and store
  actions, so what was verified on web/simulator carries straight to hardware.
- The whole Base64→bytes→event path is unit-tested in CI, independent of any RN runtime.
- Web export and the simulator keep working (no native import at load) — the hardware-free
  preview channel is preserved.
- BLE complexity is isolated to `apps/mobile/src/ble/`; nothing else imports it.

### Negative / costs

- The lazy-`require` + type-only-import pattern is slightly non-obvious; it is documented at
  the top of `blePortal.ts` so future edits don't reintroduce a top-level native import.
- A `null`-filter scan briefly sees all nearby BLE devices (we discard non-matches). Acceptable
  for a foreground diagnostics flow.
- On-device behavior (real advertising/auth quirks) **cannot be verified in CI or on web** — it
  is validated on the user's physical iPhone.

## Alternatives considered

- **Base64 codec in the app, not the protocol package.** Rejected: it is the wire contract and
  is pure; keeping it in the package buys CI coverage of the full decode path for free.
- **Service-UUID scan filter.** Rejected as the *primary* match: portals may not advertise the
  128-bit service UUID, which would make them invisible to a filtered scan. We accept both
  signals but lead with the name.
- **One screen, swap mock↔BLE in place on `index.tsx`.** Rejected: a separate Live route keeps
  the always-works demo intact and gives BLE a focused diagnostics surface (event log, adapter
  state) without cluttering the hero gauge.
- **Persisting/auto-reconnecting to a known peripheral UUID across launches.** Deferred to a
  later phase (saved-portal UX); this phase reconnects only within a live session.
