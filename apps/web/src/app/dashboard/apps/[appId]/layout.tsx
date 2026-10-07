import { AppIcon } from '@/components/app-icon';
import { requireOwnedApp } from '@/lib/auth';
import Link from 'next/link';
import { Tabs } from './tabs';

export default async function AppLayout({ children, params }: LayoutProps<'/dashboard/apps/[appId]'>) {
	const { appId } = await params;
	const { app } = await requireOwnedApp(appId);
	return (
		<>
			<div className="flex flex-wrap items-center gap-4">
				<AppIcon name={app.name} iconUrl={app.iconUrl} size={56} />
				<div className="flex-1">
					<h1 className="text-3xl font-bold">{app.name}</h1>
					<p className="text-muted text-sm">
						{app.status === 'PUBLISHED' ? (
							<Link href={`/apps/${app.slug}`} className="underline">
								Live at /apps/{app.slug}
							</Link>
						) : (
							'Draft, not visible in the store'
						)}
					</p>
				</div>
			</div>
			<Tabs base={`/dashboard/apps/${app.id}`} licenses={app.licenseKeys} />
			<div className="pt-8">{children}</div>
		</>
	);
}
