import Link from "next/link";
import { db } from "@/lib/db";
import { priceLabel } from "@/lib/money";
import { AppIcon } from "@/components/app-icon";
import { PLATFORM_LABEL } from "@/components/platform";
import { KIND_LABEL, PRODUCT_KINDS } from "@/components/product-kind";
import { Stars, formatRating } from "@/components/stars";
import { ratingSummaries } from "@/lib/reviews";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const kind = PRODUCT_KINDS.find((k) => k === sp.type);
  const free = sp.price === "free";

  const listed: Prisma.AppWhereInput = { status: "PUBLISHED", releases: { some: { uploaded: true } } };
  const where: Prisma.AppWhereInput = {
    ...listed,
    ...(kind ? { kind } : {}),
    ...(free ? { priceCents: 0 } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { tagline: { contains: q, mode: "insensitive" } }] }
      : {}),
  };
  const [apps, kinds] = await Promise.all([
    db.app.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { owner: { select: { name: true } } },
    }),
    // Only offer filters for types that have something listed.
    db.app.groupBy({ by: ["kind"], where: listed }),
  ]);
  const ratings = await ratingSummaries(apps.map((a) => a.id));
  const kindFilters = PRODUCT_KINDS.filter((k) => kinds.some((g) => g.kind === k));
  const filtered = !!(q || kind || free);

  return (
    <>
      <section className="pt-16 pb-10 sm:pt-24">
        <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] sm:text-6xl">
          Digital goods you pay for once and keep.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Apps, ebooks, templates and more from independent creators. Free or paid, the download is yours.
        </p>
      </section>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" role="search">
        {kind && <input type="hidden" name="type" value={kind} />}
        {free && <input type="hidden" name="price" value="free" />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search"
          aria-label="Search products"
          className="input sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1 text-sm">
          <FilterLink q={q} free={free} active={!kind} label="All" />
          {kindFilters.length > 1 &&
            kindFilters.map((k) => (
              <FilterLink key={k} q={q} type={k} free={free} active={kind === k} label={KIND_LABEL[k].many} />
            ))}
          <FilterLink q={q} type={kind} free={!free} active={free} label="Free" />
        </div>
      </form>

      <ul className="mt-8 border-t border-line">
        {apps.map((app) => {
          const rating = ratings.get(app.id);
          return (
          <li key={app.id} className="border-b border-line">
            <Link href={`/apps/${app.slug}`} className="group flex items-center gap-4 py-5 sm:gap-6">
              <AppIcon name={app.name} iconUrl={app.iconUrl} size={64} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold group-hover:text-accent-ink">{app.name}</h2>
                <p className="truncate text-muted">{app.tagline}</p>
                <p className="mt-1 text-sm text-muted">
                  {app.platform ? `${KIND_LABEL[app.kind].one} for ${PLATFORM_LABEL[app.platform]}` : KIND_LABEL[app.kind].one}, by{" "}
                  {app.owner.name}
                </p>
                {rating && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <Stars rating={rating.average} size={14} />
                    <span>{formatRating(rating.average)} ({rating.count})</span>
                  </p>
                )}
              </div>
              <span className="rounded-full bg-accent-wash px-3 py-1 text-sm font-semibold text-accent-ink">
                {priceLabel(app.priceCents, app.currency)}
              </span>
            </Link>
          </li>
          );
        })}
      </ul>

      {apps.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg font-semibold">{filtered ? "Nothing matches that search." : "Nothing is listed yet."}</p>
          <p className="mt-2 text-muted">
            {filtered ? (
              <Link href="/" className="underline">Clear the filters</Link>
            ) : (
              <>Making something? <Link href="/register" className="underline">Start selling</Link>.</>
            )}
          </p>
        </div>
      )}
    </>
  );
}

function FilterLink(props: { q: string; type?: string; free: boolean; active: boolean; label: string }) {
  const { q, type, free, active, label } = props;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (free) params.set("price", "free");
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
