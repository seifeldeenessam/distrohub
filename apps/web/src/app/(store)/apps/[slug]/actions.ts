'use server';

import { getCurrentUser } from '@/lib/auth';
import { hasPurchased } from '@/lib/customer';
import { db } from '@/lib/db';
import { reviewInput } from '@/lib/reviews';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type ReviewState = { error?: string; ok?: string };

const nameSchema = z.string().trim().min(1, 'Add the name to show with your review.').max(80);

/** Posts or updates the signed-in buyer's review. Only verified buyers of a published product can review. */
export async function saveReview(appId: string, _prev: ReviewState, formData: FormData): Promise<ReviewState> {
	const user = await getCurrentUser();
	if (!user) return { error: 'Sign in to review this product.' };
	const app = await db.app.findUnique({ where: { id: appId }, select: { slug: true, status: true, ownerId: true } });
	if (!app || app.status !== 'PUBLISHED') return { error: "This product isn't available any more." };
	if (app.ownerId === user.id) return { error: "You can't review your own product." };
	if (!(await hasPurchased(user, appId))) return { error: 'Only people who got this product can review it.' };

	const parsed = reviewInput.safeParse(Object.fromEntries(formData));
	if (!parsed.success) return { error: parsed.error.issues[0].message };
	if (!user.name) {
		const name = nameSchema.safeParse(formData.get('name') ?? '');
		if (!name.success) return { error: name.error.issues[0].message };
		await db.user.update({ where: { id: user.id }, data: { name: name.data } });
	}

	await db.review.upsert({
		where: { appId_userId: { appId, userId: user.id } },
		create: { appId, userId: user.id, ...parsed.data },
		update: parsed.data
	});
	revalidatePath(`/apps/${app.slug}`);
	return { ok: 'Your review is posted.' };
}

export async function deleteReview(appId: string) {
	const user = await getCurrentUser();
	if (!user) return;
	const app = await db.app.findUnique({ where: { id: appId }, select: { slug: true } });
	await db.review.deleteMany({ where: { appId, userId: user.id } });
	if (app) revalidatePath(`/apps/${app.slug}`);
}
