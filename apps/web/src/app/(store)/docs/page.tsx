import { AuthForm } from '@/app/(auth)/auth-form';
import { getCurrentUser } from '@/lib/auth';
import { env } from '@/lib/env';
import Link from 'next/link';

export const metadata = { title: 'Creator docs' };

function Code({ children, lang }: { children: string; lang?: string }) {
	return (
		<div className="panel my-4 overflow-hidden">
			{lang && <div className="border-b border-line px-4 py-1.5 text-xs text-muted">{lang}</div>}
			<pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed">{children}</pre>
		</div>
	);
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
	return (
		<h2 id={id} className="mt-16 scroll-mt-8 text-2xl font-bold">
			{children}
		</h2>
	);
}

export default async function DocsPage() {
	const base = env.appUrl;
	const user = await getCurrentUser();
	return (
		<div className="grid gap-12 pt-12 md:grid-cols-[180px_1fr]">
			<nav className="hidden text-sm md:block">
				<ul className="sticky top-8 space-y-2 text-muted">
					<li>
						<a href="#get-started" className="hover:text-ink">
							Get started
						</a>
					</li>
					<li>
						<a href="#flow" className="hover:text-ink">
							How a sale works
						</a>
					</li>
					<li>
						<a href="#pricing" className="hover:text-ink">
							Pricing and free
						</a>
					</li>
					<li>
						<a href="#swift" className="hover:text-ink">
							Swift package
						</a>
					</li>
					<li>
						<a href="#license-api" className="hover:text-ink">
							License API
						</a>
					</li>
					<li>
						<a href="#tokens" className="hover:text-ink">
							Offline tokens
						</a>
					</li>
					<li>
						<a href="#creator-api" className="hover:text-ink">
							Creator API
						</a>
					</li>
					<li>
						<a href="#ci" className="hover:text-ink">
							Upload from CI
						</a>
					</li>
				</ul>
			</nav>

			<article className="min-w-0 max-w-prose text-[0.9375rem] leading-relaxed">
				<h1 className="text-4xl font-bold">Sell on Distrohub</h1>
				<p className="mt-4 text-lg text-muted">
					Sell any digital product: apps, ebooks, courses, templates, fonts, audio. You upload the file and set a price, or make it free. Distrohub handles the store page, payment, the
					download and the receipt email. Selling software? Turn on license keys and add the license check to your app.
				</p>

				<section id="get-started" className="panel mt-8 scroll-mt-8 p-5 sm:p-6">
					{user ?
						<>
							<h2 className="text-xl font-bold">You&apos;re signed in</h2>
							<p className="mt-1 text-muted">Create your first product from the dashboard.</p>
							<p className="mt-4">
								<Link href="/dashboard" className="btn btn-primary">
									Open the dashboard
								</Link>
							</p>
						</>
					:	<div>
							<h2 className="text-xl font-bold">Create a creator account</h2>
							<p className="mt-1 mb-5 text-muted">Upload a file, set a price or make it free, and publish.</p>
							<AuthForm mode="register" />
						</div>
					}
				</section>

				<H2 id="flow">How a sale works</H2>
				<ol className="mt-4 list-decimal space-y-2 pl-5">
					<li>
						A buyer clicks <strong>$5 Download</strong> on your app page and pays through Polar.
					</li>
					<li>The download starts, and a license key is emailed to the buyer.</li>
					<li>
						The buyer opens your app. Your paywall asks for the key and calls <code>/api/v1/licenses/activate</code>.
					</li>
					<li>Distrohub returns a signed token. The app stores it and unlocks. It works offline until the token expires, then refreshes it quietly.</li>
				</ol>
				<p className="mt-4">
					Without license keys (the default for anything that isn&apos;t software), steps 3 and 4 don&apos;t apply: the buyer gets the download and an email with a permanent link to the
					newest version.
				</p>

				<H2 id="pricing">Pricing and free products</H2>
				<ul className="mt-4 list-disc space-y-2 pl-5">
					<li>
						Set any price from <strong>$0</strong>. Paid prices start at $0.50, the lowest amount Polar can charge.
					</li>
					<li>
						At $0 the button reads <strong>Download free</strong>. The buyer enters an email and gets the download right away, with no checkout. If license keys are on, they get a key too,
						and it works exactly like a paid one.
					</li>
					<li>You can change the price at any time. Existing buyers keep their downloads and keys.</li>
				</ul>

				<H2 id="swift">Swift package (macOS software)</H2>
				<p className="mt-4">
					Add <code>DistroHubKit</code> from <code>sdks/swift</code> with Swift Package Manager. Copy your App ID and public key from the app&apos;s Overview tab in the dashboard.
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
					<code>LicenseGate</code> shows a paywall with a key field and a buy button until the app is activated. For a custom paywall, use <code>license.state</code>,{' '}
					<code>license.activate(key:)</code> and <code>license.deactivate()</code> directly.
				</p>

				<H2 id="license-api">License API</H2>
				<p className="mt-4">
					Called from inside your app. No secret is needed: requests are identified by App ID and license key. Send a stable, anonymous device ID (the Swift package hashes the hardware
					UUID).
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
					<code>POST /api/v1/licenses/validate</code> takes the same body and returns a fresh token if the device is still activated. Call it on launch when online.{' '}
					<code>POST /api/v1/licenses/deactivate</code> frees the device slot, for a &ldquo;Sign out of this Mac&rdquo; button.
				</p>
				<h3 className="mt-8 text-lg font-semibold">Errors</h3>
				<Code lang="4xx">{`{ "error": { "code": "activation_limit_reached", "message": "..." } }`}</Code>
				<ul className="list-disc space-y-1 pl-5">
					<li>
						<code>400 invalid_request</code>: missing or malformed fields
					</li>
					<li>
						<code>404 license_not_found</code>: key doesn&apos;t exist or belongs to another app
					</li>
					<li>
						<code>404 not_activated</code>: validate called for a device that was never activated or was reset
					</li>
					<li>
						<code>403 license_revoked</code>: refunded or revoked; lock the app
					</li>
					<li>
						<code>409 activation_limit_reached</code>: the key is on its maximum number of devices
					</li>
					<li>
						<code>429 rate_limited</code>: more than 30 requests a minute from one IP
					</li>
				</ul>

				<H2 id="tokens">Offline tokens</H2>
				<p className="mt-4">
					The token is <code>base64url(payload) + &quot;.&quot; + base64url(signature)</code>. The signature is Ed25519 over the raw payload bytes, made with your app&apos;s private key.
					Verify it with the public key from the dashboard, then check that
					<code> app</code> and <code>dev</code> match and <code>exp</code> is in the future.
				</p>
				<Code lang="Payload">{`{ "v": 1, "lid": "cm...", "app": "YOUR_APP_ID", "dev": "a1b2c3...",
  "email": "ada@example.com", "iat": 1791288000, "exp": 1793880000 }`}</Code>
				<p>
					Tokens last 30 days. Refresh with <code>validate</code> whenever the app is online.
				</p>

				<H2 id="creator-api">Creator API</H2>
				<p className="mt-4">
					Server-to-server only. Authenticate with a secret key from{' '}
					<Link href="/dashboard/api-keys" className="underline">
						API keys
					</Link>
					:<code> Authorization: Bearer dh_sk_...</code>
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
