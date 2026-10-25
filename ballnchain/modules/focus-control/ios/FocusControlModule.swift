import Combine
import ExpoModulesCore
import FamilyControls

public final class FocusControlModule: Module {
  private var authSubscription: AnyCancellable?

  public func definition() -> ModuleDefinition {
    Name("FocusControl")

    Events("onAuthorizationChange")

    OnCreate { self.startObserving() }

    OnDestroy { self.authSubscription?.cancel() }

    OnAppEntersForeground { FocusController.shared.reconcile() }

    // "approved" | "denied" | "notDetermined" | "unknown"
    Function("getAuthorizationStatus") { () -> String in
      FocusController.shared.authorizationStatus
    }

    AsyncFunction("requestAuthorization") { () async throws -> String in
      try await FocusController.shared.requestAuthorization()
    }

    // Presents the system app/category/website picker. Resolves with how many
    // of each were chosen; iOS never reveals which apps they are.
    AsyncFunction("pickAppsToBlock") { () async -> [String: Int] in
      await Self.pickApps()
    }

    Function("getSelectionSummary") { () -> [String: Int] in
      FocusController.summary(of: FocusController.shared.loadSelection())
    }

    // endsAt: epoch milliseconds.
    AsyncFunction("startBlocking") { (endsAt: Double) throws in
      try FocusController.shared.startBlocking(until: Date(timeIntervalSince1970: endsAt / 1000))
    }

    AsyncFunction("stopBlocking") { () in
      FocusController.shared.stopBlocking()
    }

    Function("consumeShieldDropped") { () -> Bool in
      FocusController.shared.consumeShieldDropped()
    }

    Function("getBlockingState") { () -> [String: Any] in
      Self.blockingState()
    }

    // Resolves { name, phoneNumber } or null if the user cancels.
    AsyncFunction("pickContact") { () async -> [String: String]? in
      await Self.pickContact()
    }
  }

  private func startObserving() {
    // Lift an expired shield / restore a live one whenever the app starts.
    FocusController.shared.reconcile()
    authSubscription = FocusController.shared.authorizationChanges()
      .dropFirst()
      .receive(on: DispatchQueue.main)
      .sink { [weak self] status in
        self?.sendEvent("onAuthorizationChange", ["status": status])
      }
  }

  @MainActor
  private static func pickApps() async -> [String: Int] {
    let selection = await AppPicker.pick() ?? FocusController.shared.loadSelection()
    return FocusController.summary(of: selection)
  }

  private static func blockingState() -> [String: Any] {
    let endsAt: Any = FocusShared.sessionEndsAt.map { $0.timeIntervalSince1970 * 1000 } ?? NSNull()
    return ["active": FocusController.shared.isBlocking, "endsAt": endsAt]
  }

  @MainActor
  private static func pickContact() async -> [String: String]? {
    await ContactPicker.pick()?.dictionary
  }
}
