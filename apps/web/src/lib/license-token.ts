import "server-only";
import { createPrivateKey, sign } from "node:crypto";
import { decrypt } from "./crypto";

export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export type LicenseTokenPayload = {
  v: 1;
  /** License id */
  lid: string;
  app: string;
  /** Device id the token is bound to */
  dev: string;
  email: string;
  iat: number;
  exp: number;
};

/**
 * Signed, offline-verifiable proof that a license is active on a device.
 * Format: base64url(JSON payload) + "." + base64url(Ed25519 signature over the payload bytes).
 */
export function signLicenseToken(privateKeyEnc: string, payload: Omit<LicenseTokenPayload, "v" | "iat" | "exp">) {
  const iat = Math.floor(Date.now() / 1000);
  const full: LicenseTokenPayload = { v: 1, ...payload, iat, exp: iat + TOKEN_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(full));
  const key = createPrivateKey({ key: decrypt(privateKeyEnc), format: "der", type: "pkcs8" });
  const signature = sign(null, body, key);
  return { token: `${body.toString("base64url")}.${signature.toString("base64url")}`, payload: full };
}
