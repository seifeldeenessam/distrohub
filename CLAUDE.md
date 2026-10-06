# CLAUDE.md

## Git workflow

- Commit and push directly to `main`. Do not create feature branches or pull requests unless explicitly asked.
- Never add `Co-authored-by` / `Co-Authored-By` trailers (or any other attribution trailers) to commit messages.
- Before committing, set the git identity (cloud containers reset it):
  ```sh
  git config user.name "Seif Eldeen Essam"
  git config user.email "info@seifessam.com"
  ```

## Project

Distrohub is a store for any digital product (software, ebooks, courses, templates, fonts, audio…), free or paid:
- **Developers** upload a file, set a price from $0 and pick a product type. Software can turn on license keys and add a license check to the app.
- **Buyers** click "$X Download" and pay through Polar, or "Download free" and enter an email. The download starts, and the download link (plus a license key, when the product uses keys) is emailed to them.
- **The app** (license-key products only) activates the key against the license API and unlocks.

Products are the `App` model internally (`appId`, `/apps/[slug]`, `/api/v1/apps` are stable public names); UI copy says "product".

```
apps/web     Next.js 16 app: storefront, developer dashboard, REST API (Prisma 7 + PostgreSQL)
sdks/swift   DistroHubKit Swift package: LicenseManager + SwiftUI LicenseGate/PaywallView (macOS 12+)
```

pnpm workspace (pnpm 10, Node 22). Run all commands from the repo root unless noted.

## Commands

```sh
pnpm install                 # also runs `prisma generate` (postinstall)
pnpm dev                     # http://localhost:3000
pnpm typecheck               # next typegen + tsc --noEmit
pnpm lint
pnpm build
pnpm db:migrate              # prisma migrate dev (create + apply migration)
pnpm db:seed                 # demo@distrohub.dev / demo-password, 2 published apps
pnpm --filter web db:deploy  # prisma migrate deploy (production)
```

Before pushing, run `pnpm typecheck && pnpm lint && pnpm build`. If `next build` fails on `.next/dev/types`, a dev server left stale types behind: `rm -rf apps/web/.next`.

There is no test suite yet. To verify a change end to end, run the app with the mock providers below and drive it with Playwright. In cloud sessions, Chromium is at `/opt/pw-browsers/chromium-*/chrome-linux/chrome`.

Local Postgres in a cloud container:
```sh
service postgresql start
su postgres -c "psql -c \"CREATE USER distrohub WITH PASSWORD 'distrohub' CREATEDB;\""
su postgres -c "createdb -O distrohub distrohub"
cp apps/web/.env.example apps/web/.env   # then set APP_SECRET_KEY=$(openssl rand -base64 32)
```

## Framework versions — read before writing code

- **Next.js 16** differs from older training data. Before using an API you're unsure of, read the matching guide in `apps/web/node_modules/next/dist/docs/`. Specifically:
  - `params`, `searchParams`, `cookies()` and `headers()` are async and must be awaited.
  - Middleware is now `proxy.ts`.
  - Page and layout props are typed with the generated globals `PageProps<"/route">` and `LayoutProps<"/route">` (run `next typegen`).
- **Prisma 7**:
  - The client is generated to `apps/web/src/generated/prisma` (gitignored). Import it from `@/generated/prisma/client`, not `@prisma/client`.
  - The `pg` driver adapter is required (see `src/lib/db.ts`).
  - The datasource URL lives in `apps/web/prisma.config.ts`, not in `schema.prisma`.
- **Polar SDK 1.x** uses dated API modules: `import { createPolar, webhooks, type models } from "@polar-sh/sdk/2026-10"`. Request and response bodies are **snake_case** (`price_amount`, `success_url`, `checkout_id`). Check the types in `node_modules/@polar-sh/sdk/dist` rather than older camelCase examples.
- **Zod 4** (`z.email()`, `z.url()`, `error.issues`). **Tailwind v4** (tokens in CSS via `@theme`, no tailwind.config).

## Architecture (apps/web/src)

- `lib/` holds server code. Every module imports `server-only`.
  - `env.ts`: typed env access; use it instead of reading `process.env` directly.
  - `db.ts`: the Prisma singleton.
  - `auth.ts`: cookie sessions, `requireUser()` and `requireOwnedApp(appId)`.
  - `api-auth.ts` + `api-handler.ts`: `withApiKey()` wraps every developer-API route. It checks the `Bearer dh_sk_…` key and, when `appId` is in the path, that the caller owns the app.
  - `crypto.ts`: tokens, scrypt passwords, AES-256-GCM, Ed25519 key generation and license-key generation.
  - `license-token.ts` + `licenses.ts`: activate, validate and deactivate, plus signed tokens.
  - `fulfillment.ts`: `fulfillOrder()` and `refundOrder()`, both idempotent. This is the only place an order becomes PAID and a license is issued.
  - `payments/`: the provider interface, with `polar` and `mock` implementations.
  - `storage.ts`: `s3` (R2 or S3, presigned URLs) and `local` (`.storage/`, served by `/api/storage`).
  - `email.ts`: Resend, or console output when `RESEND_API_KEY` is unset.
- `app/(store)` is the public storefront, docs, mock checkout and purchase-success page.
- `app/(auth)` has login and register; `app/dashboard` is the developer console. Mutations go through server actions in `dashboard/actions.ts`, and each action re-checks ownership.
- `app/api/v1/licenses/{activate,validate,deactivate}` is the **public** API called by shipped apps. It takes no secret, so it is rate limited per IP.
- `app/api/v1/apps/**` and `app/api/v1/licenses/[licenseId]` form the **developer** API (secret key).
- `app/api/checkout` creates a PENDING order and redirects to checkout. For a $0 product it skips the payments provider and calls `fulfillOrder()` straight away (provider `free`). `app/api/webhooks/polar` handles `order.paid` and `order.refunded`. `app/d/[token]` is the permanent download link and always serves the latest uploaded release.

## Invariants — don't break these

- **Money is integer cents** (`priceCents`, `amountCents`). Format it with `formatPrice()` from `lib/money.ts` (`priceLabel()` shows "Free" for 0).
- **Prices are 0 (free) or at least `MIN_PAID_PRICE_CENTS`** (Polar's $0.50 minimum). Free products never reach Polar, but their orders still go through `fulfillOrder()` so downloads, keys and receipts work the same way.
- **License keys are per product** (`App.licenseKeys`). `fulfillOrder()` issues one only when it is on; an order without a license is valid. `platform` is set only for `kind = SOFTWARE`.
- **License token format is a contract with `sdks/swift`**: `base64url(JSON payload) + "." + base64url(Ed25519 signature over the payload bytes)`, with payload `{ v, lid, app, dev, email, iat, exp }`. Each app's public key is the raw 32 bytes in **standard** base64, which is what CryptoKit expects. If you change this, update `sdks/swift/Sources/DistroHubKit/LicenseToken.swift` and the `/docs` page in the same commit.
- **Public license API request fields** (`appId`, `licenseKey`, `deviceId`, `deviceName`) and error `code`s are also used by the Swift SDK and by developers' own apps. Treat them as a stable public API.
- **Secrets are never stored raw**:
  - App signing private keys are encrypted with `APP_SECRET_KEY`.
  - Session tokens and API keys are stored as SHA-256 hashes; an API key is shown once.
  - Never return `signingPrivateKeyEnc` from an API.
- **Mock payments give licenses away for free.** `env.paymentsProvider` throws in production unless `PAYMENTS_PROVIDER=polar` or `ALLOW_MOCK_PAYMENTS=true`. Keep that guard.
- **Webhooks must verify the signature first**, de-duplicate on the `webhook-id` header (the `WebhookEvent` table), and return 5xx only when Polar should retry.
- **Activation limits** are enforced inside a transaction holding a row lock (`SELECT … FOR UPDATE` on `License`). Keep any new activation path inside that lock.
- **Schema changes** go through `pnpm db:migrate --name <change>`. Commit the generated migration; never edit an applied one.

## UI conventions

- **Brand**: the "Citrus Peel" gradient, `linear-gradient(135deg, #F37335, #FDC830)`, available as `.bg-brand` and `.btn-primary`.
  - Logo: `components/logo.tsx` (`Logo`, `LogoMark`). Source assets are in `public/brand/`.
  - Font: Plus Jakarta Sans for all text. JetBrains Mono only for license keys and code.
- **Color tokens** live in `app/globals.css` (`paper`, `surface`, `ink`, `muted`, `line`, `accent`, `accent-ink`, `accent-wash`, `danger`, `danger-wash`), with dark-mode values. Use the token classes (`bg-surface`, `text-muted`, `text-accent-ink`…), never raw hex in components.
- **Text on the gradient is dark** (`--on-brand` `#2A1405`). White on `#F37335` fails contrast (2.9:1).
- **Shared classes**: `.btn`, `.btn-primary`, `.btn-sm`, `.btn-danger`, `.input`, `.label`, `.hint`, `.panel`, `.ticket`.
- **Copy**: sentence case, plain verbs, buttons say exactly what happens ("Upload release", "Revoke"). Errors say what went wrong and how to fix it.
- Layouts must work at 390px wide and in dark mode.

## Environment

All variables are documented in `apps/web/.env.example`. In local development, `PAYMENTS_PROVIDER=mock`, `STORAGE_DRIVER=local` and an empty `RESEND_API_KEY` make the full purchase flow work offline. Production needs:
- Polar: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER`.
- R2: the `S3_*` variables, plus a CORS rule on the bucket allowing browser `PUT`.
- Resend: `RESEND_API_KEY`, `EMAIL_FROM`.

The rate limiter is in-memory (one instance only).

## Known gaps

- **Developer payouts are manual.** Polar has no split payouts; per-order developer earnings are tracked after `PLATFORM_FEE_BPS`.
- **No buyer accounts**, no pay-what-you-want, no discounts, single currency (USD).
- **Free claims aren't email-verified**: anyone can claim a $0 product (and its license key) with any address, rate limited per IP.
- **The Swift SDK has never been compiled in CI**; build it in Xcode after changing it.
