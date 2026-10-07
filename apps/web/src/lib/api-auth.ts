import 'server-only';
import { randomToken, sha256 } from './crypto';
import { db } from './db';

export const API_KEY_PREFIX = 'dh_sk_';

export function generateApiKey() {
	const key = `${API_KEY_PREFIX}${randomToken(24)}`;
	return { key, hash: sha256(key), prefix: key.slice(0, API_KEY_PREFIX.length + 4) };
}

/** Resolves the creator behind `Authorization: Bearer dh_sk_...`. */
export async function authenticateApiKey(req: Request) {
	const header = req.headers.get('authorization') ?? '';
	const [scheme, key] = header.split(' ');
	if (scheme?.toLowerCase() !== 'bearer' || !key?.startsWith(API_KEY_PREFIX)) return null;
	const apiKey = await db.apiKey.findUnique({ where: { hash: sha256(key) } });
	if (!apiKey || apiKey.revokedAt) return null;
	await db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
	return { userId: apiKey.userId };
}
