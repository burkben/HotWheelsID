// Redline ID — external display (TV) support.
//
// Captures the app's `ExpoReactDelegate` the one time Expo asks a handler
// whether it wants to build the main root view. We always decline (return nil),
// but keeping the delegate gives `ExternalDisplayController` a supported way to
// ask for *additional* React surfaces later, when a TV shows up.
//
// The alternative — reaching into `UIApplication.shared.delegate` for its
// `reactNativeFactory` — depends on the shape of the prebuild-generated
// AppDelegate, which is regenerated on every `expo prebuild`. This hook is
// public Expo API and is registered from `expo-module.config.json`, so it
// survives regeneration untouched.

import ExpoModulesCore
import UIKit

public final class ExternalDisplayReactDelegateHandler: ExpoReactDelegateHandler {
  public override func createReactRootView(
    reactDelegate: ExpoReactDelegate,
    moduleName: String,
    initialProperties: [AnyHashable: Any]?,
    launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> UIView? {
    ExternalDisplayController.shared.adopt(reactDelegate: reactDelegate)
    // Decline: we only wanted the delegate reference, not to own the main window.
    return nil
  }
}
