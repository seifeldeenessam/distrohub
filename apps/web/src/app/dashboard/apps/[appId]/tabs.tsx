"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/releases", label: "Releases" },
  { href: "/licenses", label: "Licenses" },
  { href: "/settings", label: "Settings" },
];

export function Tabs({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav className="mt-8 flex gap-6 overflow-x-auto border-b border-line text-sm font-medium">
      {TABS.map((tab) => {
        const href = base + tab.href;
        const active = pathname === href;
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 ${active ? "border-ledger text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
