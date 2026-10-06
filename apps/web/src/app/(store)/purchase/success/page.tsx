import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AppIcon } from "@/components/app-icon";
import { AutoRefresh, StartDownload, CopyButton } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Purchase complete" };

export default async function SuccessPage({ searchParams }: PageProps<"/purchase/success">) {
  const { checkout_id } = await searchParams;
  if (typeof checkout_id !== "string") notFound();
  const order = await db.order.findUnique({
    where: { checkoutId: checkout_id },
    include: { app: true, license: true },
  });
  if (!order) notFound();

  if (order.status === "PENDING" || !order.license) {
    return (
      <div className="mx-auto max-w-md pt-24 text-center">
        <AutoRefresh />
        <h1 className="text-3xl font-bold">Confirming your payment</h1>
        <p className="mt-3 text-muted">This usually takes a few seconds. The page updates on its own.</p>
      </div>
    );
  }

  if (order.status === "REFUNDED") {
    return (
      <div className="mx-auto max-w-md pt-24 text-center">
        <h1 className="text-3xl font-bold">This purchase was refunded</h1>
        <p className="mt-3 text-muted">The license key and download link are no longer active.</p>
      </div>
    );
  }

  const downloadHref = `/d/${order.downloadToken}`;
  return (
    <div className="mx-auto max-w-lg pt-16 sm:pt-24">
      <StartDownload href={downloadHref} />
      <div className="flex items-center gap-4">
        <AppIcon name={order.app.name} iconUrl={order.app.iconUrl} size={56} />
        <div>
          <h1 className="text-3xl font-bold">{order.app.name} is downloading</h1>
          <p className="text-muted">
            Didn&apos;t start? <a href={downloadHref} className="font-medium text-ledger-ink underline">Download it again</a>.
          </p>
        </div>
      </div>

      <div className="ticket mt-10">
        <div className="p-6">
          <p className="text-sm text-muted">License key</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <code className="font-mono text-xl font-medium tracking-wide sm:text-2xl">{order.license.key}</code>
            <CopyButton value={order.license.key} />
          </div>
        </div>
        <div className="ticket-tear" />
        <div className="p-6 text-sm text-muted">
          A copy is on its way to <span className="font-medium text-ink">{order.email}</span>.
          Works on up to {order.license.maxActivations} {order.license.maxActivations === 1 ? "device" : "devices"}.
        </div>
      </div>

      <ol className="mt-10 space-y-3 text-[0.9375rem]">
        <li><span className="font-semibold">Install.</span> Open the file you just downloaded.</li>
        <li><span className="font-semibold">Open {order.app.name}.</span> It asks for a license key on first launch.</li>
        <li><span className="font-semibold">Paste the key.</span> The app unlocks.</li>
      </ol>
      <p className="mt-10 text-sm">
        <Link href="/" className="text-muted underline">Back to all apps</Link>
      </p>
    </div>
  );
}
