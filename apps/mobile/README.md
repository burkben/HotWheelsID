# Redline ID — mobile app

Cross-platform (iOS-first) Expo app for the Hot Wheels id Race Portal.

It connects to a real portal over Bluetooth and turns each pass into live telemetry on a custom
speedometer, a lap-timing **Race Mode**, and a raw decoded event log. All decoding runs through
the shared [`@redlineid/protocol`](../../packages/protocol/) package, which speaks both the
legacy open control service and the modern encrypted **MPID** firmware.

> 📸 Screenshots and the full feature tour live in the [repo README](../../README.md#ios-app).

## Screens

- **`index`** — Speedometer (home). Live BLE passes drive the needle (scale mph) with best
  speed, pass count, and a recent-pass log. A **Live BLE / Demo** toggle runs simulated passes
  when no portal is around.
- **`race`** — Race Mode. Pick 5 / 10 / 15 / 20 laps, a 3·2·1 countdown arms the race, and each
  pass closes a lap; ends with a results breakdown and a session leaderboard. (Port of
  `python/race_mode.py`.)
- **`live`** — Raw decoded BLE event log, parity with `python/monitor.py`.

## Run

From the **repo root** (installs every workspace):

```bash
npm install
```

Then start Metro:

```bash
npm run start --workspace mobile
# or: cd apps/mobile && npx expo start
```

**Preview in a browser** (fastest, no device/Xcode — runs the home screen in demo mode):

```bash
cd apps/mobile && npx expo start --web
```

**Run on an iPhone.** This app ships native modules (`react-native-ble-plx`,
`expo-dev-client`), so Expo Go won't work — you need a **development build**. On a Mac with
Xcode:

```bash
cd apps/mobile
npx expo run:ios --device     # local dev build on a free Apple ID, installs on the phone
```

See the full runbook (EAS cloud builds, Simulator profile, signing) in
[`docs/guides/ios-dev-build.md`](../../docs/guides/ios-dev-build.md).

## Notes

- `metro.config.js` is configured for the monorepo so Metro can transpile the
  TypeScript `@redlineid/protocol` package directly from source.
- The `react-native-ble-plx` config plugin and the iOS
  `NSBluetoothAlwaysUsageDescription` string are wired in `app.json`. The native BLE module is
  only `require`d once a connection starts on a real device, so web/Simulator export stays safe
  (those targets have no BLE radio).
- `expo-env.d.ts` and the `ios/` / `android/` folders are generated and
  git-ignored; run `npx expo prebuild` to (re)create the native projects.
