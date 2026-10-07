import { env } from '@/lib/env';
import { contentDisposition, localPath, verifyLocalSignature } from '@/lib/storage';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// Serves the "local" storage driver (development only). Production uses R2/S3 presigned URLs.

function authorize(req: Request, op: 'put' | 'get' | 'view') {
	if (env.storageDriver !== 'local') return null;
	const url = new URL(req.url);
	const key = url.searchParams.get('key') ?? '';
	const expires = Number(url.searchParams.get('expires'));
	const sig = url.searchParams.get('sig') ?? '';
	const type = url.searchParams.get('type') ?? '';
	if (!key || !verifyLocalSignature(op, key, expires, sig, type)) return null;
	return { key, type, name: url.searchParams.get('name') ?? path.basename(key) };
}

export async function PUT(req: Request) {
	const auth = authorize(req, 'put');
	if (!auth || !req.body) return new Response('Forbidden', { status: 403 });
	const file = localPath(auth.key);
	await mkdir(path.dirname(file), { recursive: true });
	const tmp = `${file}.part`;
	await pipeline(Readable.fromWeb(req.body as import('node:stream/web').ReadableStream), createWriteStream(tmp));
	await rename(tmp, file);
	return new Response(null, { status: 200 });
}

export async function GET(req: Request) {
	const view = new URL(req.url).searchParams.get('op') === 'view';
	const auth = authorize(req, view ? 'view' : 'get');
	if (!auth) return new Response('Forbidden', { status: 403 });
	const file = localPath(auth.key);
	const info = await stat(file).catch(() => null);
	if (!info) return new Response('Not found', { status: 404 });

	const headers: Record<string, string> = view
		? { 'Content-Type': auth.type, 'Content-Disposition': 'inline', 'Cache-Control': 'private, max-age=3600', 'Accept-Ranges': 'bytes' }
		: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': contentDisposition(auth.name) };
	headers['X-Content-Type-Options'] = 'nosniff';

	// Browsers need byte ranges to seek in a video.
	const range = view ? /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '') : null;
	if (range && (range[1] || range[2])) {
		const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
		const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
		if (start > end || start >= info.size) {
			return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
		}
		return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, {
			status: 206,
			headers: { ...headers, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${info.size}` }
		});
	}

	return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
		headers: { ...headers, 'Content-Length': String(info.size) }
	});
}
