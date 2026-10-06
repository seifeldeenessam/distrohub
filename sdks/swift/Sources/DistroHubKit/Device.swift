import CryptoKit
import Foundation
import IOKit

enum Device {
    /// Stable, anonymous id for this Mac: SHA-256 of the hardware UUID salted with the app id,
    /// so the same Mac can't be correlated across apps.
    static func id(appId: String) -> String {
        let hardware = platformUUID() ?? fallbackID()
        let digest = SHA256.hash(data: Data("\(appId):\(hardware)".utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    static var name: String {
        Host.current().localizedName ?? "Mac"
    }

    private static func platformUUID() -> String? {
        let service = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("IOPlatformExpertDevice"))
        guard service != 0 else { return nil }
        defer { IOObjectRelease(service) }
        return IORegistryEntryCreateCFProperty(service, "IOPlatformUUID" as CFString, kCFAllocatorDefault, 0)?
            .takeRetainedValue() as? String
    }

    /// Used only if IOKit lookup fails: a random id persisted in UserDefaults.
    private static func fallbackID() -> String {
        let key = "DistroHubKit.fallbackDeviceID"
        if let existing = UserDefaults.standard.string(forKey: key) { return existing }
        let id = UUID().uuidString
        UserDefaults.standard.set(id, forKey: key)
        return id
    }
}
