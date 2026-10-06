# DistroHub

A store for paid desktop apps. Developers upload a build, set a price and add a license check to their app. Buyers click **$5 Download**, pay through Polar, the download starts, and a license key arrives by email. They paste the key into the app and it unlocks.

```
apps/web        Next.js 16 storefront, developer dashboard and REST API (Prisma 7 + PostgreSQL)
sdks/swift      DistroHubKit: Swift package with the license manager and a drop-in SwiftUI paywall
```

## Flow

```
Buyer                       DistroHub (apps/web)                         Polar / R2 / Resend
  │ click "$5 Download"  ──► POST /api/checkout
  │                          creates Order(PENDING), Polar product+checkout ──► hosted checkout
  │ ◄───────────────────────────────────────────────────────────────── pays, redirected to
  │ /purchase/success?checkout_id=…  (polls until paid)
  │                          POST /api/webhooks/polar  order.paid ◄──── webhook
  │                          Order→PAID, License issued, email ──────────► Resend
  │ download starts:         GET /d/{token} → 302 presigned URL ─────────► R2
  │
  │ opens the app, pastes key
  App ──────────────────────► POST /api/v1/licenses/activate
                             checks key, device limit → Ed25519-signed token
  App verifies token offline with the app's public key, stores it in the Keychain, unlocks.
```

## Local development

Requires Node 22, pnpm 10 and PostgreSQL.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
# set APP_SECRET_KEY:
sed -i '' "s|^APP_SECRET_KEY=.*|APP_SECRET_KEY=\"$(openssl rand -base64 32)\"|" apps/web/.env   # macOS sed

createdb distrohub   # or point DATABASE_URL at an existing database
pnpm db:migrate
pnpm db:seed         # demo developer demo@distrohub.dev / demo-password + 2 apps
pnpm dev             # http://localhost:3000
```

Out of the box it runs fully offline: `PAYMENTS_PROVIDER=mock` shows a fake checkout page, `STORAGE_DRIVER=local` keeps builds in `apps/web/.storage`, and emails print to the console when `RESEND_API_KEY` is empty.

## Production setup

### Polar

1. Create an organization access token with `products:write` and `checkouts:write` → `POLAR_ACCESS_TOKEN`.
2. Add a webhook endpoint `https://YOUR_DOMAIN/api/webhooks/polar` subscribed to `order.paid` and `order.refunded` → `POLAR_WEBHOOK_SECRET`.
3. `PAYMENTS_PROVIDER=polar`, `POLAR_SERVER=production` (use `sandbox` with sandbox tokens first).

Each app gets one Polar product, created on its first checkout and re-priced automatically when the developer changes the price.

### Cloudflare R2 (or S3)

`STORAGE_DRIVER=s3`, `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`, `S3_REGION=auto`, bucket and keys. Developers upload straight from the browser to R2, so add a CORS rule on the bucket:

```json
[{ "AllowedOrigins": ["https://YOUR_DOMAIN"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
```

### Email

`RESEND_API_KEY` and `EMAIL_FROM` on a verified domain.

### Deploy

```bash
pnpm install --frozen-lockfile
pnpm --filter web db:deploy
pnpm build && pnpm --filter web start
```

The in-memory rate limiter assumes a single instance. Behind Cloudflare, add a rate-limiting rule on `/api/v1/licenses/*` and `/api/checkout` when you scale out.

## APIs

Full reference with examples at `/docs` in the running app.

| Endpoint | Auth | Used by |
| --- | --- | --- |
| `POST /api/v1/licenses/activate`, `validate`, `deactivate` | none (app id + key) | the shipped app |
| `GET /api/v1/apps` | `Bearer dh_sk_…` | developer backend / CI |
| `GET, POST /api/v1/apps/{appId}/licenses` | `Bearer dh_sk_…` | list, issue free keys |
| `GET, PATCH /api/v1/licenses/{licenseId}` | `Bearer dh_sk_…` | inspect, revoke, reset devices |
| `GET, POST /api/v1/apps/{appId}/releases`, `…/{releaseId}/complete` | `Bearer dh_sk_…` | upload builds from CI |

## Security model

- Each app has its own Ed25519 key pair. The private key is encrypted at rest with `APP_SECRET_KEY` (AES-256-GCM); the public key ships in the app to verify license tokens offline.
- License keys are 25 Crockford base32 characters (125 bits). Tokens are bound to app id + device id and expire after 30 days; the SDK refreshes them when online.
- Developer API keys are stored as SHA-256 hashes and shown once. Sessions use an httpOnly cookie whose token is stored hashed.
- Download links (`/d/{token}`) are unguessable, always serve the latest release and stop working after a refund.
- Polar webhooks are signature-verified and de-duplicated by `webhook-id`; fulfillment is idempotent.

## Not built yet

- **Developer payouts.** Polar is the merchant of record for the platform's single organization; it has no split payouts. Earnings per developer (after `PLATFORM_FEE_BPS`) are tracked on every order and shown in the dashboard, but paying developers out is manual for now.
- Buyer accounts ("my purchases"); today buyers rely on the receipt email, and developers can resend it from the dashboard.
- Free apps, discounts, multiple currencies, icon upload (icon is a URL), app review/moderation before publishing.
