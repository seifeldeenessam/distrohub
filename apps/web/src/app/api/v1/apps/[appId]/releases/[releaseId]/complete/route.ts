import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-handler";
import { apiError } from "@/lib/http";
import { completeRelease } from "@/lib/releases";
import { serializeRelease } from "@/lib/serializers";

export const POST = withApiKey<{ appId: string; releaseId: string }>(async (_req, { params }) => {
  const result = await completeRelease(params.appId, params.releaseId);
  if (!result.ok) return apiError(409, "upload_incomplete", result.message);
  return NextResponse.json({ data: serializeRelease(result.release) });
});
