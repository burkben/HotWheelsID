// Redline ID — external display (TV) support.
//
// iOS only gives an app a *dedicated* external screen (rather than mirroring the
// device) when the app opts into scenes via `UIApplicationSupportsMultipleScenes`
// and a scene with the `.windowExternalDisplayNonInteractive` role connects.
// This controller waits for exactly that scene and mounts a second React surface
// ("RedlineTV") into a window on it, so the TV renders its own big-screen UI
// while the device keeps showing the normal app.
//
// The second surface is created on the app's existing RCTHost, so it shares one
// JavaScript runtime with the main UI. That is what makes the TV live for free:
// the Zustand stores are module singletons in that runtime, so a pass recorded
// on the phone re-renders the TV in the same tick.
//
// Opting into scenes also unlocks iPad multi-window as a side effect. Rather
// than leave a second app window blank (React Native only attaches its root view
// to the app delegate's window), any extra application-role scene gets the same
// TV stage — a genuinely useful second window for a race night.

import ExpoModulesCore
import UIKit

/// Why a given window is showing the TV stage.
enum ExternalDisplayKind: String {
  /// A real TV over AirPlay or a cable.
  case external
  /// An extra iPad window the user opened alongside the main one.
  case window
}

struct ExternalDisplayState {
  var connected = false
  var width: CGFloat = 0
  var height: CGFloat = 0
  var name: String?

  static let disconnected = ExternalDisplayState()
}

final class ExternalDisplayController {
  static let shared = ExternalDisplayController()

  /// Notified whenever a TV attaches or detaches, so JS can badge the UI.
  var onChange: ((ExternalDisplayState) -> Void)?

  private var reactDelegate: ExpoReactDelegate?
  private var windows: [ObjectIdentifier: UIWindow] = [:]
  /// Scenes that connected before React Native was ready, replayed on `adopt`.
  private var pendingScenes: [UIWindowScene] = []
  private var observing = false
  private(set) var state: ExternalDisplayState = .disconnected

  private init() {}

  // MARK: - Wiring

  /// Called from `ExternalDisplayReactDelegateHandler` as the main root view is
  /// built, which is the earliest point a React surface can be requested.
  func adopt(reactDelegate: ExpoReactDelegate) {
    self.reactDelegate = reactDelegate
    startObserving()

    // A TV that was already attached at launch connects its scene before the
    // React host exists. Those scenes were parked; mount them now.
    let parked = pendingScenes
    pendingScenes.removeAll()
    for scene in parked where scene.session.role == .windowExternalDisplayNonInteractive {
      mount(on: scene, kind: .external)
    }
  }

  private func startObserving() {
    guard !observing else { return }
    observing = true
    let center = NotificationCenter.default
    center.addObserver(
      self, selector: #selector(sceneWillConnect(_:)),
      name: UIScene.willConnectNotification, object: nil)
    center.addObserver(
      self, selector: #selector(sceneDidDisconnect(_:)),
      name: UIScene.didDisconnectNotification, object: nil)
  }

  // MARK: - Scene lifecycle

  @objc private func sceneWillConnect(_ note: Notification) {
    guard let scene = note.object as? UIWindowScene else { return }

    switch scene.session.role {
    case .windowExternalDisplayNonInteractive:
      guard reactDelegate != nil else {
        // React Native has not started yet (TV attached before launch finished).
        pendingScenes.append(scene)
        return
      }
      mount(on: scene, kind: .external)

    case .windowApplication:
      // UIKit hands the app delegate's window to the *first* application scene,
      // but not until after this notification, so the check has to wait a turn
      // of the run loop. A scene that still has no window by then is a genuine
      // extra iPad window and would otherwise render black.
      DispatchQueue.main.async { [weak self, weak scene] in
        guard let self, let scene, scene.windows.isEmpty else { return }
        self.mount(on: scene, kind: .window)
      }

    default:
      break
    }
  }

  @objc private func sceneDidDisconnect(_ note: Notification) {
    guard let scene = note.object as? UIWindowScene else { return }
    let key = ObjectIdentifier(scene)
    guard let window = windows.removeValue(forKey: key) else { return }
    window.isHidden = true
    if scene.session.role == .windowExternalDisplayNonInteractive {
      publish(.disconnected)
    }
  }

  // MARK: - Mounting

  private func mount(on scene: UIWindowScene, kind: ExternalDisplayKind) {
    let key = ObjectIdentifier(scene)
    guard windows[key] == nil, let reactDelegate else { return }

    let rootView = reactDelegate.createReactRootView(
      moduleName: ExternalDisplayController.tvModuleName,
      initialProperties: ["kind": kind.rawValue],
      launchOptions: nil
    )

    let controller = UIViewController()
    controller.view.backgroundColor = .black
    rootView.frame = controller.view.bounds
    rootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    rootView.backgroundColor = .black
    controller.view.addSubview(rootView)

    let window = UIWindow(windowScene: scene)
    window.backgroundColor = .black
    window.rootViewController = controller
    window.isHidden = false
    windows[key] = window

    if kind == .external {
      // Read the size off the window rather than `scene.screen`, which is
      // deprecated from iOS 16 and reports the raw panel instead of the area the
      // app actually gets.
      publish(ExternalDisplayState(
        connected: true,
        width: window.bounds.width,
        height: window.bounds.height,
        name: scene.title
      ))
    }
  }

  private func publish(_ next: ExternalDisplayState) {
    state = next
    onChange?(next)
  }

  /// Must match the component registered with `AppRegistry` in `index.js`.
  static let tvModuleName = "RedlineTV"
}
