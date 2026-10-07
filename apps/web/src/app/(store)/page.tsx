import { CreatorAvatar } from '@/components/creator-avatar';
import { PriceTag, ProductCover, ProductShelf, kindLine } from '@/components/product-card';
import { KIND_LABEL, PRODUCT_KINDS } from '@/components/product-kind';
import { Stars, formatRating } from '@/components/stars';
import { LISTED, findListed } from '@/lib/catalog';
import { db } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const SHELF = 8;

/** Listed products with the most paid (or claimed) orders, most first. */
async function findPopular() {
	const counts = await db.order.groupBy({
		by: ['appId'],
		where: { status: 'PAID', app: LISTED },
		_count: { appId: true },
		orderBy: { _count: { appId: 'desc' } },
		take: SHELF
	});
	const products = await findListed({ where: { id: { in: counts.map((c) => c.appId) } }, take: SHELF });
	const rank = new Map(counts.map((c, i) => [c.appId, i]));
	const downloads = new Map(counts.map((c) => [c.appId, c._count.appId]));
	return products.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!).map((p) => ({ ...p, downloads: downloads.get(p.id) ?? 0 }));
}

export default async function HomePage() {
	const [popular, latest, free, kinds, creators, creatorCount] = await Promise.all([
		findPopular(),
		findListed({ take: SHELF }),
		findListed({ where: { priceCents: 0 }, take: SHELF }),
		db.app.groupBy({ by: ['kind'], where: LISTED, _count: { kind: true } }),
		db.user.findMany({
			where: { name: { not: '' }, apps: { some: LISTED } },
			select: { id: true, name: true, _count: { select: { apps: { where: LISTED } } } },
			orderBy: { apps: { _count: 'desc' } },
			take: 8
		}),
		db.user.count({ where: { name: { not: '' }, apps: { some: LISTED } } })
	]);
	const kindCounts = PRODUCT_KINDS.flatMap((k) => {
		const n = kinds.find((g) => g.kind === k)?._count.kind;
		return n ? [{ kind: k, count: n }] : [];
	});
	const total = kindCounts.reduce((sum, k) => sum + k.count, 0);
	const featured = popular[0] ?? (latest[0] && { ...latest[0], downloads: 0 });

	return (
		<>
			<section className="grid gap-10 pt-10 pb-4 sm:pt-16 md:grid-cols-[1fr_1.15fr] md:items-center md:gap-12">
				<div>
					<h1 className="text-4xl leading-[1.05] font-bold sm:text-5xl">Buy straight from the people who make it.</h1>
					<p className="text-muted mt-4 max-w-md text-lg">
						{total > 0 ? `${total} ${total === 1 ? 'product' : 'products'} from ${creatorCount} independent ${creatorCount === 1 ? 'creator' : 'creators'}. ` : ''}
						Free or pay once, and the download is yours to keep.
					</p>
					<form action="/search" role="search" className="mt-7 flex max-w-md gap-2">
						<input name="q" type="search" placeholder="Search products and creators" aria-label="Search products and creators" className="input" />
						<button className="btn btn-primary">Search</button>
					</form>
					{kindCounts.length > 0 && (
						<nav aria-label="Browse by type" className="mt-6 flex max-w-md flex-wrap gap-2 text-sm">
							{kindCounts.map(({ kind, count }) => (
								<Link key={kind} href={`/products?type=${kind}`} className="btn btn-sm">
									{KIND_LABEL[kind].many}
									<span className="text-muted font-medium">{count}</span>
								</Link>
							))}
							{free.length > 0 && (
								<Link href="/products?price=free" className="btn btn-sm">
									Free
								</Link>
							)}
						</nav>
					)}
				</div>

				{featured && (
					<Link href={`/apps/${featured.slug}`} className="group block rounded-2xl" aria-label={`${featured.name}, ${kindLine(featured)}`}>
						<div className="border-line bg-surface relative aspect-[4/3] overflow-hidden rounded-2xl border">
							<ProductCover product={featured} large />
							<PriceTag product={featured} className="absolute top-5 right-5 text-base" />
						</div>
						<div className="mt-4 flex items-start justify-between gap-4">
							<div className="min-w-0">
								<p className="text-muted text-sm font-medium">{featured.downloads > 0 ? 'Most downloaded' : 'Just added'}</p>
								<h2 className="mt-0.5 truncate text-2xl font-bold group-hover:underline">{featured.name}</h2>
								<p className="text-muted mt-1">{featured.tagline}</p>
							</div>
							{featured.rating && (
								<p className="text-muted flex shrink-0 items-center gap-1.5 pt-6 text-sm">
									<Stars rating={featured.rating.average} size={14} />
									{formatRating(featured.rating.average)}
								</p>
							)}
						</div>
					</Link>
				)}
			</section>

			{total === 0 ? (
				<div className="border-line mt-12 border-t py-16 text-center">
					<p className="text-lg font-semibold">Nothing is listed yet.</p>
					<p className="text-muted mt-2">
						Making something?{' '}
						<Link href="/docs#get-started" className="underline">
							Start selling
						</Link>
						.
					</p>
				</div>
			) : (
				<>
					<ProductShelf title="Popular" href="/products" linkLabel="See all products" products={popular.slice(1, 5)} />
					<ProductShelf title="New on Distrohub" href="/products" linkLabel="See all products" products={latest} />
					<ProductShelf title="Free downloads" href="/products?price=free" linkLabel="See all free" products={free.slice(0, 4)} />

					{creators.length > 0 && (
						<section className="mt-14" aria-label="Creators">
							<h2 className="mb-4 text-2xl font-bold">Creators</h2>
							<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								{creators.map((c) => (
									<li key={c.id}>
										<Link href={`/creators/${c.id}`} className="panel hover:border-muted flex items-center gap-3 p-3">
											<CreatorAvatar name={c.name} size={44} />
											<span className="min-w-0">
												<span className="block truncate font-semibold">{c.name}</span>
												<span className="text-muted block text-sm">
													{c._count.apps} {c._count.apps === 1 ? 'product' : 'products'}
												</span>
											</span>
										</Link>
									</li>
								))}
							</ul>
						</section>
					)}
				</>
			)}

			<section className="border-line bg-accent-wash mt-16 flex flex-col gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
				<div className="max-w-lg">
					<h2 className="text-2xl font-bold">Sell what you make</h2>
					<p className="text-muted mt-2">Upload a file, set a price from $0 and get paid through Polar. Software can add license keys in a few lines.</p>
				</div>
				<Link href="/docs#get-started" className="btn btn-primary shrink-0">
					Start selling
				</Link>
			</section>
		</>
	);
}
