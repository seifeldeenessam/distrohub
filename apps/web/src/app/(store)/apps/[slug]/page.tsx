import { AppIcon } from '@/components/app-icon';
import { MediaGallery } from '@/components/media-gallery';
import { PLATFORM_LABEL } from '@/components/platform';
import { KIND_LABEL } from '@/components/product-kind';
import { Stars, formatRating } from '@/components/stars';
import { getCurrentUser } from '@/lib/auth';
import { hasPurchased } from '@/lib/customer';
import { db } from '@/lib/db';
import { listMedia, mediaUrl } from '@/lib/media';
import { formatPrice } from '@/lib/money';
import { latestRelease } from '@/lib/releases';
import { listReviews, ratingSummary } from '@/lib/reviews';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReviewForm } from './review-form';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
	no_release: "There's no download available yet. Try again later.",
	invalid_email: 'Enter a valid email address so we can send you the download link.',
	checkout_failed: "Checkout couldn't be started. Try again in a moment.",
	rate_limited: 'Too many attempts. Wait a minute and try again.'
};

async function getApp(slug: string) {
	return db.app.findUnique({
		where: { slug },
		include: { owner: { select: { id: true, name: true } } }
	});
}

export async function generateMetadata({ params }: PageProps<'/apps/[slug]'>): Promise<Metadata> {
	const app = await getApp((await params).slug);
	if (!app || app.status !== 'PUBLISHED') return {};
	const cover = (await listMedia(app.id)).find((m) => m.kind === 'IMAGE');
	return {
		title: app.name,
		description: app.tagline,
		...(cover && { openGraph: { images: [mediaUrl(cover.id)] } })
	};
}

export default async function AppPage({ params, searchParams }: PageProps<'/apps/[slug]'>) {
	const { slug } = await params;
	const { error } = await searchParams;
	const app = await getApp(slug);
	if (!app || app.status !== 'PUBLISHED') notFound();
	const [release, media, user, rating, reviews] = await Promise.all([latestRelease(app.id), listMedia(app.id), getCurrentUser(), ratingSummary(app.id), listReviews(app.id)]);
	const isOwner = user?.id === app.ownerId;
	const canReview = !!user && !isOwner && (await hasPurchased(user, app.id));
	const myReview = user ? reviews.find((r) => r.userId === user.id) : undefined;
	const free = app.priceCents === 0;
	const errorMessage = typeof error === 'string' ? ERRORS[error] : undefined;

	return (
		<article className="grid gap-12 pt-12 sm:pt-20 md:grid-cols-[1fr_280px] md:gap-y-14">
			<div className="min-w-0">
				<div className="flex items-start gap-5">
					<AppIcon name={app.name} iconUrl={app.iconUrl} size={96} />
					<div className="pt-1">
						<h1 className="text-4xl font-bold sm:text-5xl">{app.name}</h1>
						<p className="text-muted mt-2 text-lg">{app.tagline}</p>
						{rating && (
							<a href="#reviews" className="text-muted hover:text-ink mt-2 inline-flex items-center gap-2 text-sm">
								<Stars rating={rating.average} />
								<span>
									<span className="text-ink font-semibold">{formatRating(rating.average)}</span> ({rating.count} {rating.count === 1 ? 'review' : 'reviews'})
								</span>
							</a>
						)}
					</div>
				</div>
				<MediaGallery name={app.name} items={media.map((m) => ({ id: m.id, kind: m.kind, url: mediaUrl(m.id) }))} />
				<div className="prose-plain mt-10 max-w-prose text-[1.0625rem]">
					{app.description.split(/\n{2,}/).map((para, i) => (
						<p key={i} className="whitespace-pre-line">
							{para}
						</p>
					))}
				</div>
			</div>

			<aside className="md:row-span-2 md:pt-2">
				<div className="panel p-5 md:sticky md:top-6">
					<form action="/api/checkout" method="post" className="space-y-3">
						<input type="hidden" name="slug" value={app.slug} />
						{free && user && (
							<p className="text-muted text-sm">
								The download link goes to <span className="text-ink font-medium">{user.email}</span>.
							</p>
						)}
						{free && !user && (
							<div>
								<label htmlFor="email" className="label">
									Email
								</label>
								<input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="input" />
							</div>
						)}
						<button type="submit" className="btn btn-primary w-full py-3 text-base" disabled={!release}>
							{free ? 'Download free' : `${formatPrice(app.priceCents, app.currency)} Download`}
						</button>
					</form>
					{errorMessage && (
						<p role="alert" className="bg-danger-wash text-danger mt-3 rounded-md p-2 text-sm">
							{errorMessage}
						</p>
					)}
					<p className="text-muted mt-3 text-sm">
						{free ? 'Free. ' : 'One-time purchase. '}
						{app.licenseKeys ? `Your license key arrives by email and works on ${app.maxActivations} ${app.maxActivations === 1 ? 'device' : 'devices'}.` : 'The download link arrives by email too and always has the newest version.'}
					</p>
					<dl className="border-line mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t pt-4 text-sm">
						<dt className="text-muted">Type</dt>
						<dd>{KIND_LABEL[app.kind].one}</dd>
						{app.platform && (
							<>
								<dt className="text-muted">Platform</dt>
								<dd>{PLATFORM_LABEL[app.platform]}</dd>
							</>
						)}
						<dt className="text-muted">Version</dt>
						<dd>{release?.version ?? 'Not released'}</dd>
						{release && (
							<>
								<dt className="text-muted">Size</dt>
								<dd>{formatBytes(release.fileSize)}</dd>
							</>
						)}
						<dt className="text-muted">Creator</dt>
						<dd>
							<Link href={`/creators/${app.owner.id}`} className="underline">
								{app.owner.name}
							</Link>
						</dd>
						{app.websiteUrl && (
							<>
								<dt className="text-muted">Website</dt>
								<dd className="truncate">
									<a href={app.websiteUrl} className="underline" rel="noopener">
										{new URL(app.websiteUrl).host}
									</a>
								</dd>
							</>
						)}
					</dl>
				</div>
			</aside>

			<section id="reviews" className="border-line min-w-0 scroll-mt-8 border-t pt-10 md:col-start-1">
				<div className="flex flex-wrap items-baseline justify-between gap-3">
					<h2 className="text-2xl font-bold">Reviews</h2>
					{rating && (
						<p className="text-muted flex items-center gap-2 text-sm">
							<Stars rating={rating.average} />
							<span>
								<span className="text-ink font-semibold">{formatRating(rating.average)}</span> out of 5, {rating.count} {rating.count === 1 ? 'review' : 'reviews'}
							</span>
						</p>
					)}
				</div>

				<div className="mt-6">
					{canReview ? (
						<ReviewForm appId={app.id} existing={myReview && { rating: myReview.rating, body: myReview.body }} needsName={!user!.name} />
					) : !user ? (
						<p className="text-muted text-sm">
							Got this product?{' '}
							<Link href={`/login?next=${encodeURIComponent(`/apps/${app.slug}#reviews`)}`} className="text-ink font-medium underline">
								Sign in
							</Link>{' '}
							with the email you used to review it.
						</p>
					) : !isOwner ? (
						<p className="text-muted text-sm">
							Only people who got {app.name} can review it. Signed in as {user.email}.
						</p>
					) : null}
				</div>

				{reviews.length === 0 ? (
					<p className="text-muted mt-6">No reviews yet.</p>
				) : (
					<ul className="mt-6 space-y-6">
						{reviews.map((r) => (
							<li key={r.id} className="border-line border-b pb-6 last:border-0">
								<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
									<Stars rating={r.rating} />
									<span className="font-semibold">{r.user.name || 'A buyer'}</span>
									<span className="text-muted text-sm">
										<time dateTime={r.createdAt.toISOString()}>{formatDate(r.createdAt)}</time>
										{r.userId === user?.id && ' (you)'}
									</span>
								</div>
								{r.body && <p className="mt-2 max-w-prose whitespace-pre-line">{r.body}</p>}
							</li>
						))}
					</ul>
				)}
			</section>
		</article>
	);
}

const formatDate = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

function formatBytes(bytes: number) {
	if (bytes < 1024 ** 2) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
	return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
