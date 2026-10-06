import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiKey } from "@/lib/api-handler";
import { apiError, readJson, validationError } from "@/lib/http";
import { createRelease, releaseInput } from "@/lib/releases";
import { serializeRelease } from "@/lib/serializers";

export const GET = withApiKey<{ appId: string }>(async (_req, { params }) => {
  const releases = await db.release.findMany({ where: { appId: params.appId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: releases.map(serializeRelease) });
});

/**
 * Step 1 of an upload: returns a presigned `uploadUrl`. PUT the file body to it,
 * then call POST /releases/{id}/complete.
 */
export const POST = withApiKey<{ appId: string }>(async (req, { params }) => {
  const parsed = releaseInput.safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);
  const result = await createRelease(params.appId, parsed.data);
  if (!result.ok) return apiError(409, "version_exists", result.message);
  return NextResponse.json({ data: serializeRelease(result.release), uploadUrl: result.uploadUrl }, { status: 201 });
});
