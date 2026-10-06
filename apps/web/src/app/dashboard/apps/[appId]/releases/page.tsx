import { db } from "@/lib/db";
import { requireOwnedApp } from "@/lib/auth";
import { UploadRelease, DeleteReleaseButton } from "./upload";

export default async function ReleasesPage({ params }: PageProps<"/dashboard/apps/[appId]/releases">) {
  const { appId } = await params;
  await requireOwnedApp(appId);
  const releases = await db.release.findMany({ where: { appId, uploaded: true }, orderBy: { createdAt: "desc" } });

  return (
    <div className="grid gap-12 md:grid-cols-[1fr_320px]">
      <section>
        <h2 className="text-xl font-semibold">Files</h2>
        <p className="mt-1 text-muted">Buyers always download the newest version, including from old receipt emails.</p>
        {releases.length === 0 ? (
          <p className="panel mt-6 p-6 text-muted">Nothing uploaded yet. Upload the file buyers get, then publish.</p>
        ) : (
          <ul className="mt-6 border-t border-line">
            {releases.map((r, i) => (
              <li key={r.id} className="flex items-start gap-4 border-b border-line py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {r.version}
                    {i === 0 && <span className="ml-2 rounded-full bg-accent-wash px-2 py-0.5 text-xs font-semibold text-accent-ink">Latest</span>}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {r.fileName}, {(r.fileSize / 1024 ** 2).toFixed(1)} MB, {r.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </p>
                  {r.notes && <p className="mt-2 whitespace-pre-line text-sm">{r.notes}</p>}
                </div>
                <DeleteReleaseButton appId={appId} releaseId={r.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold">Upload a version</h2>
        <UploadRelease appId={appId} />
      </section>
    </div>
  );
}
