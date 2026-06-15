# 12. Modern-firmware MPID protocol: TS port + BLE transport

- **Status:** Accepted
- **Date:** 2026-06-15
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md),
  [ADR-0004](0004-shared-typescript-protocol-package.md),
  [ADR-0011](0011-phase-1-ble-transport.md)
- **Credit:** the modern protocol was reverse-engineered by **Mitch Capper
  ([@mitchcapper](https://github.com/mitchcapper))** on the `modern_protocol_support` branch of
  `mtxmiller/hotwheels-portal`. Our Python (`python/hwportal/mpid.py`) is vendored from that work
  (MIT); this ADR covers the independent TypeScript port + the React Native transport.

## Context

[ADR-0011](0011-phase-1-ble-transport.md) shipped a real BLE transport that subscribes to the
**legacy control service** (`…-000c`: serial, car events, speed). On-device testing then revealed
that the user's portal — and every Hot Wheels id portal still shipping — runs **newer firmware
that exposes no `…-000c` service at all**. Discovery finds only the *auth* service (`…-000a`) and a
*data* service (`…-000b`). The ADR-0011 transport correctly detected "no control characteristics"
and surfaced a graceful **`locked`** phase, but no live car/speed was possible.

We initially concluded the control service was gated behind an unsolved Mattel challenge-response.
**That was wrong.** The modern firmware does not gate a hidden service; it replaces the entire
plaintext-GATT model with an **encrypted Protocol-Buffers stream over the auth service** after a
key exchange. Crucially, **the portal authenticates *itself* to the app** (anti-counterfeit) — the
client is never authenticated and sends only an ephemeral public key. So there is **no Mattel
secret to recover**; the handshake is completable entirely offline, and the dead Mattel backend is
irrelevant.

This was proven end-to-end: `python/mpid_monitor.py` decodes **live** car-on / drive-by / speed /
heartbeat events on the user's own unit (firmware 1.0.9).

### How the modern ("MPID") protocol works

GATT (all on the auth service `…-0001-000a`):

| Char           | UUID          | Role                                                              |
| -------------- | ------------- | ---------------------------------------------------------------- |
| `CHAR_TXRX`    | `…-0002-000a` | indicate + write — encrypted frames in/out                       |
| `CHAR_FACTORY` | `…-0003-000a` | read — 136-byte signed manufacturing token (portal pubkey+salt)  |
| `CHAR_SESSION` | `…-0004-000a` | indicate + write — we write our pubkey+salt to start the session |

Handshake → stream:

1. Subscribe (indicate) to `CHAR_TXRX` and (best-effort) `CHAR_SESSION`.
2. Read the 136-byte FACTORY token; parse the portal's compressed **P-256** public key
   (bytes `[25:58]`) and 4-byte salt (`[132:136]`).
3. Generate an ephemeral P-256 keypair + a random 4-byte salt; **ECDH** → shared X; derive a
   16-byte **AES-128-CTR** session key via a 100-round AES-CTR KDF (iv = `00*9 'mattel' 00`).
4. Write `SESSION = our_compressed_pubkey(33) ‖ local_salt(4)` to `CHAR_SESSION` (with response).
5. Every `CHAR_TXRX` indication is a CRC-8'd, AES-CTR-encrypted, length-prefixed frame
   (`0x7e` preamble) wrapping a **protobuf** `PortalToApp` message: heartbeats (firmware,
   battery, mode) and events (car on/off, drive-by with speed + IR gate timings).

## Decision

**1. Port the MPID core into `@hotwheelsid/protocol` as pure TS — no native deps.** New
`packages/protocol/src/mpid/` modules (`crc8`, `crypto`, `token`, `session`, `protobuf`, barrel
`index`) implement the handshake, AES-128-CTR framing + RX state machine, and protobuf decode.
Crypto uses **`@noble/curves` (P-256)** and **`@noble/ciphers` (AES-CTR)** — audited, pure-JS,
tree-shakeable, and Metro-friendly on **both** the web and native resolvers (verified by bundling).
This upholds [ADR-0004](0004-shared-typescript-protocol-package.md): the protocol package stays
framework-free and fully unit-testable.

**2. Cross-validate byte-for-byte against the hardware-proven Python.** 26 vitest cases assert the
TS output equals deterministic known-answer vectors generated from `python/hwportal/mpid.py` (CRC-8
table, KDF, ECDH at fixed scalars, frame encode/decode, the SESSION handshake) **and** decode the
exact real captured packets (heartbeat 1.0.9, a car UID, a drive-by at ~38 scale-mph with gate
timings). The Python is the reference; the TS must match it exactly, including the RX resync edge
cases.

**3. Bridge MPID → the existing `PortalEvent` model.** `mpidToPortalEvents(PortalMessage)` maps
protobuf events onto the same discriminated union the legacy parser and the mock already emit
(`carDetected` / `carRemoved` / `speed`). **Nothing downstream of `dispatch` changes** — the
store, gauge, flame FX, and Live log are transport- and firmware-agnostic, exactly as
[ADR-0011](0011-phase-1-ble-transport.md) intended.

**4. Drive MPID from a dedicated BLE module, reusing the ADR-0011 web-safety pattern.**
`apps/mobile/src/ble/mpidBle.ts` runs the handshake over an already-connected ble-plx device using
**type-only** ble-plx imports. `blePortal.ts`'s `subscribeToPortal` now: (a) builds a map of every
discovered characteristic; (b) tries the legacy notify subscribe; (c) **if zero legacy
characteristics, and the three MPID characteristics are present, runs the MPID handshake**; (d)
only if neither path works, falls to `locked`. A new **`authenticating`** `BlePhase` covers the
handshake window. The legacy path is retained for any ≤1.2.5 portal.

**5. Install the CSPRNG polyfill lazily, native-only.** `@noble` needs
`crypto.getRandomValues`, which Hermes/React Native lacks by default. `mpidBle.ts`
**`require('react-native-get-random-values')` inside `runMpidSession`** (right before
`new MpidSession()`) so the native polyfill never enters the web/SSR import graph — preserving the
hardware-free web export. Verified: `expo export --platform web` **and** `--platform ios` both
bundle clean.

**6. A fresh `MpidSession` per connection.** The portal expects a new key exchange on each connect.
`runMpidSession` constructs a new session every call; its TX/RX subscription is tracked in the
transport's `monitorSubs` so disconnect/stop tears it down, and reconnect re-handshakes.

## Consequences

### Positive

- **Live car/speed is now possible on current-firmware portals** — the headline goal — without any
  Mattel secret or backend, entirely offline.
- The protocol port is fully CI-tested (protocol suite 23 → 49 tests) and cross-validated against
  real hardware captures, independent of any RN runtime.
- Reuses the ADR-0011 seam wholesale: only the *transport* gained a branch; the store and all UI
  are untouched. The mock demo and web preview still work.
- Web/simulator safety is preserved by the same lazy-require discipline already documented in
  `blePortal.ts`.

### Negative / costs

- Adds three runtime dependencies (`@noble/curves`, `@noble/ciphers`, and the native
  `react-native-get-random-values`). The noble libs are pure-JS and bundle on web+native; the
  polyfill is native-only and autolinked into the dev build.
- The crypto/protobuf port is non-trivial surface area to maintain. Mitigated by the byte-for-byte
  KAT suite pinned to the Python reference — any drift fails CI.
- On-device MPID behavior (real indications, MTU, timing) **cannot be verified in CI, on web, or on
  the simulator** (no BLE radio); it is validated on the user's physical iPhone, mirroring the
  proven `mpid_monitor.py` flow.

## Alternatives considered

- **Treat the portal as permanently "locked."** Rejected once `mpid_monitor.py` proved live
  telemetry is recoverable offline. The locked phase is retained only as the genuine
  neither-legacy-nor-MPID fallback.
- **A WebCrypto/`expo-crypto` implementation instead of `@noble`.** Rejected: we need synchronous,
  deterministic P-256 ECDH + raw AES-CTR that runs identically under Node (vitest), Hermes, and the
  web bundler. `@noble` is pure-JS, audited, and matched the Python byte-for-byte; WebCrypto's
  async API and patchy RN support would complicate the port and the tests.
- **Port the protobuf via a codegen runtime (e.g. protobufjs).** Rejected: the message set is tiny
  and the wire reader is a few hundred lines, so a hand-written, dependency-free decoder keeps the
  package lean and its BigInt varint / sign-extension handling explicit and testable.
- **Import the polyfill at app entry (`expo-router/entry`).** Rejected: a top-level native import
  would risk the web export. A lazy require on the native-only MPID path keeps web clean while
  guaranteeing the CSPRNG exists before any key generation.
