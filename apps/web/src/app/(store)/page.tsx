import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { AppIcon } from "@/components/app-icon";
import { PLATFORM_LABEL } from "@/components/platform";
import type { Platform, Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const PLATFORMS: Platform[] = ["MACOS", "WINDOWS", "LINUX"];

export default async function ExplorePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const platform = PLATFORMS.find((p) => p === sp.platform);

  const where: Prisma.AppWhereInput = {
    status: "PUBLISHED",
    releases: { some: { uploaded: true } },
    ...(platform ? { platform } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { tagline: { contains: q, mode: "insensitive" } }] }
      : {}),
  };
  const apps = await db.app.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { owner: { select: { name: true } } },
  });

  return (
    <>
      <section className="pt-16 pb-10 sm:pt-24">
        <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] sm:text-6xl">
          Apps you pay for once and keep.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Made by independent developers. Buy, download, paste the license key from your inbox, done.
        </p>
      </section>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search apps"
          aria-label="Search apps"
          className="input sm:max-w-xs"
        />
        <div className="flex gap-1 text-sm">
          <FilterLink q={q} active={!platform} label="All" />
          {PLATFORMS.map((p) => (
            <FilterLink key={p} q={q} platform={p} active={platform === p} label={PLATFORM_LABEL[p]} />
          ))}
        </div>
      </form>

      <ul className="mt-8 border-t border-line">
        {apps.map((app) => (
          <li key={app.id} className="border-b border-line">
            <Link href={`/apps/${app.slug}`} className="group flex items-center gap-4 py-5 sm:gap-6">
              <AppIcon name={app.name} iconUrl={app.iconUrl} size={64} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold group-hover:text-ledger-ink">{app.name}</h2>
                <p className="truncate text-muted">{app.tagline}</p>
                <p className="mt-1 text-sm text-muted">
                  {PLATFORM_LABEL[app.platform]}, by {app.owner.name}
                </p>
              </div>
              <span className="rounded-full bg-ledger-wash px-3 py-1 text-sm font-semibold text-ledger-ink">
                {formatPrice(app.priceCents, app.currency)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {apps.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg font-semibold">{q || platform ? "No apps match that search." : "No apps are listed yet."}</p>
          <p className="mt-2 text-muted">
            {q || platform ? (
              <Link href="/" className="underline">Clear the filters</Link>
            ) : (
              <>Building one? <Link href="/register" className="underline">List your app</Link>.</>
            )}
          </p>
        </div>
      )}
    </>
  );
}

function FilterLink({ q, platform, active, label }: { q: string; platform?: string; active: boolean; label: string }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (platform) params.set("platform", platform);
  return (
    <Link
      href={`/?${params}`}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 font-medium ${active ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
    >
      {label}
    </Link>
  );
}
