import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withApiKey } from "@/lib/api-handler";
import { apiError, readJson, validationError } from "@/lib/http";
import { serializeLicense } from "@/lib/serializers";

async function ownedLicense(userId: string, licenseId: string) {
  return db.license.findFirst({
    where: { id: licenseId, app: { ownerId: userId } },
    include: { _count: { select: { activations: true } }, activations: true },
  });
}

export const GET = withApiKey<{ licenseId: string }>(async (_req, { userId, params }) => {
  const license = await ownedLicense(userId, params.licenseId);
  if (!license) return apiError(404, "license_not_found", "No license with this id in your account.");
  return NextResponse.json({
    data: {
      ...serializeLicense(license),
      devices: license.activations.map((a) => ({
        deviceId: a.deviceId,
        deviceName: a.deviceName,
        activatedAt: a.createdAt,
        lastSeenAt: a.lastSeenAt,
      })),
    },
  });
});

const patchInput = z.object({
  status: z.enum(["ACTIVE", "REVOKED"]).optional(),
  maxActivations: z.number().int().min(1).max(100).optional(),
  /** Remove every device activation (customer got a new machine). */
  resetActivations: z.boolean().optional(),
});

export const PATCH = withApiKey<{ licenseId: string }>(async (req, { userId, params }) => {
  const parsed = patchInput.safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);
  const license = await ownedLicense(userId, params.licenseId);
  if (!license) return apiError(404, "license_not_found", "No license with this id in your account.");
  const { status, maxActivations, resetActivations } = parsed.data;
  if (resetActivations) await db.activation.deleteMany({ where: { licenseId: license.id } });
  const updated = await db.license.update({
    where: { id: license.id },
    data: { status, maxActivations },
    include: { _count: { select: { activations: true } } },
  });
  return NextResponse.json({ data: serializeLicense(updated) });
});
