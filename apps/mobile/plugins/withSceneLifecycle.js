// iOS 27 terminates apps that don't adopt the UIScene life cycle. Expo SDK 57 ships
// `ExpoAppSceneDelegate`, but the prebuild template doesn't wire it in yet. This plugin:
//  - adds a UIApplicationSceneManifest to Info.plist pointing at EXExpoAppSceneDelegate
//  - makes AppDelegate an ExpoReactNativeFactoryProvider and stops it from creating the
//    window / starting React Native itself (the scene delegate does that instead)
// Remove once the Expo template does this by default.
const { withInfoPlist, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withSceneManifest = (config) =>
  withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return c;
  });

const WINDOW_BLOCK = /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n[^)]*\)\n#endif\n\n?/;

const withAppDelegate = (config) =>
  withDangerousMod(config, [
    'ios',
    (c) => {
      const file = path.join(
        c.modRequest.platformProjectRoot,
        c.modRequest.projectName,
        'AppDelegate.swift'
      );
      let src = fs.readFileSync(file, 'utf8');
      if (!src.includes('ExpoReactNativeFactoryProvider')) {
        src = src.replace(
          'class AppDelegate: ExpoAppDelegate {',
          'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
        );
        if (!WINDOW_BLOCK.test(src)) {
          throw new Error(
            'withSceneLifecycle: could not find the window/startReactNative block in AppDelegate.swift; the Expo template has changed.'
          );
        }
        src = src.replace(WINDOW_BLOCK, '');
        fs.writeFileSync(file, src);
      }
      return c;
    },
  ]);

module.exports = (config) => withAppDelegate(withSceneManifest(config));
