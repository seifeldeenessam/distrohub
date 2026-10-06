"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwnedApp, requireUser } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-auth";
import { generateLicenseKey, generateSigningKeyPair, randomToken } from "@/lib/crypto";
import { sendLicenseEmail } from "@/lib/fulfillment";
import { completeRelease, createRelease, latestRelease, releaseInput } from "@/lib/releases";
import { slugify } from "@/lib/slug";

export type FormState = { error?: string; ok?: string };

const appFields = z.object({
  name: z.string().trim().min(1, "Give your app a name.").max(60),
  tagline: z.string().trim().min(1, "Add a one-line tagline.").max(120),
  description: z.string().trim().min(1, "Describe what the app does.").max(10_000),
  price: z.coerce.number().min(0.5, "The minimum price is $0.50.").max(10_000),
  platform: z.enum(["MACOS", "WINDOWS", "LINUX"]),
  maxActivations: z.coerce.number().int().min(1).max(100),
  iconUrl: z.union([z.url(), z.literal("")]).optional(),
  websiteUrl: z.union([z.url(), z.literal("")]).optional(),
});

function parseApp(formData: FormData) {
  const parsed = appFields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const { price, iconUrl, websiteUrl, ...rest } = parsed.data;
  return {
    data: { ...rest, priceCents: Math.round(price * 100), iconUrl: iconUrl || null, websiteUrl: websiteUrl || null },
  } as const;
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || "app";
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base : `${base}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    if (!(await db.app.findUnique({ where: { slug } }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createApp(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseApp(formData);
  if ("error" in parsed) return { error: parsed.error };
  const keys = generateSigningKeyPair();
  const app = await db.app.create({
    data: {
      ...parsed.data,
      ownerId: user.id,
      slug: await uniqueSlug(parsed.data.name),
      signingPublicKey: keys.publicKey,
      signingPrivateKeyEnc: keys.privateKeyEnc,
    },
  });
  redirect(`/dashboard/apps/${app.id}/releases`);
}

export async function updateApp(appId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwnedApp(appId);
  const parsed = parseApp(formData);
  if ("error" in parsed) return { error: parsed.error };
  await db.app.update({ where: { id: appId }, data: parsed.data });
  revalidatePath(`/dashboard/apps/${appId}`, "layout");
  return { ok: "Changes saved." };
}

export async function setPublished(appId: string, publish: boolean): Promise<FormState> {
  await requireOwnedApp(appId);
  if (publish && !(await latestRelease(appId))) return { error: "Upload a release before publishing." };
  await db.app.update({ where: { id: appId }, data: { status: publish ? "PUBLISHED" : "DRAFT" } });
  revalidatePath(`/dashboard/apps/${appId}`, "layout");
  return { ok: publish ? "Published." : "Unpublished." };
}

export async function startReleaseUpload(appId: string, input: unknown) {
  await requireOwnedApp(appId);
  const parsed = releaseInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0].message };
  const result = await createRelease(appId, parsed.data);
  if (!result.ok) return result;
  return { ok: true as const, releaseId: result.release.id, uploadUrl: result.uploadUrl };
}

export async function finishReleaseUpload(appId: string, releaseId: string) {
  await requireOwnedApp(appId);
  const result = await completeRelease(appId, releaseId);
  revalidatePath(`/dashboard/apps/${appId}`, "layout");
  return result.ok ? { ok: true as const } : result;
}

export async function deleteRelease(appId: string, releaseId: string) {
  await requireOwnedApp(appId);
  await db.release.deleteMany({ where: { id: releaseId, appId } });
  revalidatePath(`/dashboard/apps/${appId}`, "layout");
}

async function ownedLicense(licenseId: string) {
  const user = await requireUser();
  const license = await db.license.findFirst({ where: { id: licenseId, app: { ownerId: user.id } } });
  if (!license) throw new Error("License not found");
  return license;
}

export async function setLicenseStatus(licenseId: string, status: "ACTIVE" | "REVOKED") {
  const license = await ownedLicense(licenseId);
  await db.license.update({ where: { id: license.id }, data: { status } });
  revalidatePath(`/dashboard/apps/${license.appId}/licenses`);
}

export async function resetActivations(licenseId: string) {
  const license = await ownedLicense(licenseId);
  await db.activation.deleteMany({ where: { licenseId: license.id } });
  revalidatePath(`/dashboard/apps/${license.appId}/licenses`);
}

export async function resendLicense(licenseId: string) {
  const license = await ownedLicense(licenseId);
  await sendLicenseEmail(license.id);
}

const issueSchema = z.object({
  email: z.email("Enter a valid email address."),
  note: z.string().max(500).optional(),
});

export async function issueLicense(appId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireOwnedApp(appId);
  const parsed = issueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const license = await db.license.create({
    data: {
      key: generateLicenseKey(),
      appId,
      email: parsed.data.email,
      note: parsed.data.note || null,
      maxActivations: app.maxActivations,
    },
  });
  if (formData.get("send") === "on") await sendLicenseEmail(license.id);
  revalidatePath(`/dashboard/apps/${appId}/licenses`);
  return { ok: `Issued ${license.key}` };
}

export type ApiKeyState = FormState & { key?: string };

export async function createApiKey(_prev: ApiKeyState, formData: FormData): Promise<ApiKeyState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60) || "Untitled key";
  const { key, hash, prefix } = generateApiKey();
  await db.apiKey.create({ data: { userId: user.id, name, hash, prefix } });
  revalidatePath("/dashboard/api-keys");
  return { key };
}

export async function revokeApiKey(id: string) {
  const user = await requireUser();
  await db.apiKey.updateMany({ where: { id, userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  revalidatePath("/dashboard/api-keys");
}
