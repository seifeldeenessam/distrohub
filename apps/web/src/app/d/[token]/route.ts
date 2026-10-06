import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { latestRelease } from "@/lib/releases";
import { storage } from "@/lib/storage";

/** Permanent download link from the receipt email: always serves the latest release. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await db.order.findUnique({ where: { downloadToken: token } });
  if (!order || order.status === "PENDING") return new Response("Download link not found.", { status: 404 });
  if (order.status === "REFUNDED") return new Response("This purchase was refunded.", { status: 410 });

  const release = await latestRelease(order.appId);
  if (!release) return new Response("No release is available yet.", { status: 404 });
  return NextResponse.redirect(await storage().createDownloadUrl(release.fileKey, release.fileName), 302);
}
