import DeviceActivity
import Foundation
import ManagedSettings

// Target: "Device Activity Monitor Extension". Runs in its own process, even
// when the app is closed or killed, and lifts the shield when the session ends.
//
// This file is self-contained on purpose: the extension target only needs this
// one file. Keep these two values in sync with FocusShared.swift.
private let storeName = "focus"
private let appGroup = "group.com.anonymous.ballnchain"

class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    ManagedSettingsStore(named: .init(storeName)).clearAllSettings()
    UserDefaults(suiteName: appGroup)?.removeObject(forKey: "sessionEndsAt")
  }
}
