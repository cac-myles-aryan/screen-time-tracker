import Foundation

/// Constants shared by the app and the DeviceActivity / ShieldConfiguration
/// extensions. Extensions run in separate processes, so anything they need to
/// know has to live in the App Group container.
///
/// The App Group must be enabled (same id) on the app target and on both
/// extension targets. Change `appGroup` if your bundle id differs.
public enum FocusShared {
  public static let appGroup = "group.com.anonymous.ballnchain"

  /// Name of the ManagedSettingsStore that holds every restriction we apply.
  /// Extensions open the same named store to lift the restrictions.
  public static let storeName = "focus"

  /// DeviceActivity name of the one running session.
  public static let activityName = "focus-session"

  enum Key {
    static let selection = "familyActivitySelection"
    static let sessionEndsAt = "sessionEndsAt"
    static let shieldDropped = "shieldDropped"
  }

  public static var defaults: UserDefaults {
    UserDefaults(suiteName: appGroup) ?? .standard
  }

  /// When the running session ends, or nil if none is recorded as active.
  public static var sessionEndsAt: Date? {
    let t = defaults.double(forKey: Key.sessionEndsAt)
    return t > 0 ? Date(timeIntervalSince1970: t) : nil
  }
}
