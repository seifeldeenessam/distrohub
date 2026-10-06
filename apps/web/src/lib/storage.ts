import "server-only";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";
import { hmac, safeEqual } from "./crypto";

/**
 * Release binaries live in object storage. Uploads and downloads go straight between the
 * browser/app and the bucket through short-lived presigned URLs, never through this server.
 *  - "s3": Cloudflare R2 or AWS S3
 *  - "local": ./.storage on disk, served by /api/storage (development only)
 */
export interface Storage {
  createUploadUrl(key: string, contentLength: number): Promise<string>;
  createDownloadUrl(key: string, fileName: string): Promise<string>;
  /** Size in bytes, or null when the object does not exist. */
  size(key: string): Promise<number | null>;
}

const UPLOAD_TTL = 60 * 60;
const DOWNLOAD_TTL = 60 * 10;

class S3Storage implements Storage {
  private client = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: env.required("S3_ACCESS_KEY_ID"),
      secretAccessKey: env.required("S3_SECRET_ACCESS_KEY"),
    },
  });
  private bucket = env.required("S3_BUCKET");

  createUploadUrl(key: string, contentLength: number) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentLength: contentLength }),
      { expiresIn: UPLOAD_TTL },
    );
  }

  createDownloadUrl(key: string, fileName: string) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: contentDisposition(fileName),
      }),
      { expiresIn: DOWNLOAD_TTL },
    );
  }

  async size(key: string) {
    try {
      const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return head.ContentLength ?? 0;
    } catch {
      return null;
    }
  }
}

export const LOCAL_STORAGE_ROOT = path.join(process.cwd(), ".storage");

export function localSignature(op: "put" | "get", key: string, expires: number) {
  return hmac(`${op}:${key}:${expires}`);
}

export function verifyLocalSignature(op: "put" | "get", key: string, expires: number, sig: string) {
  return expires > Date.now() / 1000 && safeEqual(localSignature(op, key, expires), sig);
}

export function localPath(key: string) {
  const resolved = path.resolve(LOCAL_STORAGE_ROOT, key);
  if (!resolved.startsWith(LOCAL_STORAGE_ROOT + path.sep)) throw new Error("Invalid storage key");
  return resolved;
}

class LocalStorage implements Storage {
  private url(op: "put" | "get", key: string, ttl: number, extra: Record<string, string> = {}) {
    const expires = Math.floor(Date.now() / 1000) + ttl;
    const params = new URLSearchParams({ key, expires: String(expires), sig: localSignature(op, key, expires), ...extra });
    return `${env.appUrl}/api/storage?${params}`;
  }

  async createUploadUrl(key: string) {
    await mkdir(path.dirname(localPath(key)), { recursive: true });
    return this.url("put", key, UPLOAD_TTL);
  }

  async createDownloadUrl(key: string, fileName: string) {
    return this.url("get", key, DOWNLOAD_TTL, { name: fileName });
  }

  async size(key: string) {
    try {
      return (await stat(localPath(key))).size;
    } catch {
      return null;
    }
  }
}

export function contentDisposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

let instance: Storage | undefined;
export function storage(): Storage {
  instance ??= env.storageDriver === "s3" ? new S3Storage() : new LocalStorage();
  return instance;
}
