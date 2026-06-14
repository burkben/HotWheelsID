# 8. iOS distribution via EAS Build + TestFlight

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0002](0002-adopt-react-native-and-expo.md), [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md)

## Context

"Installable on iOS" is an explicit goal. Because the app uses a native BLE module, it
**cannot** run in Expo Go and must be built into a real native binary. We need a build and
distribution path that works without a deep manual Xcode workflow, and that covers three
audiences: the developer's own device, a few friends/family testers, and (optionally) the
public.

Apple's constraints shape this:

- Installing any iOS app on a physical device requires **code signing** with an Apple
  account.
- A **free Apple ID** can sign a development build onto a personally owned device, but it
  **expires after 7 days** and is limited in device count.
- A **paid Apple Developer Program** membership ($99/yr) is required for **TestFlight**
  (up to 90-day builds, up to 100 internal + 10,000 external testers) and App Store
  release.

## Decision

Use **Expo Application Services (EAS) Build** with three profiles in `eas.json`:

- **`development`** — a custom **dev client** (`expo-dev-client`) containing the BLE native
  module; used for day-to-day development with fast JS reloads.
- **`preview`** — internal distribution builds (ad-hoc / TestFlight internal) for testing
  on real devices by the developer and a few testers.
- **`production`** — store-ready builds for **TestFlight** and, if ever desired, the App
  Store.

Primary distribution to testers is **TestFlight** (requires the paid program). For the
developer's own device pre-enrollment, a free-Apple-ID development build (7-day) is an
acceptable stop-gap. Android distribution uses EAS `preview`/`production` APKs/AABs and
internal app sharing.

`app.json`/`app.config.ts` will declare the BLE usage strings and (optionally) the
`bluetooth-central` background mode via the `react-native-ble-plx` config plugin
([ADR-0003](0003-bluetooth-with-react-native-ble-plx.md)).

## Consequences

### Positive
- Reproducible cloud builds without bespoke local Xcode/Gradle setup.
- A clear ladder: dev client → internal preview → TestFlight → (optional) App Store.
- Same tooling produces Android builds.

### Negative / costs
- **TestFlight requires the $99/yr Apple Developer Program.** Documented as a prerequisite
  for the iOS distribution milestone; the free-ID 7-day path covers solo dev meanwhile.
- EAS cloud builds have queue/usage limits on the free tier; local builds remain possible.
- App Store review (only if we ever publish publicly) brings trademark considerations —
  this is an unofficial, Mattel-unaffiliated project (see README disclaimer); TestFlight/
  internal distribution avoids that entirely.

## Alternatives considered

- **Local `expo prebuild` + Xcode/Gradle builds.** Fully supported and free, but more
  manual and machine-specific; we keep it as a fallback, not the default.
- **Sideloading tools (e.g. AltStore).** Works for personal use but is fiddly and not a
  good story for sharing with family; TestFlight is cleaner once enrolled.
- **PWA "Add to Home Screen."** Looks installable but cannot access BLE on iOS — fails the
  core requirement (see [ADR-0002](0002-adopt-react-native-and-expo.md)).
