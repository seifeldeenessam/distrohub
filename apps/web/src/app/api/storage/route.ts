import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { env } from "@/lib/env";
import { contentDisposition, localPath, verifyLocalSignature } from "@/lib/storage";

// Serves the "local" storage driver (development only). Production uses R2/S3 presigned URLs.

function authorize(req: Request, op: "put" | "get") {
  if (env.storageDriver !== "local") return null;
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const expires = Number(url.searchParams.get("expires"));
  const sig = url.searchParams.get("sig") ?? "";
  if (!key || !verifyLocalSignature(op, key, expires, sig)) return null;
  return { key, name: url.searchParams.get("name") ?? path.basename(key) };
}

export async function PUT(req: Request) {
  const auth = authorize(req, "put");
  if (!auth || !req.body) return new Response("Forbidden", { status: 403 });
  const file = localPath(auth.key);
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.part`;
  await pipeline(Readable.fromWeb(req.body as import("node:stream/web").ReadableStream), createWriteStream(tmp));
  await rename(tmp, file);
  return new Response(null, { status: 200 });
}

export async function GET(req: Request) {
  const auth = authorize(req, "get");
  if (!auth) return new Response("Forbidden", { status: 403 });
  const file = localPath(auth.key);
  const info = await stat(file).catch(() => null);
  if (!info) return new Response("Not found", { status: 404 });
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(info.size),
      "Content-Disposition": contentDisposition(auth.name),
    },
  });
}
