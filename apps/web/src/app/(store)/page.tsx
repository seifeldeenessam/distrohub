import Link from "next/link";
import { db } from "@/lib/db";
import { LISTED, findListed } from "@/lib/catalog";
import { ProductList } from "@/components/product-list";
import { KIND_LABEL, PRODUCT_KINDS } from "@/components/product-kind";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [latest, kinds] = await Promise.all([
    findListed({ take: 8 }),
    db.app.groupBy({ by: ["kind"], where: LISTED }),
  ]);
  const kindLinks = PRODUCT_KINDS.filter((k) => kinds.some((g) => g.kind === k));

  return (
    <>
      <section className="pt-16 pb-10 sm:pt-24">
        <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] sm:text-6xl">
          Digital goods you pay for once and keep.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Apps, ebooks, templates and more from independent creators. Free or paid, the download is yours.
        </p>
        <form action="/search" role="search" className="mt-8 flex max-w-lg gap-2">
          <input name="q" type="search" placeholder="Search products and creators" aria-label="Search products and creators" className="input" />
          <button className="btn btn-primary">Search</button>
        </form>
      </section>

      {kindLinks.length > 1 && (
        <nav aria-label="Browse by type" className="flex flex-wrap gap-2 text-sm">
          {kindLinks.map((k) => (
            <Link key={k} href={`/products?type=${k}`} className="btn btn-sm">{KIND_LABEL[k].many}</Link>
          ))}
          <Link href="/products?price=free" className="btn btn-sm">Free</Link>
        </nav>
      )}

      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-bold">New on Distrohub</h2>
          {latest.length > 0 && <Link href="/products" className="text-sm font-medium text-muted hover:text-ink">See all products</Link>}
        </div>
        {latest.length > 0 ? (
          <ProductList products={latest} />
        ) : (
          <div className="border-t border-line py-16 text-center">
            <p className="text-lg font-semibold">Nothing is listed yet.</p>
            <p className="mt-2 text-muted">Making something? <Link href="/docs#get-started" className="underline">Start selling</Link>.</p>
          </div>
        )}
      </section>
    </>
  );
}
