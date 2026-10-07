import Link from "next/link";
import { db } from "@/lib/db";
import { LISTED, findListed } from "@/lib/catalog";
import { FilterPill, ProductList } from "@/components/product-list";
import { PLATFORM_LABEL } from "@/components/platform";
import { KIND_LABEL, PRODUCT_KINDS } from "@/components/product-kind";
import type { Platform, Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

const PAGE_SIZE = 30;
const PLATFORMS = Object.keys(PLATFORM_LABEL) as Platform[];
const SORTS = {
  new: { label: "Newest", orderBy: { createdAt: "desc" } },
  "price-asc": { label: "Price: low to high", orderBy: [{ priceCents: "asc" }, { createdAt: "desc" }] },
  "price-desc": { label: "Price: high to low", orderBy: [{ priceCents: "desc" }, { createdAt: "desc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.AppOrderByWithRelationInput | Prisma.AppOrderByWithRelationInput[] }>;
type Sort = keyof typeof SORTS;

type Filters = { type?: string; price?: "free" | "paid"; platform?: Platform; sort: Sort; page: number };

function href(f: Filters, change: Partial<Filters>) {
  const next = { ...f, page: 1, ...change };
  // Platform only applies to software.
  if (next.type !== "SOFTWARE") next.platform = undefined;
  const params = new URLSearchParams();
  if (next.type) params.set("type", next.type);
  if (next.price) params.set("price", next.price);
  if (next.platform) params.set("platform", next.platform);
  if (next.sort !== "new") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const sp = await searchParams;
  const kind = PRODUCT_KINDS.find((k) => k === sp.type);
  const price = sp.price === "free" || sp.price === "paid" ? sp.price : undefined;
  const platform = kind === "SOFTWARE" ? PLATFORMS.find((p) => p === sp.platform) : undefined;
  const sort: Sort = typeof sp.sort === "string" && sp.sort in SORTS ? (sp.sort as Sort) : "new";
  const page = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
  const f: Filters = { type: kind, price, platform, sort, page };

  const where: Prisma.AppWhereInput = {
    ...(kind && { kind }),
    ...(platform && { platform }),
    ...(price === "free" && { priceCents: 0 }),
    ...(price === "paid" && { priceCents: { gt: 0 } }),
  };
  const [products, total, kinds] = await Promise.all([
    findListed({ where, orderBy: SORTS[sort].orderBy, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    db.app.count({ where: { AND: [LISTED, where] } }),
    // Only offer filters for types that have something listed.
    db.app.groupBy({ by: ["kind"], where: LISTED }),
  ]);
  const kindFilters = PRODUCT_KINDS.filter((k) => kinds.some((g) => g.kind === k));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(kind || price || platform);

  return (
    <div className="pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">{kind ? KIND_LABEL[kind].many : "All products"}</h1>
          <p className="mt-2 text-muted">
            {total} {total === 1 ? "product" : "products"}
            {platform && ` for ${PLATFORM_LABEL[platform]}`}
            {price === "free" && ", free"}
            {price === "paid" && ", paid"}
          </p>
        </div>
        <Link href="/search" className="btn btn-sm">Search products</Link>
      </div>

      <div className="mt-8 space-y-3 text-sm">
        <FilterRow label="Type">
          <FilterPill href={href(f, { type: undefined })} active={!kind}>All</FilterPill>
          {kindFilters.map((k) => (
            <FilterPill key={k} href={href(f, { type: k })} active={kind === k}>{KIND_LABEL[k].many}</FilterPill>
          ))}
        </FilterRow>
        {kind === "SOFTWARE" && (
          <FilterRow label="Platform">
            <FilterPill href={href(f, { platform: undefined })} active={!platform}>Any</FilterPill>
            {PLATFORMS.map((p) => (
              <FilterPill key={p} href={href(f, { platform: p })} active={platform === p}>{PLATFORM_LABEL[p]}</FilterPill>
            ))}
          </FilterRow>
        )}
        <FilterRow label="Price">
          <FilterPill href={href(f, { price: undefined })} active={!price}>Any</FilterPill>
          <FilterPill href={href(f, { price: "free" })} active={price === "free"}>Free</FilterPill>
          <FilterPill href={href(f, { price: "paid" })} active={price === "paid"}>Paid</FilterPill>
        </FilterRow>
        <FilterRow label="Sort">
          {(Object.keys(SORTS) as Sort[]).map((s) => (
            <FilterPill key={s} href={href(f, { sort: s })} active={sort === s}>{SORTS[s].label}</FilterPill>
          ))}
        </FilterRow>
      </div>

      <div className="mt-8">
        {products.length > 0 ? (
          <ProductList products={products} />
        ) : (
          <div className="border-t border-line py-16 text-center">
            <p className="text-lg font-semibold">{filtered ? "Nothing matches these filters." : "Nothing is listed yet."}</p>
            {filtered && (
              <p className="mt-2 text-muted"><Link href="/products" className="underline">Clear the filters</Link></p>
            )}
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(f, { page: page - 1 })} className="btn btn-sm">Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={href(f, { page: page + 1 })} className="btn btn-sm">Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-16 shrink-0 text-muted">{label}</span>
      <div className="-my-1 flex min-w-0 gap-1 overflow-x-auto py-1">{children}</div>
    </div>
  );
}
