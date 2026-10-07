// Seeds a demo creator, two paid apps, a free ebook and a placeholder file for each, plus a few
// buyers with orders and reviews, so the storefront and the full purchase flow work locally with
// PAYMENTS_PROVIDER=mock.
// Usage: pnpm db:seed   (sign in as demo@distrohub.dev or buyer@distrohub.dev; the code prints in the dev server log)
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { createCipheriv, generateKeyPairSync, randomBytes, randomInt } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '../src/generated/prisma/client';

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const secret = Buffer.from(process.env.APP_SECRET_KEY ?? '', 'base64');
if (secret.length !== 32) throw new Error('Set APP_SECRET_KEY (openssl rand -base64 32) before seeding');

function keys() {
	const { publicKey, privateKey } = generateKeyPairSync('ed25519');
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', secret, iv);
	const ct = Buffer.concat([cipher.update(privateKey.export({ format: 'der', type: 'pkcs8' })), cipher.final()]);
	return {
		signingPublicKey: Buffer.from(publicKey.export({ format: 'jwk' }).x!, 'base64url').toString('base64'),
		signingPrivateKeyEnc: [iv, cipher.getAuthTag(), ct].map((b) => b.toString('base64url')).join('.')
	};
}

const APPS = [
	{
		slug: 'menuweather',
		name: 'MenuWeather',
		tagline: 'The forecast in your menu bar, nothing else.',
		description: 'MenuWeather puts the current temperature and the next six hours in your menu bar.\n\nNo account, no ads, no tracking. Pick a city or let it use your location.',
		priceCents: 500,
		kind: 'SOFTWARE',
		platform: 'MACOS',
		file: 'MenuWeather.dmg'
	},
	{
		slug: 'clipstack',
		name: 'Clipstack',
		tagline: 'Clipboard history you can search with one shortcut.',
		description: 'Press ⌥⌘V to see everything you copied today, search it, and paste it back.\n\nText, images and files. History stays on your Mac.',
		priceCents: 900,
		kind: 'SOFTWARE',
		platform: 'MACOS',
		file: 'Clipstack.dmg'
	},
	{
		slug: 'shipping-notes',
		name: 'Shipping Notes',
		tagline: 'A short field guide to releasing your first indie app.',
		description: 'Forty pages on pricing, landing pages, release checklists and what to do the week after launch.\n\nPDF, free. Pay with an email address.',
		priceCents: 0,
		kind: 'EBOOK',
		platform: null,
		licenseKeys: false,
		file: 'Shipping Notes.pdf'
	}
] as const;

async function main() {
	const user = await db.user.upsert({
		where: { email: 'demo@distrohub.dev' },
		update: {},
		create: { email: 'demo@distrohub.dev', name: 'Demo Studio' }
	});

	for (const { file: fileName, ...a } of APPS) {
		const app = await db.app.upsert({
			where: { slug: a.slug },
			update: {},
			create: { ...a, ...keys(), ownerId: user.id, status: 'PUBLISHED' }
		});
		const fileKey = `apps/${app.id}/1.0.0-seed/${fileName}`;
		const file = path.join(process.cwd(), '.storage', fileKey);
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(file, `Placeholder build for ${a.name}\n`);
		await db.release.upsert({
			where: { fileKey },
			update: {},
			create: { appId: app.id, version: '1.0.0', fileKey, fileName, fileSize: 32, uploaded: true }
		});
		console.log(`${a.name}: appId=${app.id} publicKey=${app.signingPublicKey}`);
	}
	await seedBuyers();
}

// buyer@distrohub.dev owns MenuWeather and Shipping Notes without reviewing them, so you can try
// writing a review. The others have left reviews.
const BUYERS = [
	{ email: 'buyer@distrohub.dev', name: '', orders: [['menuweather'], ['shipping-notes']] },
	{
		email: 'ana@example.com',
		name: 'Ana Petrova',
		orders: [
			['menuweather', 5, 'Exactly what I wanted: glance up, see if I need a jacket. Uses almost no battery.'],
			['clipstack', 4, "Search is instant. I'd love pinned items, but it already replaced two other apps for me."]
		]
	},
	{
		email: 'kenji@example.com',
		name: 'Kenji Mori',
		orders: [
			['menuweather', 4, ''],
			['shipping-notes', 5, 'Short and practical. The launch-week checklist alone was worth the read.']
		]
	}
] as const;

const KEY_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const licenseKey = () => Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => KEY_ALPHABET[randomInt(32)]).join('')).join('-');

async function seedBuyers() {
	for (const buyer of BUYERS) {
		const user = await db.user.upsert({
			where: { email: buyer.email },
			update: {},
			create: { email: buyer.email, name: buyer.name }
		});
		for (const [slug, rating, body] of buyer.orders as readonly (readonly [string, number?, string?])[]) {
			const app = await db.app.findUniqueOrThrow({ where: { slug } });
			const checkoutId = `seed_${slug}_${user.id}`;
			if (await db.order.findUnique({ where: { checkoutId } })) continue;
			const fee = Math.round(app.priceCents / 10);
			const order = await db.order.create({
				data: {
					appId: app.id,
					userId: user.id,
					email: user.email,
					status: 'PAID',
					provider: app.priceCents === 0 ? 'free' : 'mock',
					checkoutId,
					providerOrderId: checkoutId,
					amountCents: app.priceCents,
					currency: app.currency,
					platformFeeCents: fee,
					creatorEarningsCents: app.priceCents - fee,
					downloadToken: randomBytes(32).toString('base64url'),
					paidAt: new Date()
				}
			});
			if (app.licenseKeys) {
				await db.license.create({
					data: { key: licenseKey(), appId: app.id, orderId: order.id, email: user.email, maxActivations: app.maxActivations }
				});
			}
			if (rating) await db.review.create({ data: { appId: app.id, userId: user.id, rating, body: body ?? '' } });
		}
	}
}

main().finally(() => db.$disconnect());
