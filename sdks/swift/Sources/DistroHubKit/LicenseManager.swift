import Foundation

public struct LicenseInfo: Equatable, Sendable {
    public let licenseKey: String
    public let email: String
    /// When the offline token expires. The manager refreshes it whenever the app is online.
    public let validUntil: Date
}

public enum LicenseState: Equatable, Sendable {
    case checking
    case unlicensed
    case licensed(LicenseInfo)
}

public enum LicenseError: LocalizedError, Equatable {
    case invalidKey
    case revoked
    case activationLimitReached(String)
    case network
    case server(String)

    public var errorDescription: String? {
        switch self {
        case .invalidKey: return "That license key isn't valid for this app. Check it against your purchase email."
        case .revoked: return "This license key has been revoked."
        case .activationLimitReached(let message): return message
        case .network: return "Couldn't reach the license server. Check your internet connection and try again."
        case .server(let message): return message
        }
    }
}

/// Activates, stores and periodically re-validates a DistroHub license.
///
///     @StateObject var license = LicenseManager(appId: "...", publicKey: "...", storeURL: URL(string: "https://.../apps/my-app")!)
@MainActor
public final class LicenseManager: ObservableObject {
    @Published public private(set) var state: LicenseState = .checking

    public let appId: String
    public let publicKey: String
    /// Store page, opened by the paywall's buy button.
    public let storeURL: URL
    public let apiBaseURL: URL
    /// How long past token expiry the app stays unlocked when it can't reach the server.
    public var offlineGracePeriod: TimeInterval = 7 * 24 * 60 * 60

    private let keychain: Keychain
    private let deviceId: String
    private let session: URLSession

    /// - Parameter apiBaseURL: Defaults to the scheme and host of `storeURL`.
    public init(appId: String, publicKey: String, storeURL: URL, apiBaseURL: URL? = nil, session: URLSession = .shared) {
        self.appId = appId
        self.publicKey = publicKey
        self.storeURL = storeURL
        self.apiBaseURL = apiBaseURL ?? Self.origin(of: storeURL)
        self.session = session
        self.keychain = Keychain(service: "distrohub.\(appId)")
        self.deviceId = Device.id(appId: appId)

        restoreFromKeychain()
        Task { await refresh() }
    }

    public var isLicensed: Bool {
        if case .licensed = state { return true }
        return false
    }

    /// Activates this Mac with a license key. On success the state becomes `.licensed`.
    public func activate(key: String) async throws {
        let key = key.trimmingCharacters(in: .whitespacesAndNewlines)
        let response = try await call("activate", key: key, deviceName: Device.name)
        try store(key: key, token: response.token)
    }

    /// Re-validates with the server and refreshes the offline token. Network failures keep the current state.
    public func refresh() async {
        guard let item = keychain.load() else {
            state = .unlicensed
            return
        }
        do {
            let response = try await call("validate", key: item.licenseKey)
            try store(key: item.licenseKey, token: response.token)
        } catch LicenseError.network, LicenseError.server(_) {
            // Offline or a server hiccup: keep whatever the stored token allows.
            if state == .checking { state = .unlicensed }
        } catch {
            // Revoked, refunded, reset from the dashboard, or not a valid key.
            keychain.delete()
            state = .unlicensed
        }
    }

    /// Frees this Mac's activation slot and locks the app.
    public func deactivate() async {
        if let item = keychain.load() {
            _ = try? await call("deactivate", key: item.licenseKey)
        }
        keychain.delete()
        state = .unlicensed
    }

    // MARK: - Internals

    private func restoreFromKeychain() {
        guard let item = keychain.load(), let payload = verified(item.token),
              Date() < payload.expiresAt.addingTimeInterval(offlineGracePeriod)
        else {
            state = keychain.load() == nil ? .unlicensed : .checking
            return
        }
        state = .licensed(LicenseInfo(licenseKey: item.licenseKey, email: payload.email, validUntil: payload.expiresAt))
    }

    private func verified(_ token: String) -> LicenseTokenPayload? {
        guard let payload = LicenseToken.verify(token, publicKey: publicKey),
              payload.app == appId, payload.dev == deviceId
        else { return nil }
        return payload
    }

    private func store(key: String, token: String) throws {
        guard let payload = verified(token) else {
            throw LicenseError.server("The license server returned a token this app couldn't verify. Check the app's public key.")
        }
        keychain.save(.init(licenseKey: key, token: token))
        state = .licensed(LicenseInfo(licenseKey: key, email: payload.email, validUntil: payload.expiresAt))
    }

    private struct SuccessBody: Decodable { let token: String }
    private struct ErrorBody: Decodable {
        struct Inner: Decodable { let code: String; let message: String }
        let error: Inner
    }

    @discardableResult
    private func call(_ action: String, key: String, deviceName: String? = nil) async throws -> SuccessBody {
        var request = URLRequest(url: apiBaseURL.appendingPathComponent("api/v1/licenses/\(action)"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15
        var body = ["appId": appId, "licenseKey": key, "deviceId": deviceId]
        if let deviceName { body["deviceName"] = deviceName }
        request.httpBody = try JSONEncoder().encode(body)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw LicenseError.network
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if (200..<300).contains(status) {
            if action == "deactivate" { return SuccessBody(token: "") }
            guard let body = try? JSONDecoder().decode(SuccessBody.self, from: data) else {
                throw LicenseError.server("Unexpected response from the license server.")
            }
            return body
        }
        let err = try? JSONDecoder().decode(ErrorBody.self, from: data)
        switch (status, err?.error.code) {
        case (403, _): throw LicenseError.revoked
        case (409, _): throw LicenseError.activationLimitReached(err?.error.message ?? "This key is active on too many devices.")
        case (404, _), (400, _): throw LicenseError.invalidKey
        default: throw LicenseError.server(err?.error.message ?? "The license server returned an error (\(status)).")
        }
    }

    private static func origin(of url: URL) -> URL {
        var components = URLComponents()
        components.scheme = url.scheme
        components.host = url.host
        components.port = url.port
        return components.url ?? url
    }
}
