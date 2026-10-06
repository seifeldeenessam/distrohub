import CryptoKit
import Foundation

/// Payload of the signed token returned by `/api/v1/licenses/activate` and `/validate`.
public struct LicenseTokenPayload: Codable, Equatable, Sendable {
    public let v: Int
    /// License id
    public let lid: String
    public let app: String
    /// Device id the token is bound to
    public let dev: String
    public let email: String
    public let iat: TimeInterval
    public let exp: TimeInterval

    public var expiresAt: Date { Date(timeIntervalSince1970: exp) }
}

enum LicenseToken {
    /// Verifies `base64url(payload).base64url(ed25519 signature)` against the app's public key.
    static func verify(_ token: String, publicKey: String) -> LicenseTokenPayload? {
        let parts = token.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 2,
              let payload = Data(base64URLEncoded: String(parts[0])),
              let signature = Data(base64URLEncoded: String(parts[1])),
              let rawKey = Data(base64Encoded: publicKey),
              let key = try? Curve25519.Signing.PublicKey(rawRepresentation: rawKey),
              key.isValidSignature(signature, for: payload)
        else { return nil }
        return try? JSONDecoder().decode(LicenseTokenPayload.self, from: payload)
    }
}

extension Data {
    init?(base64URLEncoded string: String) {
        var base64 = string.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        base64 += String(repeating: "=", count: (4 - base64.count % 4) % 4)
        self.init(base64Encoded: base64)
    }
}
