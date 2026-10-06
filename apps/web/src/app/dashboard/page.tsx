import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatPrice } from "@/lib/money";
import { AppIcon } from "@/components/app-icon";

export const metadata = { title: "Your apps" };

export default async function DashboardPage() {
  const user = await requireUser();
  const apps = await db.app.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" } });
  const sales = await db.order.groupBy({
    by: ["appId"],
    where: { app: { ownerId: user.id }, status: "PAID" },
    _count: true,
    _sum: { developerEarningsCents: true },
  });
  const byApp = new Map(sales.map((s) => [s.appId, s]));
  const totalEarnings = sales.reduce((sum, s) => sum + (s._sum.developerEarningsCents ?? 0), 0);
  const totalSales = sales.reduce((sum, s) => sum + s._count, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your apps</h1>
          {apps.length > 0 && (
            <p className="mt-1 text-muted">
              {totalSales} {totalSales === 1 ? "sale" : "sales"}, {formatPrice(totalEarnings)} earned after platform fees
            </p>
          )}
        </div>
        <Link href="/dashboard/apps/new" className="btn btn-primary">New app</Link>
      </div>

      {apps.length === 0 ? (
        <div className="panel mt-8 p-8">
          <h2 className="text-xl font-semibold">List your first app</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-muted">
            <li>Create the app and set its price.</li>
            <li>Upload a build (.dmg, .zip, .exe, .AppImage).</li>
            <li>Add the license check to your app with the Swift package or the REST API.</li>
            <li>Publish. Buyers get the download and a license key by email.</li>
          </ol>
          <Link href="/dashboard/apps/new" className="btn btn-primary mt-6">Create an app</Link>
        </div>
      ) : (
        <ul className="mt-8 border-t border-line">
          {apps.map((app) => {
            const s = byApp.get(app.id);
            return (
              <li key={app.id} className="border-b border-line">
                <Link href={`/dashboard/apps/${app.id}`} className="flex items-center gap-4 py-4">
                  <AppIcon name={app.name} iconUrl={app.iconUrl} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{app.name}</p>
                    <p className="text-sm text-muted">
                      {app.status === "PUBLISHED" ? "Published" : "Draft"}, {formatPrice(app.priceCents, app.currency)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{formatPrice(s?._sum.developerEarningsCents ?? 0)}</p>
                    <p className="text-muted">{s?._count ?? 0} sales</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
