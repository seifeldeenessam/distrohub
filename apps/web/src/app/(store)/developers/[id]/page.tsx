import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { LISTED, findListed } from "@/lib/catalog";
import { ProductList } from "@/components/product-list";
import { DeveloperAvatar } from "@/components/developer-avatar";
import { Stars, formatRating } from "@/components/stars";

export const dynamic = "force-dynamic";

/** A creator is public only once they have a listed product; buyer-only accounts 404. */
const getDeveloper = cache(async (id: string) =>
  db.user.findFirst({
    where: { id, name: { not: "" }, apps: { some: LISTED } },
    select: { id: true, name: true, createdAt: true },
  }),
);

export async function generateMetadata({ params }: PageProps<"/developers/[id]">): Promise<Metadata> {
  const developer = await getDeveloper((await params).id);
  if (!developer) return {};
  return { title: developer.name, description: `Products by ${developer.name} on Distrohub.` };
}

export default async function DeveloperPage({ params }: PageProps<"/developers/[id]">) {
  const developer = await getDeveloper((await params).id);
  if (!developer) notFound();

  const [products, reviews] = await Promise.all([
    findListed({ where: { ownerId: developer.id }, take: 100 }),
    db.review.aggregate({
      where: { app: { ownerId: developer.id, ...LISTED } },
      _avg: { rating: true },
      _count: true,
    }),
  ]);
  const since = developer.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div className="pt-12">
      <header className="flex items-center gap-5">
        <DeveloperAvatar name={developer.name} size={80} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">Creator</p>
          <h1 className="truncate text-3xl font-bold sm:text-4xl">{developer.name}</h1>
        </div>
      </header>

      <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line text-center sm:max-w-lg">
        <Stat label={products.length === 1 ? "Product" : "Products"}>{products.length}</Stat>
        <Stat label={`${reviews._count} ${reviews._count === 1 ? "review" : "reviews"}`}>
          {reviews._count > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Stars rating={reviews._avg.rating ?? 0} size={14} />
              {formatRating(reviews._avg.rating ?? 0)}
            </span>
          ) : (
            "None yet"
          )}
        </Stat>
        <Stat label="On Distrohub since">{since}</Stat>
      </dl>

      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-bold">Products</h2>
        <ProductList products={products} showCreator={false} />
      </section>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse bg-surface px-3 py-4">
      <dt className="mt-1 text-xs text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
