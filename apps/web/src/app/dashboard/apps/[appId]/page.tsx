import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireOwnedApp } from "@/lib/auth";
import { formatPrice } from "@/lib/money";
import { latestRelease } from "@/lib/releases";
import { CopyButton } from "@/components/copy-button";
import { PublishToggle } from "./publish-toggle";

export default async function AppOverviewPage({ params }: PageProps<"/dashboard/apps/[appId]">) {
  const { appId } = await params;
  const { app } = await requireOwnedApp(appId);
  const [sales, licenses, activations, release] = await Promise.all([
    db.order.aggregate({
      where: { appId, status: "PAID" },
      _count: true,
      _sum: { amountCents: true, creatorEarningsCents: true },
    }),
    db.license.count({ where: { appId, status: "ACTIVE" } }),
    db.activation.count({ where: { license: { appId } } }),
    latestRelease(appId),
  ]);

  const swift = `import DistroHubKit

let license = LicenseManager(
    appId: "${app.id}",
    publicKey: "${app.signingPublicKey}",
    storeURL: URL(string: "${env.appUrl}/apps/${app.slug}")!
)`;

  return (
    <div className="space-y-12">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-md text-muted">
          {app.status === "PUBLISHED"
            ? `Buyers can find and ${app.priceCents === 0 ? "download" : "buy"} this product in the store.`
            : release
              ? "Ready to go. Publishing lists the product in the store."
              : "Upload a file, then publish to list the product in the store."}
        </p>
        <PublishToggle appId={app.id} published={app.status === "PUBLISHED"} canPublish={!!release} />
      </section>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        <Stat label="Orders" value={String(sales._count)} />
        <Stat label="Gross revenue" value={formatPrice(sales._sum.amountCents ?? 0)} />
        <Stat label="Your earnings" value={formatPrice(sales._sum.creatorEarningsCents ?? 0)} />
        <Stat label="Active devices" value={app.licenseKeys ? `${activations} on ${licenses} keys` : "No keys"} />
      </dl>

      {app.licenseKeys && <section>
        <h2 className="text-xl font-semibold">Add the paywall to your app</h2>
        <p className="mt-1 max-w-prose text-muted">
          These two values identify the app and let it verify license tokens offline. Both are safe to ship inside
          the app binary.
        </p>
        <div className="mt-5 space-y-3">
          <Credential label="App ID" value={app.id} />
          <Credential label="Public key" value={app.signingPublicKey} />
        </div>
        <div className="panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-2 text-sm text-muted">
            <span>Swift</span>
            <CopyButton value={swift} />
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed">{swift}</pre>
        </div>
        <p className="mt-3 text-sm text-muted">
          Not on Swift? Call the <a href="/docs#license-api" className="underline">license REST API</a> directly.
        </p>
      </section>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-24 text-sm font-semibold">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm">{value}</code>
      <CopyButton value={value} />
    </div>
  );
}
