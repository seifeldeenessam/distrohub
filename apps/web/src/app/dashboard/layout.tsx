import { Logo, LogoMark } from '@/components/logo';
import { requireUser } from '@/lib/auth';
import Link from 'next/link';
import { ProfileForm } from '../(store)/account/client';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
	const user = await requireUser('/dashboard');
	return (
		<>
			<header className="border-line border-b">
				<div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
					<Link href="/" aria-label="Distrohub home">
						<span className="sm:hidden">
							<LogoMark size={28} />
						</span>
						<span className="hidden sm:inline">
							<Logo size={28} />
						</span>
					</Link>
					<nav className="text-muted flex flex-1 gap-4 text-sm font-medium whitespace-nowrap">
						<Link href="/dashboard" className="hover:text-ink">
							Products
						</Link>
						<Link href="/dashboard/api-keys" className="hover:text-ink">
							API keys
						</Link>
						<Link href="/docs" className="hover:text-ink">
							Docs
						</Link>
					</nav>
					<div className="flex items-center gap-3 text-sm">
						<span className="text-muted hidden sm:inline">{user.email}</span>
						<Link href="/account" className="btn btn-sm whitespace-nowrap">
							Account
						</Link>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
				{user.name ? (
					children
				) : (
					// Accounts made from a purchase or plain sign-in have no name yet; products need a creator name.
					<div className="max-w-md">
						<h1 className="text-3xl font-bold">Start selling</h1>
						<p className="text-muted mt-2 mb-6">Add the name buyers see as the creator of your products.</p>
						<ProfileForm name="" label="Continue" />
					</div>
				)}
			</main>
		</>
	);
}
