'use server';

import { requireUser } from '@/lib/auth';
import { accountOrdersWhere } from '@/lib/customer';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type ProfileState = { error?: string; ok?: string };

const profileSchema = z.object({ name: z.string().trim().min(1, 'Enter a name.').max(80) });

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
	const user = await requireUser('/account');
	const parsed = profileSchema.safeParse(Object.fromEntries(formData));
	if (!parsed.success) return { error: parsed.error.issues[0].message };
	await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
	revalidatePath('/', 'layout');
	return { ok: 'Saved.' };
}

/** Signs a license out of one device, freeing an activation. Only for licenses on the buyer's own orders. */
export async function removeDevice(activationId: string) {
	const user = await requireUser('/account');
	await db.activation.deleteMany({
		where: { id: activationId, license: { order: accountOrdersWhere(user) } }
	});
	revalidatePath('/account');
}
