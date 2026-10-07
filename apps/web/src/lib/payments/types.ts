import type { App } from '@/generated/prisma/client';

export type CheckoutSession = { checkoutId: string; url: string };

export interface PaymentsProvider {
	name: 'polar' | 'mock';
	createCheckout(input: { app: App; customerEmail?: string }): Promise<CheckoutSession>;
}
