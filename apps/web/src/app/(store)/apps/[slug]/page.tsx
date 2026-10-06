import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { latestRelease } from "@/lib/releases";
import { listMedia, mediaUrl } from "@/lib/media";
import { MediaGallery } from "@/components/media-gallery";
import { AppIcon } from "@/components/app-icon";
import { PLATFORM_LABEL } from "@/components/platform";
import { KIND_LABEL } from "@/components/product-kind";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  no_release: "There's no download available yet. Try again later.",
  invalid_email: "Enter a valid email address so we can send you the download link.",
  checkout_failed: "Checkout couldn't be started. Try again in a moment.",
  rate_limited: "Too many attempts. Wait a minute and try again.",
};

async function getApp(slug: string) {
  return db.app.findUnique({
    where: { slug },
    include: { owner: { select: { name: true } } },
  });
}

export async function generateMetadata({ params }: PageProps<"/apps/[slug]">): Promise<Metadata> {
  const app = await getApp((await params).slug);
  if (!app || app.status !== "PUBLISHED") return {};
  const cover = (await listMedia(app.id)).find((m) => m.kind === "IMAGE");
  return {
    title: app.name,
    description: app.tagline,
    ...(cover && { openGraph: { images: [mediaUrl(cover.id)] } }),
  };
}

export default async function AppPage({ params, searchParams }: PageProps<"/apps/[slug]">) {
  const { slug } = await params;
  const { error } = await searchParams;
  const app = await getApp(slug);
  if (!app || app.status !== "PUBLISHED") notFound();
  const [release, media] = await Promise.all([latestRelease(app.id), listMedia(app.id)]);
  const free = app.priceCents === 0;
  const errorMessage = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <article className="grid gap-12 pt-12 sm:pt-20 md:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <div className="flex items-start gap-5">
          <AppIcon name={app.name} iconUrl={app.iconUrl} size={96} />
          <div className="pt-1">
            <h1 className="text-4xl font-bold sm:text-5xl">{app.name}</h1>
            <p className="mt-2 text-lg text-muted">{app.tagline}</p>
          </div>
        </div>
        <MediaGallery name={app.name} items={media.map((m) => ({ id: m.id, kind: m.kind, url: mediaUrl(m.id) }))} />
        <div className="prose-plain mt-10 max-w-prose text-[1.0625rem]">
          {app.description.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="whitespace-pre-line">{para}</p>
          ))}
        </div>
      </div>

      <aside className="md:pt-2">
        <div className="panel p-5 md:sticky md:top-6">
          <form action="/api/checkout" method="post" className="space-y-3">
            <input type="hidden" name="slug" value={app.slug} />
            {free && (
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="input" />
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full py-3 text-base" disabled={!release}>
              {free ? "Download free" : `${formatPrice(app.priceCents, app.currency)} Download`}
            </button>
          </form>
          {errorMessage && <p role="alert" className="mt-3 rounded-md bg-danger-wash p-2 text-sm text-danger">{errorMessage}</p>}
          <p className="mt-3 text-sm text-muted">
            {free ? "Free. " : "One-time purchase. "}
            {app.licenseKeys
              ? `Your license key arrives by email and works on ${app.maxActivations} ${app.maxActivations === 1 ? "device" : "devices"}.`
              : "The download link arrives by email too and always has the newest version."}
          </p>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
            <dt className="text-muted">Type</dt>
            <dd>{KIND_LABEL[app.kind].one}</dd>
            {app.platform && (
              <>
                <dt className="text-muted">Platform</dt>
                <dd>{PLATFORM_LABEL[app.platform]}</dd>
              </>
            )}
            <dt className="text-muted">Version</dt>
            <dd>{release?.version ?? "Not released"}</dd>
            {release && (
              <>
                <dt className="text-muted">Size</dt>
                <dd>{formatBytes(release.fileSize)}</dd>
              </>
            )}
            <dt className="text-muted">Creator</dt>
            <dd>{app.websiteUrl ? <a href={app.websiteUrl} className="underline" rel="noopener">{app.owner.name}</a> : app.owner.name}</dd>
          </dl>
        </div>
      </aside>
    </article>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 ** 2) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
