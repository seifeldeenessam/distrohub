import { z } from "zod";
import { NextResponse } from "next/server";
import { apiError, readJson, validationError } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { LicenseResult } from "@/lib/licenses";

export const licenseRequest = z.object({
  appId: z.string().min(1).max(64),
  licenseKey: z.string().min(1).max(64),
  deviceId: z.string().min(8).max(128),
  deviceName: z.string().max(120).optional(),
});

/** Public endpoints called from inside the shipped app. No secret: they are keyed by app id + license key. */
export async function handleLicenseRequest(
  req: Request,
  action: string,
  run: (input: z.infer<typeof licenseRequest>) => Promise<LicenseResult | { ok: true }>,
) {
  if (!rateLimit(`license:${action}:${clientIp(req.headers)}`, 30, 60_000)) {
    return apiError(429, "rate_limited", "Too many requests. Try again in a minute.");
  }
  const parsed = licenseRequest.safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);
  const result = await run(parsed.data);
  if (!result.ok) return apiError(result.status, result.code, result.message);
  return NextResponse.json("token" in result ? { token: result.token, license: result.license } : { ok: true });
}
