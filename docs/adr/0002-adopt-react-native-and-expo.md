# 2. Adopt React Native + Expo for the new app

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md), [ADR-0004](0004-shared-typescript-protocol-package.md), [ADR-0007](0007-monorepo-structure-and-python-reference.md)

## Context

The upstream project is a **Python** tool that talks to the Hot Wheels id Race Portal
over Bluetooth Low Energy (BLE) using [`bleak`](https://github.com/hbldh/bleak) and
renders a terminal UI with [`rich`](https://github.com/Textualize/rich). It runs on
desktop (macOS/Windows/Linux) only.

Our two product goals are:

1. A **more attractive UI** than a terminal dashboard.
2. An app that is **eventually installable on iOS** (the portal is a kid's toy; the
   natural device to use at the track is a phone or tablet).

This creates a hard platform constraint:

- **Python + `bleak` cannot run on iOS.** There is no supported way to ship a CPython +
  BLE stack as a normal iOS app.
- **iOS Safari does not support Web Bluetooth.** A pure web app or PWA therefore *cannot*
  talk to the portal on iOS at all. (Web Bluetooth works on Chrome/Android and desktop
  Chrome, but not iOS.)

The only thing that is truly portable across platforms is the **reverse-engineered
protocol itself** (documented in [`PROTOCOL.md`](../../PROTOCOL.md)): the BLE service and
characteristic UUIDs, and the byte-level event formats. Any new client must re-implement
the BLE transport on a stack that has first-class iOS Bluetooth support
(Apple CoreBluetooth) and can render a rich UI.

## Decision

Build the new HotWheelsID client as a **React Native app managed with Expo**, written in
**TypeScript**. On iOS, BLE is provided by Apple's CoreBluetooth via a native module
(see [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md)). The reverse-engineered
protocol is ported to a shared, platform-agnostic TypeScript package
(see [ADR-0004](0004-shared-typescript-protocol-package.md)).

The existing Python tools are **retained as a reference implementation and desktop
utility** (see [ADR-0007](0007-monorepo-structure-and-python-reference.md)), not deleted.
They remain the fastest way to validate protocol behavior against real hardware.

## Rationale

- **One codebase, both phones.** A single TypeScript codebase targets iOS *and* Android.
  The portal's audience is kids/families; not assuming everyone has an iPhone is valuable.
- **Real, installable iOS app.** Expo + EAS Build produces a genuine native binary that
  installs via TestFlight or a development build — it satisfies the "installable on iOS"
  goal in a way a PWA never can on iOS (see [ADR-0008](0008-ios-distribution-with-eas-and-testflight.md)).
- **Polished UI is the happy path.** React Native has a deep ecosystem for exactly the UI
  we want: `react-native-reanimated` for 60/120 fps animation and
  `@shopify/react-native-skia` for a custom speedometer gauge and flame effects
  (see [ADR-0005](0005-ui-stack-reanimated-skia-expo-router.md)).
- **Mature BLE support.** `react-native-ble-plx` wraps CoreBluetooth (iOS) and the
  Android BLE stack with a single JS API, and ships an Expo config plugin.
- **Approachable language.** TypeScript is broadly known and lowers the contribution bar
  versus Swift-only or Dart, while still being statically typed for the protocol parser.
- **UI can be built before hardware integration.** We can design and iterate the whole UI
  against mocked portal events (even in a simulator or on web) and wire up real BLE later.

## Consequences

### Positive
- Cross-platform from day one; iOS is a first-class target.
- The protocol port becomes a small, testable, reusable package.
- Rich animation/graphics tooling is available out of the box.

### Negative / costs
- **No Expo Go.** BLE requires native code, so we must use a **custom development build**
  (`expo-dev-client`) rather than the Expo Go sandbox app. This is a one-time setup cost,
  documented in [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md).
- **The protocol must be re-implemented in TS.** Byte parsing, float decoding, and NDEF
  handling are rewritten from Python. Mitigated by keeping Python as the oracle and
  porting with unit tests against captured byte samples.
- **iOS BLE differs from desktop BLE.** CoreBluetooth hides the MAC address and exposes a
  per-device UUID; scanning should be filtered by service UUID. The TS layer must not
  assume MAC addresses the way the Python code does.
- **Apple Developer account needed for TestFlight** ($99/yr). A free Apple ID can still
  sideload a development build to a personally owned device for 7 days.

## Alternatives considered

### A. Native iOS (SwiftUI + CoreBluetooth)
Best-possible BLE reliability and native polish; the maintainer is already on a Mac.
**Rejected as the primary path** because it is iOS-only (no Android), requires Swift, and
would leave the protocol logic locked to one platform. Strong second choice; if RN BLE
reliability ever proves insufficient for real-time telemetry, revisit this for iOS.

### B. Flutter (+ `flutter_blue_plus`)
Comparable cross-platform story and excellent custom-painting for gauges.
**Rejected** mainly on language reach (Dart is less broadly known than TS) and to reuse
the JS/TS ecosystem; this is a close call, not a strong rejection.

### C. Python BLE bridge + thin web/mobile client
Keep all existing Python code running on a laptop/Raspberry Pi near the track exposing a
WebSocket; the phone is a thin UI that never touches BLE (sidestepping the iOS BLE/Web
Bluetooth problem entirely). **Rejected** because it requires an always-on second device
near the portal and a local network, which is too much friction for a toy used by a child.
Worth keeping in mind as an optional "TV/host mode" later.

### D. Progressive Web App with Web Bluetooth
Lowest-friction "attractive UI." **Rejected outright for the iOS goal:** iOS Safari does
not implement Web Bluetooth, so the app could never connect to the portal on an iPhone or
iPad. (A PWA could still be a nice *Android/desktop-Chrome* companion, but it cannot be
the iOS answer.)

### E. Keep Python, add a desktop GUI (e.g. Textual/Toga/Qt)
Improves the UI but does nothing for the iOS goal. **Rejected** as it doesn't move us
toward the primary objective.
