import Link from "next/link";
import { priceLabel } from "@/lib/money";
import type { ListedProduct } from "@/lib/catalog";
import { AppIcon } from "@/components/app-icon";
import { PLATFORM_LABEL } from "@/components/platform";
import { KIND_LABEL } from "@/components/product-kind";
import { Stars, formatRating } from "@/components/stars";

/** Store listing rows. `showCreator` is off on a creator's own page, where it would repeat. */
export function ProductList({ products, showCreator = true }: { products: ListedProduct[]; showCreator?: boolean }) {
  return (
    <ul className="border-t border-line">
      {products.map((app) => (
        <li key={app.id} className="border-b border-line">
          <Link href={`/apps/${app.slug}`} className="group flex items-center gap-4 py-5 sm:gap-6">
            <AppIcon name={app.name} iconUrl={app.iconUrl} size={64} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold group-hover:text-accent-ink">{app.name}</h3>
              <p className="truncate text-muted">{app.tagline}</p>
              <p className="mt-1 text-sm text-muted">
                {app.platform ? `${KIND_LABEL[app.kind].one} for ${PLATFORM_LABEL[app.platform]}` : KIND_LABEL[app.kind].one}
                {showCreator && <>, by {app.owner.name}</>}
              </p>
              {app.rating && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <Stars rating={app.rating.average} size={14} />
                  <span>{formatRating(app.rating.average)} ({app.rating.count})</span>
                </p>
              )}
            </div>
            <span className="rounded-full bg-accent-wash px-3 py-1 text-sm font-semibold text-accent-ink">
              {priceLabel(app.priceCents, app.currency)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Pill link used by the store filters. */
export function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium ${active ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}
