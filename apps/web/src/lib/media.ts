import type { MediaKind } from '@/generated/prisma/client';
import 'server-only';
import { z } from 'zod';
import { randomToken } from './crypto';
import { db } from './db';
import { storage } from './storage';

/** Formats every browser can show. SVG is left out on purpose: it can carry scripts. */
export const MEDIA_TYPES: Record<string, { kind: MediaKind; ext: string }> = {
	'image/png': { kind: 'IMAGE', ext: 'png' },
	'image/jpeg': { kind: 'IMAGE', ext: 'jpg' },
	'image/webp': { kind: 'IMAGE', ext: 'webp' },
	'image/gif': { kind: 'IMAGE', ext: 'gif' },
	'video/mp4': { kind: 'VIDEO', ext: 'mp4' },
	'video/webm': { kind: 'VIDEO', ext: 'webm' }
};

export const MAX_IMAGE_BYTES = 10 * 1024 ** 2;
export const MAX_VIDEO_BYTES = 200 * 1024 ** 2;
export const MAX_MEDIA_PER_APP = 12;

export const mediaInput = z
	.object({
		contentType: z.string(),
		fileSize: z.number().int().positive()
	})
	.superRefine((input, ctx) => {
		const type = MEDIA_TYPES[input.contentType];
		if (!type) {
			ctx.addIssue({ code: 'custom', message: 'Use a PNG, JPEG, WebP or GIF image, or an MP4 or WebM video.' });
		} else if (type.kind === 'IMAGE' && input.fileSize > MAX_IMAGE_BYTES) {
			ctx.addIssue({ code: 'custom', message: 'Images can be up to 10 MB. Export a smaller PNG or a JPEG.' });
		} else if (type.kind === 'VIDEO' && input.fileSize > MAX_VIDEO_BYTES) {
			ctx.addIssue({ code: 'custom', message: 'Videos can be up to 200 MB. Shorten it or export at a lower bitrate.' });
		}
	});

export async function createMedia(appId: string, input: z.infer<typeof mediaInput>) {
	const count = await db.media.count({ where: { appId, uploaded: true } });
	if (count >= MAX_MEDIA_PER_APP) {
		return { ok: false as const, message: `A product can have up to ${MAX_MEDIA_PER_APP} images and videos. Delete one first.` };
	}
	// Drop rows from uploads that never finished.
	await db.media.deleteMany({ where: { appId, uploaded: false, createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } } });
	const type = MEDIA_TYPES[input.contentType];
	const fileKey = `apps/${appId}/media/${randomToken(12)}.${type.ext}`;
	const last = await db.media.findFirst({ where: { appId }, orderBy: { position: 'desc' }, select: { position: true } });
	const media = await db.media.create({
		data: {
			appId,
			kind: type.kind,
			fileKey,
			contentType: input.contentType,
			fileSize: input.fileSize,
			position: (last?.position ?? -1) + 1
		}
	});
	const uploadUrl = await storage().createUploadUrl(fileKey, input.fileSize, input.contentType);
	return { ok: true as const, media, uploadUrl };
}

export async function completeMedia(appId: string, mediaId: string) {
	const media = await db.media.findFirst({ where: { id: mediaId, appId } });
	if (!media) return { ok: false as const, message: 'Upload not found. Try again.' };
	const size = await storage().size(media.fileKey);
	if (size === null) return { ok: false as const, message: 'The file has not finished uploading.' };
	const updated = await db.media.update({ where: { id: media.id }, data: { uploaded: true, fileSize: size } });
	return { ok: true as const, media: updated };
}

/** Swaps a media item with its neighbour in the gallery. */
export async function moveMedia(appId: string, mediaId: string, direction: -1 | 1) {
	const items = await listMedia(appId);
	const i = items.findIndex((m) => m.id === mediaId);
	const j = i + direction;
	if (i < 0 || j < 0 || j >= items.length) return;
	// Renumber everything so duplicate positions from concurrent uploads can't stick.
	[items[i], items[j]] = [items[j], items[i]];
	await db.$transaction(items.map((m, position) => db.media.update({ where: { id: m.id }, data: { position } })));
}

export function listMedia(appId: string) {
	return db.media.findMany({ where: { appId, uploaded: true }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
}

/** Stable URL for a gallery item; it redirects to a short-lived storage URL. */
export const mediaUrl = (mediaId: string) => `/media/${mediaId}`;
