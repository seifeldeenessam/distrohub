import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

/** Product screenshot or video: redirects to a short-lived storage URL that serves it inline. */
export async function GET(_req: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media || !media.uploaded) return new Response("Not found.", { status: 404 });
  const res = NextResponse.redirect(await storage().createViewUrl(media.fileKey, media.contentType), 302);
  // Shorter than the signed URL's lifetime, so a cached redirect never points at an expired URL.
  res.headers.set("Cache-Control", "private, max-age=1800");
  return res;
}
