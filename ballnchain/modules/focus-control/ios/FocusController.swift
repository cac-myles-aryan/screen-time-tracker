import Combine
import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

public enum FocusError: LocalizedError {
  case notAuthorized
  case nothingSelected
  case sessionTooShort
  case sessionInPast

  public var errorDescription: String? {
    switch self {
    case .notAuthorized: return "Screen Time access hasn't been granted."
    case .nothingSelected: return "Pick at least one app, category or website to block."
    case .sessionTooShort: return "iOS only supports focus sessions of 15 minutes or longer."
    case .sessionInPast: return "The session end time has already passed."
    }
  }
}

/// All Screen Time logic with no React Native / Expo dependency.
public final class FocusController {
  public static let shared = FocusController()

  private let store = ManagedSettingsStore(named: .init(FocusShared.storeName))
  private let center = DeviceActivityCenter()

  /// iOS rejects DeviceActivity intervals shorter than this.
  public static let minimumSession: TimeInterval = 15 * 60

  private init() {}

  // MARK: Authorization

  public var authorizationStatus: String {
    Self.name(of: AuthorizationCenter.shared.authorizationStatus)
  }

  /// Presents the system Screen Time prompt (Face ID / passcode). Throws if the
  /// user declines or the entitlement is missing.
  @discardableResult
  public func requestAuthorization() async throws -> String {
    try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
    return authorizationStatus
  }

  /// Emits the new status every time the user changes it, including turning
  /// Screen Time access off in Settings while the app is alive.
  public func authorizationChanges() -> AnyPublisher<String, Never> {
    AuthorizationCenter.shared.$authorizationStatus
      .removeDuplicates()
      .map(Self.name(of:))
      .eraseToAnyPublisher()
  }

  // iOS 26 added `.approvedWithDataAccess`. It is matched by name so this file
  // still builds on older SDKs; both count as approved.
  private static func isApproved(_ status: AuthorizationStatus) -> Bool {
    status == .approved || "\(status)" == "approvedWithDataAccess"
  }

  private static func name(of status: AuthorizationStatus) -> String {
    if isApproved(status) { return "approved" }
    switch status {
    case .denied: return "denied"
    case .notDetermined: return "notDetermined"
    default: return "unknown"
    }
  }

  // MARK: Selection

  public func loadSelection() -> FamilyActivitySelection {
    guard
      let data = FocusShared.defaults.data(forKey: FocusShared.Key.selection),
      let selection = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
    else { return FamilyActivitySelection() }
    return selection
  }

  public func saveSelection(_ selection: FamilyActivitySelection) throws {
    let data = try PropertyListEncoder().encode(selection)
    FocusShared.defaults.set(data, forKey: FocusShared.Key.selection)
  }

  public static func summary(of selection: FamilyActivitySelection) -> [String: Int] {
    [
      "applications": selection.applicationTokens.count,
      "categories": selection.categoryTokens.count,
      "webDomains": selection.webDomainTokens.count,
    ]
  }

  // MARK: Blocking

  public var isBlocking: Bool {
    guard let end = FocusShared.sessionEndsAt else { return false }
    return end > Date()
  }

  /// Shields the saved selection until `endsAt`. The shield is lifted by the
  /// DeviceActivityMonitor extension at the end of the interval, so it still
  /// ends on time if this app is killed.
  public func startBlocking(until endsAt: Date) throws {
    guard Self.isApproved(AuthorizationCenter.shared.authorizationStatus) else {
      throw FocusError.notAuthorized
    }
    let duration = endsAt.timeIntervalSinceNow
    guard duration > 0 else { throw FocusError.sessionInPast }
    guard duration >= Self.minimumSession else { throw FocusError.sessionTooShort }

    let selection = loadSelection()
    guard
      !selection.applicationTokens.isEmpty
        || !selection.categoryTokens.isEmpty
        || !selection.webDomainTokens.isEmpty
    else { throw FocusError.nothingSelected }

    // Schedule first so a failure leaves nothing shielded without an end.
    let calendar = Calendar.current
    let parts: Set<Calendar.Component> = [.calendar, .year, .month, .day, .hour, .minute, .second]
    let schedule = DeviceActivitySchedule(
      intervalStart: calendar.dateComponents(parts, from: Date()),
      intervalEnd: calendar.dateComponents(parts, from: endsAt),
      repeats: false
    )
    let name = DeviceActivityName(FocusShared.activityName)
    center.stopMonitoring([name])
    try center.startMonitoring(name, during: schedule)

    FocusShared.defaults.set(endsAt.timeIntervalSince1970, forKey: FocusShared.Key.sessionEndsAt)
    applyShield(selection)
  }

  /// Lifts every restriction and ends monitoring.
  public func stopBlocking() {
    center.stopMonitoring([DeviceActivityName(FocusShared.activityName)])
    store.clearAllSettings()
    FocusShared.defaults.removeObject(forKey: FocusShared.Key.sessionEndsAt)
  }

  /// Call on launch / foreground. Lifts a shield whose end time has passed
  /// (e.g. the extension never got to run) and re-applies one that should
  /// still be active.
  public func reconcile() {
    guard let end = FocusShared.sessionEndsAt else { return }
    if end <= Date() {
      stopBlocking()
    } else if Self.isApproved(AuthorizationCenter.shared.authorizationStatus) {
      // Someone lifted the shield mid-session (or the system did). Remember it
      // so JS can tell the accountability contact, then put it back.
      if !isShieldIntact() {
        FocusShared.defaults.set(true, forKey: FocusShared.Key.shieldDropped)
      }
      applyShield(loadSelection())
    }
  }

  /// True once if the shield had to be re-applied since the last call.
  public func consumeShieldDropped() -> Bool {
    let dropped = FocusShared.defaults.bool(forKey: FocusShared.Key.shieldDropped)
    FocusShared.defaults.removeObject(forKey: FocusShared.Key.shieldDropped)
    return dropped
  }

  private func isShieldIntact() -> Bool {
    let selection = loadSelection()
    if !selection.applicationTokens.isEmpty && store.shield.applications == nil { return false }
    if !selection.categoryTokens.isEmpty && store.shield.applicationCategories == nil { return false }
    if !selection.webDomainTokens.isEmpty && store.shield.webDomains == nil { return false }
    return store.application.denyAppRemoval == true
  }

  private func applyShield(_ selection: FamilyActivitySelection) {
    store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
    store.shield.applicationCategories =
      selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
    store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
    store.shield.webDomainCategories =
      selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
    // Hides the delete (X) option on the home screen so the app can't be
    // removed mid-session.
    store.application.denyAppRemoval = true
    // Close the easy ways out of a session: signing into another account,
    // changing the passcode, or rolling the clock past the end time.
    store.account.lockAccounts = true
    store.passcode.lockPasscode = true
    store.dateAndTime.requireAutomaticDateAndTime = true
  }
}
