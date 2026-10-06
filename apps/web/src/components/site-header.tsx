import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          DistroHub
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/docs" className="text-muted hover:text-ink">For developers</Link>
          {user ? (
            <Link href="/dashboard" className="btn btn-sm">Dashboard</Link>
          ) : (
            <Link href="/login" className="btn btn-sm">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
