import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="font-display text-xl font-bold">DistroHub</Link>
          <nav className="flex flex-1 gap-4 text-sm font-medium text-muted">
            <Link href="/dashboard" className="hover:text-ink">Apps</Link>
            <Link href="/dashboard/api-keys" className="hover:text-ink">API keys</Link>
            <Link href="/docs" className="hover:text-ink">Docs</Link>
          </nav>
          <form action={logout} className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{user.email}</span>
            <button className="btn btn-sm">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>
    </>
  );
}
