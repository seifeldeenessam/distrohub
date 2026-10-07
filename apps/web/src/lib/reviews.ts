import 'server-only';
import { z } from 'zod';
import { db } from './db';

export type RatingSummary = { average: number; count: number };

export const reviewInput = z.object({
	rating: z.coerce.number('Pick a star rating.').int().min(1, 'Pick a star rating.').max(5),
	body: z.string().trim().max(2000, 'Keep the review under 2,000 characters.').default('')
});

/** Average rating and review count per product. Products without reviews are left out. */
export async function ratingSummaries(appIds: string[]) {
	if (appIds.length === 0) return new Map<string, RatingSummary>();
	const groups = await db.review.groupBy({
		by: ['appId'],
		where: { appId: { in: appIds } },
		_avg: { rating: true },
		_count: true
	});
	return new Map(groups.map((g) => [g.appId, { average: g._avg.rating ?? 0, count: g._count }]));
}

export async function ratingSummary(appId: string): Promise<RatingSummary | undefined> {
	return (await ratingSummaries([appId])).get(appId);
}

export function listReviews(appId: string, take = 50) {
	return db.review.findMany({
		where: { appId },
		orderBy: { createdAt: 'desc' },
		take,
		select: { id: true, rating: true, body: true, createdAt: true, updatedAt: true, userId: true, user: { select: { name: true } } }
	});
}
