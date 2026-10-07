import { AppIcon } from '@/components/app-icon';
import { db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AutoRefresh, CopyButton, StartDownload } from './client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your download' };

export default async function SuccessPage({ searchParams }: PageProps<'/purchase/success'>) {
	const { checkout_id } = await searchParams;
	if (typeof checkout_id !== 'string') notFound();
	const order = await db.order.findUnique({
		where: { checkoutId: checkout_id },
		include: { app: true, license: true }
	});
	if (!order) notFound();

	if (order.status === 'PENDING') {
		return (
			<div className="mx-auto max-w-md pt-24 text-center">
				<AutoRefresh />
				<h1 className="text-3xl font-bold">Confirming your payment</h1>
				<p className="text-muted mt-3">This usually takes a few seconds. The page updates on its own.</p>
			</div>
		);
	}

	if (order.status === 'REFUNDED') {
		return (
			<div className="mx-auto max-w-md pt-24 text-center">
				<h1 className="text-3xl font-bold">This purchase was refunded</h1>
				<p className="text-muted mt-3">The license key and download link are no longer active.</p>
			</div>
		);
	}

	const downloadHref = `/d/${order.downloadToken}`;
	const { license } = order;
	return (
		<div className="mx-auto max-w-lg pt-16 sm:pt-24">
			<StartDownload href={downloadHref} />
			<div className="flex items-center gap-4">
				<AppIcon name={order.app.name} iconUrl={order.app.iconUrl} size={56} />
				<div>
					<h1 className="text-3xl font-bold">{order.app.name} is downloading</h1>
					<p className="text-muted">
						Didn&apos;t start?{' '}
						<a href={downloadHref} className="text-accent-ink font-medium underline">
							Download it again
						</a>
						.
					</p>
				</div>
			</div>

			{license ? (
				<>
					<div className="ticket mt-10">
						<div className="p-6">
							<p className="text-muted text-sm">License key</p>
							<div className="mt-2 flex flex-wrap items-center justify-between gap-3">
								<code className="font-mono text-xl font-medium tracking-wide sm:text-2xl">{license.key}</code>
								<CopyButton value={license.key} />
							</div>
						</div>
						<div className="ticket-tear" />
						<div className="text-muted p-6 text-sm">
							A copy is on its way to <span className="text-ink font-medium">{order.email}</span>. Works on up to {license.maxActivations} {license.maxActivations === 1 ? 'device' : 'devices'}.
						</div>
					</div>

					<ol className="mt-10 space-y-3 text-[0.9375rem]">
						<li>
							<span className="font-semibold">Install.</span> Open the file you just downloaded.
						</li>
						<li>
							<span className="font-semibold">Open {order.app.name}.</span> It asks for a license key on first launch.
						</li>
						<li>
							<span className="font-semibold">Paste the key.</span> It unlocks.
						</li>
					</ol>
				</>
			) : (
				<p className="panel text-muted mt-10 p-6 text-sm">
					The download link is on its way to <span className="text-ink font-medium">{order.email}</span>. Keep the email: the link keeps working and always has the newest version.
				</p>
			)}
			<p className="mt-10 text-sm">
				<Link href="/" className="text-muted underline">
					Back to the store
				</Link>
			</p>
		</div>
	);
}
