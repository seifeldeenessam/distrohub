'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { deleteMedia, finishMediaUpload, moveMedia, startMediaUpload } from '../../../actions';

function put(url: string, file: File, contentType: string, onProgress: (pct: number) => void) {
	return new Promise<void>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', url);
		// Must match the type the upload URL was signed with.
		xhr.setRequestHeader('Content-Type', contentType);
		xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
		xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`)));
		xhr.onerror = () => reject(new Error("Upload failed. Check your connection and the bucket's CORS settings."));
		xhr.send(file);
	});
}

export function UploadMedia({ appId, remaining }: { appId: string; remaining: number }) {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const [status, setStatus] = useState<{ name: string; index: number; total: number; progress: number } | null>(null);
	const [errors, setErrors] = useState<string[]>([]);

	async function upload(files: File[]) {
		setErrors([]);
		const failed: string[] = [];
		if (files.length > remaining) {
			failed.push(`Only ${remaining} more ${remaining === 1 ? 'item fits' : 'items fit'}. Uploading the first ${remaining}.`);
			files = files.slice(0, remaining);
		}
		for (const [index, file] of files.entries()) {
			setStatus({ name: file.name, index, total: files.length, progress: 0 });
			try {
				const started = await startMediaUpload(appId, { contentType: file.type, fileSize: file.size });
				if (!started.ok) throw new Error(started.message);
				await put(started.uploadUrl, file, file.type, (progress) => setStatus((s) => s && { ...s, progress }));
				const done = await finishMediaUpload(appId, started.mediaId);
				if (!done.ok) throw new Error(done.message);
			} catch (err) {
				failed.push(`${file.name}: ${(err as Error).message}`);
			}
		}
		setStatus(null);
		setErrors(failed);
		if (inputRef.current) inputRef.current.value = '';
		router.refresh();
	}

	const uploading = status !== null;
	return (
		<div className="mt-4 space-y-4">
			<div>
				<label htmlFor="media" className="label">
					Images or video
				</label>
				<input
					ref={inputRef}
					id="media"
					type="file"
					multiple
					accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
					disabled={uploading || remaining <= 0}
					onChange={(e) => e.target.files?.length && upload([...e.target.files])}
					className="input"
				/>
				<p className="hint">{remaining > 0 ? 'PNG, JPEG, WebP or GIF up to 10 MB. MP4 or WebM video up to 200 MB. 16:9 looks best.' : 'Gallery is full. Delete an item to add another.'}</p>
			</div>
			{errors.length > 0 && (
				<ul role="alert" className="bg-danger-wash text-danger space-y-1 rounded-md p-2 text-sm">
					{errors.map((e) => (
						<li key={e}>{e}</li>
					))}
				</ul>
			)}
			{uploading && (
				<div aria-live="polite">
					<div className="bg-line h-2 overflow-hidden rounded-full">
						<div className="bg-brand h-full transition-[width]" style={{ width: `${status.progress}%` }} />
					</div>
					<p className="hint truncate">
						Uploading {status.total > 1 && `${status.index + 1} of ${status.total}, `}
						{status.name}, {status.progress}%
					</p>
				</div>
			)}
		</div>
	);
}

export function MediaActions({ appId, mediaId, first, last }: { appId: string; mediaId: string; first: boolean; last: boolean }) {
	const [pending, start] = useTransition();
	return (
		<div className="flex items-center gap-1 p-2">
			<button className="btn btn-sm" aria-label="Move earlier" disabled={pending || first} onClick={() => start(() => moveMedia(appId, mediaId, -1))}>
				←
			</button>
			<button className="btn btn-sm" aria-label="Move later" disabled={pending || last} onClick={() => start(() => moveMedia(appId, mediaId, 1))}>
				→
			</button>
			<button className="btn btn-sm btn-danger ml-auto" disabled={pending} onClick={() => confirm('Delete this from the gallery?') && start(() => deleteMedia(appId, mediaId))}>
				Delete
			</button>
		</div>
	);
}
