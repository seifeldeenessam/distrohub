import { randomInt } from 'node:crypto';
import 'server-only';
import { hmac, safeEqual } from './crypto';
import { db } from './db';
import { loginCodeEmail, sendEmail } from './email';

export const LOGIN_CODE_LENGTH = 6;
const LOGIN_CODE_TTL_MS = 10 * 60_000;
const LOGIN_CODE_MAX_ATTEMPTS = 5;

// Keyed hash: a 6-digit code is trivial to brute-force from a plain SHA-256 if the table leaks.
const hashCode = (email: string, code: string) => hmac(`login:${email}:${code}`);

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Emails a fresh sign-in code. Any earlier code for the address stops working. */
export async function sendLoginCode(email: string) {
	const code = Array.from({ length: LOGIN_CODE_LENGTH }, () => randomInt(10)).join('');
	await db.$transaction([
		db.loginCode.deleteMany({ where: { email } }),
		db.loginCode.create({
			data: { email, codeHash: hashCode(email, code), expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS) }
		})
	]);
	await sendEmail({ to: email, ...loginCodeEmail(code, LOGIN_CODE_TTL_MS / 60_000) });
}

/**
 * Checks a code and consumes it on success. Each wrong guess counts against the code, and the
 * attempt is recorded before comparing so parallel guesses can't exceed the limit.
 */
export async function verifyLoginCode(email: string, code: string): Promise<'ok' | 'invalid' | 'expired'> {
	const record = await db.loginCode.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } });
	if (!record || record.expiresAt < new Date()) return 'expired';

	const counted = await db.loginCode.updateMany({
		where: { id: record.id, attempts: { lt: LOGIN_CODE_MAX_ATTEMPTS } },
		data: { attempts: { increment: 1 } }
	});
	if (counted.count === 0) return 'expired';
	if (!safeEqual(record.codeHash, hashCode(email, code))) return 'invalid';

	// deleteMany doubles as the single-use check: only one request can delete the row.
	const consumed = await db.loginCode.deleteMany({ where: { id: record.id } });
	return consumed.count === 1 ? 'ok' : 'expired';
}
