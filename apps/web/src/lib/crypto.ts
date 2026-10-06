import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  generateKeyPairSync,
  randomBytes,
  randomInt,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { env } from "./env";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function hmac(value: string) {
  return createHmac("sha256", env.secretKey).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** AES-256-GCM with APP_SECRET_KEY. Output: iv.tag.ciphertext (base64url). */
export function encrypt(plain: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", env.secretKey, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string) {
  const [iv, tag, ct] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", env.secretKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/** Per-app Ed25519 key pair. The public key is raw 32 bytes, base64 (what CryptoKit expects). */
export function generateSigningKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" });
  return {
    publicKey: Buffer.from(jwk.x!, "base64url").toString("base64"),
    privateKeyEnc: encrypt(privateKey.export({ format: "der", type: "pkcs8" })),
  };
}

// Crockford base32 without ambiguous chars.
const KEY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** e.g. 7KQ2M-HX9TB-0RZ4C-N8VWE-3PJ6D (125 bits of entropy). */
export function generateLicenseKey() {
  const groups = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => KEY_ALPHABET[randomInt(KEY_ALPHABET.length)]).join(""),
  );
  return groups.join("-");
}

export function normalizeLicenseKey(key: string) {
  return key.trim().toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/(.{5})(?=.)/g, "$1-");
}
