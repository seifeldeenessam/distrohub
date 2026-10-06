"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Re-renders the server page every 2s while the payment webhook is in flight. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}

/** Kicks off the download once per page view. */
export function StartDownload({ href }: { href: string }) {
  const started = useRef(false);
  useEffect(() => {
    const key = `dh-downloaded:${href}`;
    if (started.current) return;
    started.current = true;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    window.location.assign(href);
  }, [href]);
  return null;
}


export { CopyButton } from "@/components/copy-button";
