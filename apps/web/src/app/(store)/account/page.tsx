import { AppIcon } from '@/components/app-icon';
import { CopyButton } from '@/components/copy-button';
import { Stars } from '@/components/stars';
import { requireUser } from '@/lib/auth';
import { accountOrdersWhere } from '@/lib/customer';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/money';
import Link from 'next/link';
import { logout } from '../../(auth)/actions';
import { ProfileForm, RemoveDeviceButton } from './client';

export const metadata = { title: 'Your account' };

export default async function AccountPage() {
	const user = await requireUser('/account');
	const [orders, reviews, sells] = await Promise.all([
		db.order.findMany({
			where: accountOrdersWhere(user),
			orderBy: { paidAt: 'desc' },
			include: {
				app: { select: { id: true, slug: true, name: true, iconUrl: true, status: true } },
				license: { include: { activations: { orderBy: { createdAt: 'asc' } } } }
			}
		}),
		db.review.findMany({ where: { userId: user.id }, select: { appId: true, rating: true } }),
		db.app.count({ where: { ownerId: user.id } })
	]);
	const reviewByApp = new Map(reviews.map((r) => [r.appId, r.rating]));

	return (
		<div className="mx-auto max-w-3xl pt-12 sm:pt-16">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold">Your account</h1>
					<p className="text-muted mt-1">{user.email}</p>
				</div>
				<form action={logout} className="flex gap-2">
					{sells > 0 && (
						<Link href="/dashboard" className="btn btn-sm">
							Dashboard
						</Link>
					)}
					<button className="btn btn-sm">Sign out</button>
				</form>
			</div>

			<section className="mt-10 max-w-md">
				<ProfileForm name={user.name} />
			</section>

			<section className="mt-12">
				<h2 className="text-xl font-semibold">Orders</h2>
				{orders.length === 0 ? (
					<div className="panel text-muted mt-4 p-6">
						<p>No orders for {user.email} yet.</p>
						<p className="mt-2 text-sm">
							Anything you buy or download for free with this email shows up here, including orders from before you signed up.{' '}
							<Link href="/" className="text-ink font-medium underline">
								Browse the store
							</Link>
						</p>
					</div>
				) : (
					<ul className="mt-4 space-y-4">
						{orders.map((order) => {
							const { app, license } = order;
							const paid = order.status === 'PAID';
							const rated = reviewByApp.get(app.id);
							const date = (order.paidAt ?? order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
							return (
								<li key={order.id} className="panel p-5">
									<div className="flex flex-wrap items-center gap-4">
										<AppIcon name={app.name} iconUrl={app.iconUrl} size={48} />
										<div className="min-w-0 flex-1">
											<p className="font-semibold">
												{app.status === 'PUBLISHED' ? (
													<Link href={`/apps/${app.slug}`} className="hover:text-accent-ink">
														{app.name}
													</Link>
												) : (
													app.name
												)}
											</p>
											<p className="text-muted text-sm">
												{date}, {order.amountCents === 0 ? 'Free' : formatPrice(order.amountCents, order.currency)}
												{!paid && <span className="bg-danger-wash text-danger ml-2 rounded-full px-2 py-0.5 text-xs font-semibold">Refunded</span>}
											</p>
										</div>
										{paid && (
											<a href={`/d/${order.downloadToken}`} className="btn btn-primary btn-sm">
												Download
											</a>
										)}
									</div>

									{license && paid && (
										<div className="border-line mt-4 border-t pt-4">
											<p className="text-muted text-sm">License key</p>
											<div className="mt-1 flex flex-wrap items-center gap-3">
												<code className="min-w-0 font-mono text-base font-medium tracking-wide break-all">{license.key}</code>
												<CopyButton value={license.key} />
												{license.status === 'REVOKED' && <span className="text-danger text-sm font-semibold">Revoked</span>}
											</div>
											<p className="text-muted mt-3 text-sm">
												Active on {license.activations.length} of {license.maxActivations} {license.maxActivations === 1 ? 'device' : 'devices'}
											</p>
											{license.activations.length > 0 && (
												<ul className="divide-line border-line mt-2 divide-y rounded-lg border">
													{license.activations.map((a) => (
														<li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
															<span className="min-w-0">
																<span className="block truncate font-medium">{a.deviceName || 'Unnamed device'}</span>
																<span className="text-muted">Last seen {a.lastSeenAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
															</span>
															<RemoveDeviceButton activationId={a.id} deviceName={a.deviceName || 'this device'} />
														</li>
													))}
												</ul>
											)}
										</div>
									)}

									{paid && app.status === 'PUBLISHED' && (
										<div className="border-line mt-4 flex items-center gap-3 border-t pt-4 text-sm">
											{rated ? (
												<>
													<Stars rating={rated} size={14} />
													<Link href={`/apps/${app.slug}#reviews`} className="text-muted hover:text-ink underline">
														Edit your review
													</Link>
												</>
											) : (
												<Link href={`/apps/${app.slug}#reviews`} className="text-accent-ink font-medium underline">
													Write a review
												</Link>
											)}
										</div>
									)}
								</li>
							);
						})}
					</ul>
				)}
			</section>
		</div>
	);
}
