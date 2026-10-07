import 'server-only';
import { z } from 'zod';
import { randomToken } from './crypto';
import { db } from './db';
import { isUniqueViolation } from './fulfillment';
import { storage } from './storage';

export const MAX_RELEASE_BYTES = 2 * 1024 ** 3; // 2 GiB

export const releaseInput = z.object({
	version: z
		.string()
		.trim()
		.min(1)
		.max(32)
		.regex(/^[0-9A-Za-z.+-]+$/, 'Use letters, numbers, dots and dashes, like 1.2.0 or 2nd-edition'),
	fileName: z.string().trim().min(1).max(200),
	fileSize: z.number().int().positive().max(MAX_RELEASE_BYTES),
	notes: z.string().max(5000).optional().default('')
});

export async function createRelease(appId: string, input: z.infer<typeof releaseInput>) {
	const safeName = input.fileName.replace(/[^\w.\- ]/g, '_');
	const fileKey = `apps/${appId}/${input.version}-${randomToken(6)}/${safeName}`;
	try {
		// Re-uploading a version whose upload never completed replaces the stale row.
		await db.release.deleteMany({ where: { appId, version: input.version, uploaded: false } });
		const release = await db.release.create({
			data: { appId, version: input.version, notes: input.notes, fileKey, fileName: input.fileName, fileSize: input.fileSize }
		});
		const uploadUrl = await storage().createUploadUrl(fileKey, input.fileSize);
		return { ok: true as const, release, uploadUrl };
	} catch (err) {
		if (isUniqueViolation(err)) return { ok: false as const, message: `Version ${input.version} already exists.` };
		throw err;
	}
}

export async function completeRelease(appId: string, releaseId: string) {
	const release = await db.release.findFirst({ where: { id: releaseId, appId } });
	if (!release) return { ok: false as const, message: 'Release not found.' };
	const size = await storage().size(release.fileKey);
	if (size === null) return { ok: false as const, message: 'The file has not finished uploading.' };
	const updated = await db.release.update({ where: { id: release.id }, data: { uploaded: true, fileSize: size } });
	return { ok: true as const, release: updated };
}

export function latestRelease(appId: string) {
	return db.release.findFirst({ where: { appId, uploaded: true }, orderBy: { createdAt: 'desc' } });
}
