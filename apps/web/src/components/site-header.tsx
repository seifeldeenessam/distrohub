import Link from "next/link";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const sells = user ? (await db.app.count({ where: { ownerId: user.id } })) > 0 : false;
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Distrohub home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          {sells ? (
            <Link href="/dashboard" className="text-muted hover:text-ink">Dashboard</Link>
          ) : (
            <Link href="/docs" className="text-muted hover:text-ink">Sell on Distrohub</Link>
          )}
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
