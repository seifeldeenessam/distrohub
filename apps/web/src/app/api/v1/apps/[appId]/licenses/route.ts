import { withApiKey } from '@/lib/api-handler';
import { generateLicenseKey } from '@/lib/crypto';
import { db } from '@/lib/db';
import { readJson, validationError } from '@/lib/http';
import { serializeLicense } from '@/lib/serializers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const GET = withApiKey<{ appId: string }>(async (req, { params }) => {
	const url = new URL(req.url);
	const email = url.searchParams.get('email') ?? undefined;
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200);
	const cursor = url.searchParams.get('cursor') ?? undefined;
	const licenses = await db.license.findMany({
		where: { appId: params.appId, email },
		include: { _count: { select: { activations: true } } },
		orderBy: { createdAt: 'desc' },
		take: limit + 1,
		...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
	});
	const hasMore = licenses.length > limit;
	const page = licenses.slice(0, limit);
	return NextResponse.json({ data: page.map(serializeLicense), nextCursor: hasMore ? page.at(-1)!.id : null });
});

const issueInput = z.object({
	email: z.email(),
	maxActivations: z.number().int().min(1).max(100).optional(),
	note: z.string().max(500).optional()
});

/** Issue a complimentary license (press, giveaways, migrating existing customers). */
export const POST = withApiKey<{ appId: string }>(async (req, { params }) => {
	const parsed = issueInput.safeParse(await readJson(req));
	if (!parsed.success) return validationError(parsed.error);
	const app = await db.app.findUniqueOrThrow({ where: { id: params.appId } });
	const license = await db.license.create({
		data: {
			key: generateLicenseKey(),
			appId: app.id,
			email: parsed.data.email,
			maxActivations: parsed.data.maxActivations ?? app.maxActivations,
			note: parsed.data.note
		}
	});
	return NextResponse.json({ data: serializeLicense(license) }, { status: 201 });
});
