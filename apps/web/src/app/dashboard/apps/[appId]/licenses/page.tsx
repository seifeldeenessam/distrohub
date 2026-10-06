import { db } from "@/lib/db";
import { requireOwnedApp } from "@/lib/auth";
import { IssueLicenseForm, LicenseActions } from "./client";

export default async function LicensesPage({ params, searchParams }: PageProps<"/dashboard/apps/[appId]/licenses">) {
  const { appId } = await params;
  const { q } = await searchParams;
  await requireOwnedApp(appId);
  const query = typeof q === "string" ? q.trim() : "";
  const licenses = await db.license.findMany({
    where: {
      appId,
      ...(query ? { OR: [{ email: { contains: query, mode: "insensitive" } }, { key: { contains: query.toUpperCase() } }] } : {}),
    },
    include: { _count: { select: { activations: true } }, order: { select: { amountCents: true, status: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="grid gap-12 md:grid-cols-[1fr_300px]">
      <section className="min-w-0">
        <form className="flex gap-2">
          <input name="q" defaultValue={query} placeholder="Search by email or key" aria-label="Search licenses" className="input" />
          <button className="btn">Search</button>
        </form>
        {licenses.length === 0 ? (
          <p className="panel mt-6 p-6 text-muted">
            {query ? "No licenses match that search." : "Licenses appear here as soon as someone buys the app."}
          </p>
        ) : (
          <ul className="mt-6 border-t border-line">
            {licenses.map((l) => (
              <li key={l.id} className="border-b border-line py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className={`font-mono text-sm ${l.status === "REVOKED" ? "text-muted line-through" : ""}`}>{l.key}</code>
                  <LicenseActions licenseId={l.id} status={l.status} hasDevices={l._count.activations > 0} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {l.email}, {l._count.activations} of {l.maxActivations} devices,{" "}
                  {l.order ? (l.order.status === "REFUNDED" ? "refunded" : "purchased") : (l.note ?? "issued manually")},{" "}
                  {l.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold">Issue a free key</h2>
        <p className="mt-1 text-sm text-muted">For reviewers, giveaways or customers who bought elsewhere.</p>
        <IssueLicenseForm appId={appId} />
      </section>
    </div>
  );
}
