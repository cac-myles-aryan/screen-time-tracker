import Contacts
import ContactsUI
import UIKit

public struct PickedContact {
  public let name: String
  public let phoneNumber: String

  public var dictionary: [String: String] {
    ["name": name, "phoneNumber": phoneNumber]
  }
}

/// Presents the system contact picker listing phone numbers. The system picker
/// runs out of process, so no Contacts permission or usage string is needed and
/// the app only ever sees the one number the user taps.
public final class ContactPicker: NSObject, CNContactPickerDelegate {
  private var continuation: CheckedContinuation<PickedContact?, Never>?
  // Keeps the delegate alive while the picker is on screen.
  private static var current: ContactPicker?

  /// Returns nil if the user cancels or no screen can present the picker.
  @MainActor
  public static func pick() async -> PickedContact? {
    guard let presenter = UIViewController.topMost else { return nil }
    let picker = ContactPicker()
    current = picker
    defer { current = nil }
    return await picker.present(from: presenter)
  }

  @MainActor
  private func present(from presenter: UIViewController) async -> PickedContact? {
    await withCheckedContinuation { continuation in
      self.continuation = continuation
      let vc = CNContactPickerViewController()
      vc.delegate = self
      vc.displayedPropertyKeys = [CNContactPhoneNumbersKey]
      vc.predicateForEnablingContact = NSPredicate(format: "phoneNumbers.@count > 0")
      presenter.present(vc, animated: true)
    }
  }

  public func contactPicker(_ picker: CNContactPickerViewController, didSelect property: CNContactProperty) {
    guard let number = property.value as? CNPhoneNumber else { return finish(nil) }
    let contact = property.contact
    let name = CNContactFormatter.string(from: contact, style: .fullName) ?? number.stringValue
    finish(PickedContact(name: name, phoneNumber: number.stringValue))
  }

  public func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
    finish(nil)
  }

  private func finish(_ result: PickedContact?) {
    continuation?.resume(returning: result)
    continuation = nil
  }
}

extension UIViewController {
  /// The view controller currently on top of the key window.
  static var topMost: UIViewController? {
    let scene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }
    var top = scene?.keyWindow?.rootViewController
    while let presented = top?.presentedViewController { top = presented }
    return top
  }
}
