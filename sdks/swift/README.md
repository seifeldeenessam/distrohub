# DistroHubKit

License activation and paywall for macOS apps sold on DistroHub.

## Install

Xcode → File → Add Package Dependencies → add this repository, product `DistroHubKit`
(or a local path: `sdks/swift`). macOS 12+.

The app needs the **Outgoing Connections (Client)** entitlement (`com.apple.security.network.client`) if sandboxed.

## Use

```swift
import SwiftUI
import DistroHubKit

@main
struct MyApp: App {
    @StateObject private var license = LicenseManager(
        appId: "YOUR_APP_ID",          // dashboard → app → Overview
        publicKey: "YOUR_PUBLIC_KEY",  // dashboard → app → Overview
        storeURL: URL(string: "https://your-distrohub-domain/apps/your-app")!
    )

    var body: some Scene {
        WindowGroup {
            LicenseGate(manager: license) { ContentView() }
        }
        Settings {
            Button("Deactivate this Mac") { Task { await license.deactivate() } }
        }
    }
}
```

## How it works

- `activate(key:)` calls `POST /api/v1/licenses/activate` with a device id (SHA-256 of the Mac's
  hardware UUID, salted with the app id) and stores the key + returned token in the Keychain.
- The token is Ed25519-signed by DistroHub. On launch the manager verifies it offline with your
  public key, so the app opens without a network round trip.
- It then calls `validate` in the background to refresh the token. If the key was revoked,
  refunded or the device was reset from the dashboard, the app locks.
- Offline, the app stays unlocked until the token expires (30 days) plus `offlineGracePeriod` (7 days).

Custom paywall: observe `license.state` (`.checking`, `.unlicensed`, `.licensed(LicenseInfo)`)
and call `activate(key:)` / `deactivate()` yourself.
