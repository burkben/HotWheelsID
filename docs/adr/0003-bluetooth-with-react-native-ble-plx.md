# 3. Bluetooth via react-native-ble-plx + a custom dev client

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0002](0002-adopt-react-native-and-expo.md), [ADR-0004](0004-shared-typescript-protocol-package.md)

## Context

The portal communicates exclusively over BLE. On iOS, BLE means Apple's
**CoreBluetooth**; there is no way around it. We need a React Native BLE library that:

- wraps CoreBluetooth (iOS) and the Android BLE stack behind one JS/TS API,
- supports **subscribing to `indicate`/`notify` characteristics** (the portal pushes all
  car/speed events as indications),
- supports reading characteristics (firmware, serial, auth key) and writing (control
  register, command),
- integrates with Expo's build system.

A critical platform fact: **BLE is not available in Expo Go**, the default sandbox app,
because it requires custom native code. We therefore must produce a **development build**
(a.k.a. custom dev client) and standalone builds via EAS.

CoreBluetooth also imposes behaviors the protocol layer must respect:

- **No MAC address.** iOS exposes a per-device, per-install **UUID identifier**, not the
  hardware MAC the Python/`bleak` code relies on. Device discovery must therefore match on
  the advertised name (`HWiD`) and/or the control **service UUID**, then persist the iOS
  peripheral UUID for reconnects.
- **Characteristic values cross the bridge as base64 strings**, not raw byte arrays.

## Decision

Use **[`react-native-ble-plx`](https://github.com/dotintent/react-native-ble-plx)** as
the BLE transport, configured through its **Expo config plugin**, and run the app from a
**custom development build** using **`expo-dev-client`** (never Expo Go).

- Scan with `BleManager.startDeviceScan([SERVICE_CONTROL], …)` and additionally match the
  device name `HWiD`.
- Subscribe to portal events with `monitorCharacteristicForDevice(...)`, which works for
  both `notify` and `indicate` characteristics. Decode each `characteristic.value`
  (base64) to bytes before handing it to the shared protocol parser
  ([ADR-0004](0004-shared-typescript-protocol-package.md)).
- Persist the iOS peripheral UUID / Android MAC to reconnect to "my portal" automatically.

### Required native configuration (via the config plugin)
- iOS `Info.plist`: `NSBluetoothAlwaysUsageDescription` (user-facing reason string).
- iOS background (optional, for keeping a session alive when screen locks):
  `UIBackgroundModes` → `bluetooth-central`.
- Android: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (API 31+), and location handling for
  older API levels, plus runtime permission prompts.

## Consequences

### Positive
- A single BLE API for both platforms; on iOS it is CoreBluetooth under the hood, which is
  the most reliable BLE on the platform.
- The config plugin keeps native `Info.plist`/manifest edits declarative and reproducible
  (no manual Xcode surgery).

### Negative / costs
- **Custom dev client is mandatory** — contributors run `eas build --profile development`
  (or local `expo prebuild` + native build) once, then iterate over the JS bundle as
  usual. Documented in the roadmap and architecture overview.
- The team must handle BLE lifecycle robustly: permission prompts, "Bluetooth off" state,
  scan timeouts, disconnects/auto-reconnect, and base64⇄bytes conversion at the boundary.
- Background execution on iOS is constrained; long unattended sessions need the background
  mode and careful state restoration if we ever want them.

## Alternatives considered

- **`react-native-ble-manager`.** Also mature; API is more imperative/event-emitter based.
  `react-native-ble-plx`'s Promise/Observable API and official Expo plugin fit our shared
  TS parser more cleanly. Acceptable fallback.
- **Expo's first-party BLE module.** No stable, full-featured first-party BLE module
  exists at decision time; community libraries are the standard answer.
- **Web Bluetooth (in a WebView/PWA).** Not viable on iOS (see
  [ADR-0002](0002-adopt-react-native-and-expo.md), alternative D).
