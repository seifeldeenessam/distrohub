import type { Prisma } from '@/generated/prisma/client';
import 'server-only';
import { db } from './db';

type Account = { id: string; email: string };

/**
 * Orders that belong to an account: placed while signed in, or sent to the account's email.
 * Sign-in proves the email, so orders placed before the account existed show up too.
 */
export function accountOrdersWhere(user: Account): Prisma.OrderWhereInput {
	return {
		status: { in: ['PAID', 'REFUNDED'] },
		OR: [{ userId: user.id }, { email: { equals: user.email, mode: 'insensitive' } }]
	};
}

/** A paid (not refunded) order for the product: what makes someone a verified buyer who can review. */
export async function hasPurchased(user: Account, appId: string) {
	const order = await db.order.findFirst({
		where: { ...accountOrdersWhere(user), appId, status: 'PAID' },
		select: { id: true }
	});
	return !!order;
}
