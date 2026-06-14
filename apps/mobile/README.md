# @hotwheelsid/mobile

Cross-platform (iOS-first) Expo app for the Hot Wheels id Race Portal.

> **Phase 0 status:** scaffold only. This app currently renders a single
> placeholder screen that imports `@hotwheelsid/protocol` to prove the
> monorepo workspace link. BLE and UI features land in later phases
> (see `docs/ROADMAP.md`).

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

Because this app uses native modules (`react-native-ble-plx`,
`expo-dev-client`), Expo Go will not work for BLE. Build a custom dev client
on a Mac with Xcode:

```bash
cd apps/mobile
npx expo run:ios       # or: npx expo prebuild && open the generated workspace
```

## Notes

- `metro.config.js` is configured for the monorepo so Metro can transpile the
  TypeScript `@hotwheelsid/protocol` package directly from source.
- The `react-native-ble-plx` config plugin and the iOS
  `NSBluetoothAlwaysUsageDescription` string are wired in `app.json`, but **no
  BLE logic is implemented yet** (Phase 1).
- `expo-env.d.ts` and the `ios/` / `android/` folders are generated and
  git-ignored; run `npx expo prebuild` to (re)create the native projects.
