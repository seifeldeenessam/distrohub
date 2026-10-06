import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiKey } from "@/lib/api-handler";
import { serializeApp } from "@/lib/serializers";

export const GET = withApiKey(async (_req, { userId }) => {
  const apps = await db.app.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: apps.map(serializeApp) });
});
