import Link from "next/link";
import { env } from "@/lib/env";

export const metadata = { title: "Developer docs" };

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="panel my-4 overflow-hidden">
      {lang && <div className="border-b border-line px-4 py-1.5 text-xs text-muted">{lang}</div>}
      <pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed">{children}</pre>
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="mt-16 scroll-mt-8 text-2xl font-bold">{children}</h2>;
}

export default function DocsPage() {
  const base = env.appUrl;
  return (
    <div className="grid gap-12 pt-12 md:grid-cols-[180px_1fr]">
      <nav className="hidden text-sm md:block">
        <ul className="sticky top-8 space-y-2 text-muted">
          <li><a href="#flow" className="hover:text-ink">How a sale works</a></li>
          <li><a href="#swift" className="hover:text-ink">Swift package</a></li>
          <li><a href="#license-api" className="hover:text-ink">License API</a></li>
          <li><a href="#tokens" className="hover:text-ink">Offline tokens</a></li>
          <li><a href="#developer-api" className="hover:text-ink">Developer API</a></li>
          <li><a href="#ci" className="hover:text-ink">Upload from CI</a></li>
        </ul>
      </nav>

      <article className="min-w-0 max-w-prose text-[0.9375rem] leading-relaxed">
        <h1 className="text-4xl font-bold">Sell your app on DistroHub</h1>
        <p className="mt-4 text-lg text-muted">
          You upload a build and add a license check to your app. DistroHub handles the store page, payment, the
          download and the license key email.
        </p>
        <p className="mt-4"><Link href="/register" className="btn btn-primary">Create a developer account</Link></p>

        <H2 id="flow">How a sale works</H2>
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          <li>A buyer clicks <strong>$5 Download</strong> on your app page and pays through Polar.</li>
          <li>The download starts, and a license key is emailed to the buyer.</li>
          <li>The buyer opens your app. Your paywall asks for the key and calls <code>/api/v1/licenses/activate</code>.</li>
          <li>DistroHub returns a signed token. The app stores it and unlocks. It works offline until the token expires, then refreshes it quietly.</li>
        </ol>

        <H2 id="swift">Swift package (macOS)</H2>
        <p className="mt-4">
          Add <code>DistroHubKit</code> from <code>sdks/swift</code> with Swift Package Manager. Copy your App ID and public key from
          the app&apos;s Overview tab in the dashboard.
        </p>
        <Code lang="Swift">{`import SwiftUI
import DistroHubKit

@main
struct MyApp: App {
    @StateObject private var license = LicenseManager(
        appId: "YOUR_APP_ID",
        publicKey: "YOUR_PUBLIC_KEY",
        storeURL: URL(string: "${base}/apps/your-app")!
    )

    var body: some Scene {
        WindowGroup {
            LicenseGate(manager: license) {
                ContentView()   // shown once the license is active
            }
        }
    }
}`}</Code>
        <p>
          <code>LicenseGate</code> shows a paywall with a key field and a buy button until the app is activated. For a custom
          paywall, use <code>license.state</code>, <code>license.activate(key:)</code> and <code>license.deactivate()</code> directly.
        </p>

        <H2 id="license-api">License API</H2>
        <p className="mt-4">
          Called from inside your app. No secret is needed: requests are identified by App ID and license key. Send a stable,
          anonymous device ID (the Swift package hashes the hardware UUID).
        </p>
        <h3 className="mt-8 text-lg font-semibold">Activate a device</h3>
        <Code lang="Shell">{`curl -X POST ${base}/api/v1/licenses/activate \\
  -H "Content-Type: application/json" \\
  -d '{
    "appId": "YOUR_APP_ID",
    "licenseKey": "7KQ2M-HX9TB-0RZ4C-N8VWE-3PJ6D",
    "deviceId": "a1b2c3d4e5f6...",
    "deviceName": "Ada's MacBook Pro"
  }'`}</Code>
        <Code lang="200 OK">{`{
  "token": "eyJ2IjoxLCJsaWQiOi...<signature>",
  "license": {
    "id": "cm...",
    "email": "ada@example.com",
    "status": "ACTIVE",
    "maxActivations": 3,
    "activations": 1,
    "expiresAt": "2026-11-05T12:00:00.000Z"
  }
}`}</Code>
        <p>Activating a device that is already active just refreshes its token.</p>
        <h3 className="mt-8 text-lg font-semibold">Validate and deactivate</h3>
        <p className="mt-2">
          <code>POST /api/v1/licenses/validate</code> takes the same body and returns a fresh token if the device is still activated.
          Call it on launch when online. <code>POST /api/v1/licenses/deactivate</code> frees the device slot, for a
          &ldquo;Sign out of this Mac&rdquo; button.
        </p>
        <h3 className="mt-8 text-lg font-semibold">Errors</h3>
        <Code lang="4xx">{`{ "error": { "code": "activation_limit_reached", "message": "..." } }`}</Code>
        <ul className="list-disc space-y-1 pl-5">
          <li><code>400 invalid_request</code>: missing or malformed fields</li>
          <li><code>404 license_not_found</code>: key doesn&apos;t exist or belongs to another app</li>
          <li><code>404 not_activated</code>: validate called for a device that was never activated or was reset</li>
          <li><code>403 license_revoked</code>: refunded or revoked; lock the app</li>
          <li><code>409 activation_limit_reached</code>: the key is on its maximum number of devices</li>
          <li><code>429 rate_limited</code>: more than 30 requests a minute from one IP</li>
        </ul>

        <H2 id="tokens">Offline tokens</H2>
        <p className="mt-4">
          The token is <code>base64url(payload) + &quot;.&quot; + base64url(signature)</code>. The signature is Ed25519 over the raw
          payload bytes, made with your app&apos;s private key. Verify it with the public key from the dashboard, then check that
          <code> app</code> and <code>dev</code> match and <code>exp</code> is in the future.
        </p>
        <Code lang="Payload">{`{ "v": 1, "lid": "cm...", "app": "YOUR_APP_ID", "dev": "a1b2c3...",
  "email": "ada@example.com", "iat": 1791288000, "exp": 1793880000 }`}</Code>
        <p>Tokens last 30 days. Refresh with <code>validate</code> whenever the app is online.</p>

        <H2 id="developer-api">Developer API</H2>
        <p className="mt-4">
          Server-to-server only. Authenticate with a secret key from <Link href="/dashboard/api-keys" className="underline">API keys</Link>:
          <code> Authorization: Bearer dh_sk_...</code>
        </p>
        <Code lang="Endpoints">{`GET    /api/v1/apps
GET    /api/v1/apps/{appId}/licenses?email=&limit=&cursor=
POST   /api/v1/apps/{appId}/licenses          { email, maxActivations?, note? }
GET    /api/v1/licenses/{licenseId}           includes devices
PATCH  /api/v1/licenses/{licenseId}           { status?: "ACTIVE"|"REVOKED", maxActivations?, resetActivations? }
GET    /api/v1/apps/{appId}/releases
POST   /api/v1/apps/{appId}/releases          { version, fileName, fileSize, notes? } → uploadUrl
POST   /api/v1/apps/{appId}/releases/{releaseId}/complete`}</Code>

        <H2 id="ci">Upload a release from CI</H2>
        <Code lang="Shell">{`FILE=build/MyApp.dmg
VERSION=1.4.0
SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE")

RES=$(curl -sf -X POST ${base}/api/v1/apps/$APP_ID/releases \\
  -H "Authorization: Bearer $DISTROHUB_KEY" -H "Content-Type: application/json" \\
  -d "{\\"version\\":\\"$VERSION\\",\\"fileName\\":\\"$(basename $FILE)\\",\\"fileSize\\":$SIZE}")

curl -sf -X PUT --upload-file "$FILE" "$(echo "$RES" | jq -r .uploadUrl)"
curl -sf -X POST ${base}/api/v1/apps/$APP_ID/releases/$(echo "$RES" | jq -r .data.id)/complete \\
  -H "Authorization: Bearer $DISTROHUB_KEY"`}</Code>
      </article>
    </div>
  );
}
