import Link from "next/link";
import { Logo, LogoMark } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const sells = user ? (await db.app.count({ where: { ownerId: user.id } })) > 0 : false;
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Distrohub home">
          <span className="sm:hidden"><LogoMark size={28} /></span>
          <span className="hidden sm:inline"><Logo /></span>
        </Link>
        <nav className="flex items-center gap-4 whitespace-nowrap text-sm font-medium sm:gap-5">
          <Link href="/products" className="text-muted hover:text-ink">Products</Link>
          <Link href="/search" className="text-muted hover:text-ink">Search</Link>
          {sells && <Link href="/dashboard" className="text-muted hover:text-ink">Dashboard</Link>}
          {user ? (
            <Link href="/account" className="btn btn-sm">Account</Link>
          ) : (
            <Link href="/login" className="btn btn-sm">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
