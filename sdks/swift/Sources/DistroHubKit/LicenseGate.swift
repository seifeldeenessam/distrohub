import SwiftUI

/// Shows `content` when the app is licensed, and the paywall otherwise.
///
///     LicenseGate(manager: license) { ContentView() }
public struct LicenseGate<Content: View>: View {
    @ObservedObject private var manager: LicenseManager
    private let content: () -> Content

    public init(manager: LicenseManager, @ViewBuilder content: @escaping () -> Content) {
        _manager = ObservedObject(wrappedValue: manager)
        self.content = content
    }

    public var body: some View {
        switch manager.state {
        case .checking:
            ProgressView().frame(minWidth: 420, minHeight: 300)
        case .unlicensed:
            PaywallView(manager: manager)
        case .licensed:
            content()
        }
    }
}

/// Default paywall: license key field, activate button and a link to the store page.
public struct PaywallView: View {
    @ObservedObject private var manager: LicenseManager
    @State private var key = ""
    @State private var error: String?
    @State private var working = false

    public init(manager: LicenseManager) {
        _manager = ObservedObject(wrappedValue: manager)
    }

    private var appName: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
            ?? Bundle.main.object(forInfoDictionaryKey: "CFBundleName") as? String
            ?? "this app"
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Activate \(appName)").font(.title2.bold())
            Text("Paste the license key from your purchase email.")
                .foregroundStyle(.secondary)

            TextField("XXXXX-XXXXX-XXXXX-XXXXX-XXXXX", text: $key)
                .textFieldStyle(.roundedBorder)
                .font(.system(.body, design: .monospaced))
                .onSubmit(activate)
                .disabled(working)

            if let error {
                Text(error).foregroundStyle(.red).font(.callout)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack {
                Link("Buy a license", destination: manager.storeURL)
                Spacer()
                if working { ProgressView().controlSize(.small) }
                Button("Activate", action: activate)
                    .keyboardShortcut(.defaultAction)
                    .disabled(key.trimmingCharacters(in: .whitespaces).isEmpty || working)
            }
        }
        .padding(28)
        .frame(width: 440)
    }

    private func activate() {
        guard !working else { return }
        working = true
        error = nil
        Task {
            defer { working = false }
            do {
                try await manager.activate(key: key)
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}
