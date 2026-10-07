import { CreatorAvatar } from '@/components/creator-avatar';
import { ProductList } from '@/components/product-list';
import { LISTED, findListed } from '@/lib/catalog';
import { db } from '@/lib/db';
import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: PageProps<'/search'>): Promise<Metadata> {
	const { q } = await searchParams;
	return { title: typeof q === 'string' && q.trim() ? `Search: ${q.trim()}` : 'Search' };
}

export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
	const sp = await searchParams;
	const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
	const match = { contains: q, mode: 'insensitive' } as const;

	const [products, creators] = q
		? await Promise.all([
				findListed({
					where: {
						OR: [{ name: match }, { tagline: match }, { description: match }, { owner: { name: match } }]
					},
					take: 50
				}),
				db.user.findMany({
					where: { name: match, apps: { some: LISTED } },
					select: { id: true, name: true, _count: { select: { apps: { where: LISTED } } } },
					orderBy: { name: 'asc' },
					take: 6
				})
			])
		: [[], []];

	return (
		<div className="pt-12">
			<h1 className="text-4xl font-bold">Search</h1>
			<form action="/search" role="search" className="mt-6 flex gap-2">
				<input name="q" type="search" defaultValue={q} autoFocus={!q} placeholder="Products, creators, keywords" aria-label="Search products and creators" className="input" />
				<button className="btn btn-primary">Search</button>
			</form>

			{!q ? (
				<p className="text-muted mt-8">
					Search by name, description or creator. Or{' '}
					<Link href="/products" className="underline">
						browse all products
					</Link>
					.
				</p>
			) : products.length === 0 && creators.length === 0 ? (
				<div className="py-16 text-center">
					<p className="text-lg font-semibold">Nothing matches &ldquo;{q}&rdquo;.</p>
					<p className="text-muted mt-2">
						Try a shorter word, or{' '}
						<Link href="/products" className="underline">
							browse all products
						</Link>
						.
					</p>
				</div>
			) : (
				<>
					{creators.length > 0 && (
						<section className="mt-10">
							<h2 className="text-muted text-sm font-semibold">Creators</h2>
							<ul className="mt-3 flex flex-wrap gap-2">
								{creators.map((d) => (
									<li key={d.id}>
										<Link href={`/creators/${d.id}`} className="panel hover:border-ink flex items-center gap-3 py-2 pr-4 pl-2">
											<CreatorAvatar name={d.name} size={36} />
											<span>
												<span className="block font-semibold">{d.name}</span>
												<span className="text-muted block text-xs">
													{d._count.apps} {d._count.apps === 1 ? 'product' : 'products'}
												</span>
											</span>
										</Link>
									</li>
								))}
							</ul>
						</section>
					)}
					<section className="mt-10">
						<h2 className="text-muted mb-3 text-sm font-semibold">
							{products.length} {products.length === 1 ? 'product' : 'products'}
						</h2>
						{products.length > 0 && <ProductList products={products} />}
					</section>
				</>
			)}
		</div>
	);
}
