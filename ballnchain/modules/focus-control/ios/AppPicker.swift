import FamilyControls
import SwiftUI
import UIKit

private struct AppPickerView: View {
  @State var selection: FamilyActivitySelection
  let onDone: (FamilyActivitySelection) -> Void

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Apps to block")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") { onDone(selection) }
          }
        }
    }
  }
}

/// Presents Apple's FamilyActivityPicker. The picker returns opaque tokens, so
/// the app never learns which apps were chosen, only how many.
@MainActor
public enum AppPicker {
  /// Saves and returns the chosen selection, or nil if nothing could be presented.
  public static func pick() async -> FamilyActivitySelection? {
    guard let presenter = UIViewController.topMost else { return nil }
    return await withCheckedContinuation { continuation in
      var host: UIHostingController<AppPickerView>?
      host = UIHostingController(
        rootView: AppPickerView(selection: FocusController.shared.loadSelection()) { selection in
          try? FocusController.shared.saveSelection(selection)
          host?.dismiss(animated: true) { continuation.resume(returning: selection) }
        }
      )
      // Force the Done button so the continuation always resumes.
      host?.isModalInPresentation = true
      presenter.present(host!, animated: true)
    }
  }
}
