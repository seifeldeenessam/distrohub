import Link from "next/link";
import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/products", label: "All products" },
      { href: "/products?price=free", label: "Free products" },
      { href: "/search", label: "Search" },
      { href: "/account", label: "Your orders" },
    ],
  },
  {
    title: "Creators",
    links: [
      { href: "/docs", label: "Sell on Distrohub" },
      { href: "/docs#license-api", label: "License API" },
      { href: "/docs#developer-api", label: "Developer API" },
      { href: "/login", label: "Sign in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:grid-cols-[1fr_auto_auto] sm:gap-16 sm:px-6">
        <div>
          <Link href="/" aria-label="Distrohub home"><Logo size={28} /></Link>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Digital goods from independent creators. Free or pay once, and keep the download.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-sm font-semibold">{col.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {col.links.map((l) => (
                <li key={l.href}><Link href={l.href} className="hover:text-ink">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="border-t border-line py-6 text-xs text-muted">© {new Date().getFullYear()} Distrohub</p>
      </div>
    </footer>
  );
}
