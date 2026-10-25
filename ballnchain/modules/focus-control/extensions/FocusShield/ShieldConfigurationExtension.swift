import ManagedSettings
import ManagedSettingsUI
import UIKit

// Target: "Shield Configuration Extension". Controls the screen shown when the
// user opens a blocked app or site.
private let appGroup = "group.com.anonymous.ballnchain"

class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  private func shield() -> ShieldConfiguration {
    var subtitle = "You're in a focus session."
    let t = UserDefaults(suiteName: appGroup)?.double(forKey: "sessionEndsAt") ?? 0
    if t > 0 {
      let end = Date(timeIntervalSince1970: t)
      subtitle = "Locked in until \(end.formatted(date: .omitted, time: .shortened))."
    }
    return ShieldConfiguration(
      backgroundBlurStyle: .systemMaterialDark,
      backgroundColor: UIColor(red: 0.13, green: 0.83, blue: 0.93, alpha: 0.9),
      title: .init(text: "Stay focused", color: .white),
      subtitle: .init(text: subtitle, color: UIColor.white.withAlphaComponent(0.85)),
      primaryButtonLabel: .init(text: "Back to work", color: .white),
      primaryButtonBackgroundColor: UIColor(red: 0.03, green: 0.57, blue: 0.70, alpha: 1)
    )
  }

  override func configuration(shielding application: Application) -> ShieldConfiguration { shield() }
  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration { shield() }
  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration { shield() }
  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration { shield() }
}
