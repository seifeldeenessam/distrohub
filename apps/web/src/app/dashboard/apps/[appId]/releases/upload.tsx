"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteRelease, finishReleaseUpload, startReleaseUpload } from "../../../actions";

function put(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and the bucket's CORS settings."));
    xhr.send(file);
  });
}

export function UploadRelease({ appId }: { appId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File;
    if (!file || file.size === 0) return setError("Choose a file to upload.");

    const started = await startReleaseUpload(appId, {
      version: form.get("version"),
      notes: form.get("notes"),
      fileName: file.name,
      fileSize: file.size,
    });
    if (!started.ok) return setError(started.message);

    try {
      setProgress(0);
      await put(started.uploadUrl, file, setProgress);
      const done = await finishReleaseUpload(appId, started.releaseId);
      if (!done.ok) throw new Error(done.message);
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgress(null);
    }
  }

  const uploading = progress !== null;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
      <div>
        <label htmlFor="version" className="label">Version</label>
        <input id="version" name="version" required placeholder="1.0.0" className="input" />
      </div>
      <div>
        <label htmlFor="file" className="label">File</label>
        <input id="file" name="file" type="file" required className="input" />
        <p className="hint">.dmg, .zip, .pkg, .exe, .msi or .AppImage, up to 2 GB.</p>
      </div>
      <div>
        <label htmlFor="notes" className="label">Release notes</label>
        <textarea id="notes" name="notes" rows={3} className="input" />
      </div>
      {error && <p role="alert" className="rounded-md bg-danger-wash p-2 text-sm text-danger">{error}</p>}
      {uploading && (
        <div aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="hint">Uploading, {progress}%</p>
        </div>
      )}
      <button className="btn btn-primary w-full" disabled={uploading}>Upload release</button>
    </form>
  );
}

export function DeleteReleaseButton({ appId, releaseId }: { appId: string; releaseId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-sm btn-danger"
      disabled={pending}
      onClick={() => confirm("Delete this release? Buyers will get the previous one.") && start(() => deleteRelease(appId, releaseId))}
    >
      Delete
    </button>
  );
}
