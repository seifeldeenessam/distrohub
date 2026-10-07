import 'server-only';
import { normalizeLicenseKey } from './crypto';
import { db } from './db';
import { signLicenseToken } from './license-token';

export type LicenseResult = { ok: true; token: string; license: PublicLicense } | { ok: false; status: number; code: string; message: string };

export type PublicLicense = {
	id: string;
	email: string;
	status: 'ACTIVE' | 'REVOKED';
	maxActivations: number;
	activations: number;
	expiresAt: string;
};

const fail = (status: number, code: string, message: string): LicenseResult => ({ ok: false, status, code, message });

async function findLicense(appId: string, key: string) {
	const license = await db.license.findUnique({
		where: { key: normalizeLicenseKey(key) },
		include: { app: { select: { id: true, signingPrivateKeyEnc: true } } }
	});
	return license && license.appId === appId ? license : null;
}

async function issue(license: NonNullable<Awaited<ReturnType<typeof findLicense>>>, deviceId: string): Promise<LicenseResult> {
	const activations = await db.activation.count({ where: { licenseId: license.id } });
	const { token, payload } = signLicenseToken(license.app.signingPrivateKeyEnc, {
		lid: license.id,
		app: license.appId,
		dev: deviceId,
		email: license.email
	});
	return {
		ok: true,
		token,
		license: {
			id: license.id,
			email: license.email,
			status: license.status,
			maxActivations: license.maxActivations,
			activations,
			expiresAt: new Date(payload.exp * 1000).toISOString()
		}
	};
}

export async function activateLicense(input: { appId: string; key: string; deviceId: string; deviceName?: string }) {
	const license = await findLicense(input.appId, input.key);
	if (!license) return fail(404, 'license_not_found', 'This license key is not valid for this app.');
	if (license.status === 'REVOKED') return fail(403, 'license_revoked', 'This license key has been revoked.');

	const existing = await db.activation.findUnique({
		where: { licenseId_deviceId: { licenseId: license.id, deviceId: input.deviceId } }
	});
	if (existing) {
		await db.activation.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
		return issue(license, input.deviceId);
	}

	// Lock the license row so concurrent activations can't exceed the device limit.
	const limitReached = await db.$transaction(async (tx) => {
		await tx.$queryRaw`SELECT id FROM "License" WHERE id = ${license.id} FOR UPDATE`;
		const used = await tx.activation.count({ where: { licenseId: license.id } });
		if (used >= license.maxActivations) return used;
		await tx.activation.upsert({
			where: { licenseId_deviceId: { licenseId: license.id, deviceId: input.deviceId } },
			create: { licenseId: license.id, deviceId: input.deviceId, deviceName: input.deviceName },
			update: { lastSeenAt: new Date() }
		});
		return null;
	});
	if (limitReached !== null) {
		return fail(409, 'activation_limit_reached', `This key is already active on ${limitReached} device(s). Deactivate it on another device first.`);
	}
	return issue(license, input.deviceId);
}

export async function validateLicense(input: { appId: string; key: string; deviceId: string }) {
	const license = await findLicense(input.appId, input.key);
	if (!license) return fail(404, 'license_not_found', 'This license key is not valid for this app.');
	if (license.status === 'REVOKED') return fail(403, 'license_revoked', 'This license key has been revoked.');
	const activation = await db.activation.findUnique({
		where: { licenseId_deviceId: { licenseId: license.id, deviceId: input.deviceId } }
	});
	if (!activation) return fail(404, 'not_activated', 'This device is not activated for this license.');
	await db.activation.update({ where: { id: activation.id }, data: { lastSeenAt: new Date() } });
	return issue(license, input.deviceId);
}

export async function deactivateLicense(input: { appId: string; key: string; deviceId: string }) {
	const license = await findLicense(input.appId, input.key);
	if (!license) return fail(404, 'license_not_found', 'This license key is not valid for this app.');
	await db.activation.deleteMany({ where: { licenseId: license.id, deviceId: input.deviceId } });
	return { ok: true as const };
}
