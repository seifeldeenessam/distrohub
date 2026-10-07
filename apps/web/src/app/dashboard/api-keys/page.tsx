import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { CreateKeyForm, RevokeKeyButton } from './client';

export const metadata = { title: 'API keys' };

export default async function ApiKeysPage() {
	const user = await requireUser();
	const keys = await db.apiKey.findMany({ where: { userId: user.id, revokedAt: null }, orderBy: { createdAt: 'desc' } });
	return (
		<div className="max-w-2xl">
			<h1 className="text-3xl font-bold">API keys</h1>
			<p className="text-muted mt-2">Secret keys for the creator API: upload releases from CI, look up and manage licenses from your own backend. Never put a secret key inside your app. The app only needs its App ID and public key.</p>
			<CreateKeyForm />
			{keys.length > 0 && (
				<ul className="border-line mt-8 border-t">
					{keys.map((k) => (
						<li key={k.id} className="border-line flex items-center gap-4 border-b py-4">
							<div className="flex-1">
								<p className="font-semibold">{k.name}</p>
								<p className="text-muted text-sm">
									<code className="font-mono">{k.prefix}…</code>, created {k.createdAt.toLocaleDateString('en-US', { dateStyle: 'medium' })},{' '}
									{k.lastUsedAt ? `last used ${k.lastUsedAt.toLocaleDateString('en-US', { dateStyle: 'medium' })}` : 'never used'}
								</p>
							</div>
							<RevokeKeyButton id={k.id} />
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
