// Redline ID — external display (TV) support.
//
// The JS-facing surface: reports whether a TV is attached and emits a change
// event so the app can badge "on TV". All the real work happens in
// `ExternalDisplayController`, which is started from the React delegate handler
// at launch so a TV attached before the first JS import is still picked up.

import ExpoModulesCore

public class ExternalDisplayModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExternalDisplay")

    Events("onDisplayChange")

    OnCreate {
      ExternalDisplayController.shared.onChange = { [weak self] state in
        self?.sendEvent("onDisplayChange", Self.payload(for: state))
      }
    }

    OnDestroy {
      ExternalDisplayController.shared.onChange = nil
    }

    Function("getDisplayInfo") { () -> [String: Any] in
      Self.payload(for: ExternalDisplayController.shared.state)
    }
  }

  private static func payload(for state: ExternalDisplayState) -> [String: Any] {
    return [
      "connected": state.connected,
      "supported": true,
      "width": Double(state.width),
      "height": Double(state.height),
      "name": state.name as Any
    ]
  }
}
