# Running HotWheelsID on your iPhone (development build)

This guide gets the **mobile app** (`apps/mobile`) onto a physical iPhone or the iOS
Simulator so you can exercise the real UI — and, in a later phase, real Bluetooth.

> **TL;DR.** You already have Xcode, so the fastest, no-cost path is **Path A**
> (`npx expo run:ios --device`). Use **Path B (EAS cloud build)** when you want builds
> without a local toolchain or want to distribute via TestFlight — note the iOS device
> path there needs a **paid Apple Developer account**.

---

## Why not Expo Go?

Expo Go (the App Store client) **cannot** run this app, for two independent reasons:

1. **SDK ceiling.** The project tracks a newer Expo SDK / React Native than the App Store
   build of Expo Go supports, so it reports "you need the latest Expo Go" even when you're
   already on the latest.
2. **Native modules.** The app depends on `react-native-ble-plx` (Bluetooth) and
   `expo-dev-client`, which are *custom native code*. Expo Go only ships Expo's own native
   modules, so it can never load these — see
   [ADR-0003](../adr/0003-ble-react-native-ble-plx.md).

The fix is a **development build** — your own app binary (a "dev client") that bundles the
native modules and loads your JavaScript from Metro. That's what both paths below produce.

---

## Path A — Local build with Xcode (free, recommended to start)

Best when you have a Mac with Xcode (you do). Uses a **free Apple ID** for personal-device
signing. No Expo or paid Apple account required.

### Prerequisites

- macOS with **Xcode** + Command Line Tools (`xcode-select --install`).
- **CocoaPods** for the native dependency install: `brew install cocoapods`
  (one-time; the build's `pod install` step needs it).
- A free **Apple ID** (any Apple account) — *device only; not needed for the Simulator*.
- An **iPhone** connected by USB cable for the first build (trust the computer when
  prompted) — *device only*.
- Dependencies installed once from the repo root: `npm install`.

### Build & run

```bash
cd apps/mobile
npx expo run:ios --device      # pick your iPhone from the list
```

The first run generates the native `ios/` project (Expo "prebuild"/CNG), installs
CocoaPods, compiles, and installs the app on the phone. Subsequent JS changes just need
Metro:

```bash
npx expo start --dev-client    # open the installed HotWheelsID app, not Expo Go
```

### Run on the iOS Simulator (no device, no Apple account)

The Simulator is the fastest way to see the UI — **no iPhone, no Apple ID, and no code
signing**. It's also the cleanest way around the Expo Go "needs latest version" problem,
because `run:ios` installs a real dev client, not Expo Go.

```bash
cd apps/mobile
npm run ios          # alias for `expo run:ios` — builds, boots a Simulator, installs, runs
```

To target a specific simulator, pass its name or UDID:

```bash
npx expo run:ios --device "iPhone 17 Pro"
# list installed simulators with: xcrun simctl list devices available
```

The first build runs prebuild → `pod install` → an Xcode compile (a few minutes), then boots
the Simulator, installs the app, and starts Metro. After that, day-to-day you only need
`npx expo start --dev-client` and press **`i`**. JS/UI edits hot-reload with no rebuild.

> **Simulator limits:** no haptics (no Taptic hardware — `expo-haptics` is a no-op, same as
> web) and **no Bluetooth radio**, so Phase 1 BLE only works on a physical device. The
> Simulator is for UI/animation work (Phase 2 gauge, flame FX, reduce-motion).

### Signing notes

- If CLI signing fails, open the generated workspace in Xcode once and set your **Team** to
  your personal Apple ID, then re-run:
  ```bash
  open ios/HotWheelsID.xcworkspace
  ```
- If the bundle identifier `com.burkben.hotwheelsid` is already taken on your account,
  change `ios.bundleIdentifier` in [`app.json`](../../apps/mobile/app.json) to something
  unique and rebuild.

### Caveats

- **7-day expiry.** Apps signed with a free Apple ID stop launching after 7 days. Re-run
  `npx expo run:ios --device` to refresh. (A paid Apple Developer account removes this.)
- The generated `ios/` directory is disposable and git-ignored — it's regenerated from
  `app.json` + config plugins, so never hand-edit it for permanent changes.

---

## Path B — EAS cloud build (no local toolchain)

Best when you want Expo to build in the cloud (no Xcode dance) or plan to distribute via
TestFlight. Builds run on Expo's servers.

> **iOS device requirement:** installing an EAS build on a *physical* iPhone uses ad-hoc
> provisioning, which requires a **paid Apple Developer Program membership ($99/yr)** so
> EAS can register your device and sign the build. TestFlight likewise needs the paid
> program. If you don't have that yet, use **Path A**, or build the **Simulator** profile
> below (no Apple account needed).

### One-time setup

```bash
npm install -g eas-cli
eas login                       # free Expo account
cd apps/mobile
eas init                        # links the project, writes extra.eas.projectId into app.json
```

Always run `eas` commands from `apps/mobile`. EAS detects the npm workspace and installs
from the repo root automatically; the `@hotwheelsid/protocol` package is consumed as
TypeScript source via Metro, so it needs no separate prebuild.

### Build for a physical iPhone (needs the paid Apple account)

```bash
eas device:create               # register your iPhone's UDID (follow the link/QR once)
eas build --profile development --platform ios
```

When the cloud build finishes, open the build page's QR/link on the phone to install, then:

```bash
npx expo start --dev-client     # serve JS to the installed dev client
```

### Build for the iOS Simulator (no Apple account, no device)

```bash
eas build --profile simulator --platform ios
```

Download the resulting `.app` and drag it onto a booted simulator (you may need to install
an iOS runtime in **Xcode → Settings → Components** first). Then `npx expo start
--dev-client`.

---

## eas.json build profiles

[`apps/mobile/eas.json`](../../apps/mobile/eas.json) defines:

| Profile        | Purpose                                        | Dev client | Target     | Distribution |
| -------------- | ---------------------------------------------- | ---------- | ---------- | ------------ |
| `development`  | Day-to-day dev build for a physical device     | yes        | device     | internal     |
| `simulator`    | Dev build for the iOS Simulator                | yes        | simulator  | internal     |
| `preview`      | Standalone release-style build for testers     | no         | device     | internal     |
| `production`   | Store build (auto-increments the build number) | no         | device     | store        |

`cli.appVersionSource` is `remote`, so EAS manages build numbers for you on the first build.

---

## Which should I use?

- **Today, on your iPhone, for free:** Path A — `npx expo run:ios --device`.
- **No Mac toolchain / want TestFlight, have the paid Apple account:** Path B development or
  preview profile.
- **No device and no Apple account:** Path A on the **iOS Simulator** (`npm run ios`) — fast
  and free for all UI work. The Path B `simulator` profile (cloud build) or the web preview
  (`npx expo start --web`) are alternatives.

Bluetooth (Phase 1) only works in a real dev build on a physical device — the Simulator and
web have no BLE radio.
