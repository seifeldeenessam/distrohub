import Link from "next/link";
import { priceLabel } from "@/lib/money";
import type { ListedProduct } from "@/lib/catalog";
import { AppIcon, tintFor } from "@/components/app-icon";
import { PLATFORM_LABEL } from "@/components/platform";
import { KIND_LABEL } from "@/components/product-kind";
import { Stars, formatRating } from "@/components/stars";

export const kindLine = (p: ListedProduct) =>
  p.platform ? `${KIND_LABEL[p.kind].one} for ${PLATFORM_LABEL[p.platform]}` : KIND_LABEL[p.kind].one;

/**
 * The product's first screenshot, or a generated poster (name on the product's tint) when it has none,
 * so every card on a shelf has artwork.
 */
export function ProductCover({ product, large = false }: { product: ListedProduct; large?: boolean }) {
  if (product.coverId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/media/${product.coverId}`} alt="" loading="lazy" className="h-full w-full object-cover" />;
  }
  const initial = product.name.trim().charAt(0).toUpperCase();
  return (
    <div aria-hidden className="relative h-full w-full overflow-hidden text-white" style={{ background: tintFor(product.name) }}>
      <span
        className={`absolute -right-[0.06em] -bottom-[0.3em] font-display leading-none font-extrabold opacity-15 ${large ? "text-[22rem]" : "text-[11rem]"}`}
      >
        {initial}
      </span>
      <div className={`absolute inset-0 flex flex-col justify-between ${large ? "p-7" : "p-4"}`}>
        {product.iconUrl ? (
          <AppIcon name={product.name} iconUrl={product.iconUrl} size={large ? 72 : 44} />
        ) : (
          <span className="text-xs font-semibold opacity-80">{kindLine(product)}</span>
        )}
        <span className={`font-display leading-[1.05] font-bold tracking-tight text-balance ${large ? "text-4xl sm:text-5xl" : "text-2xl"}`}>
          {product.name}
        </span>
      </div>
    </div>
  );
}

/** Notched price tag that sits on the cover. */
export function PriceTag({ product, className = "" }: { product: ListedProduct; className?: string }) {
  const free = product.priceCents === 0;
  return (
    <span className={`price-tag ${free ? "bg-accent-wash text-accent-ink" : "bg-surface text-ink"} ${className}`}>
      {priceLabel(product.priceCents, product.currency)}
    </span>
  );
}

/** Store card: cover, price tag, then name, creator and rating. */
export function ProductCard({ product }: { product: ListedProduct }) {
  return (
    <Link href={`/apps/${product.slug}`} className="group block rounded-xl">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface">
        <ProductCover product={product} />
        <PriceTag product={product} className="absolute top-3 right-3" />
      </div>
      <h3 className="mt-3 truncate font-semibold group-hover:underline">{product.name}</h3>
      <p className="truncate text-sm text-muted">
        {kindLine(product)}, by {product.owner.name}
      </p>
      {product.rating && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <Stars rating={product.rating.average} size={13} />
          <span>
            {formatRating(product.rating.average)} ({product.rating.count})
          </span>
        </p>
      )}
    </Link>
  );
}

/** A titled row of cards. Scrolls sideways on phones, a grid from `sm` up. */
export function ProductShelf({
  title,
  href,
  linkLabel,
  products,
}: {
  title: string;
  href: string;
  linkLabel: string;
  products: ListedProduct[];
}) {
  if (products.length === 0) return null;
  return (
    <section className="mt-14" aria-label={title}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link href={href} className="text-sm font-medium whitespace-nowrap text-muted hover:text-ink">
          {linkLabel}
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-5 sm:gap-y-8 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id} className="w-[68%] shrink-0 snap-start sm:w-auto">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

