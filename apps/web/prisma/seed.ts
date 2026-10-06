// Seeds a demo developer, two paid apps, a free ebook and a placeholder file for each,
// so the storefront and the full purchase flow work locally with PAYMENTS_PROVIDER=mock.
// Usage: pnpm db:seed   (login: demo@distrohub.dev / demo-password)
import "dotenv/config";
import { createCipheriv, generateKeyPairSync, randomBytes, scryptSync } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const secret = Buffer.from(process.env.APP_SECRET_KEY ?? "", "base64");
if (secret.length !== 32) throw new Error("Set APP_SECRET_KEY (openssl rand -base64 32) before seeding");

function keys() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  const ct = Buffer.concat([cipher.update(privateKey.export({ format: "der", type: "pkcs8" })), cipher.final()]);
  return {
    signingPublicKey: Buffer.from(publicKey.export({ format: "jwk" }).x!, "base64url").toString("base64"),
    signingPrivateKeyEnc: [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url")).join("."),
  };
}

const salt = randomBytes(16);
const passwordHash = `scrypt$${salt.toString("base64")}$${scryptSync("demo-password", salt, 64).toString("base64")}`;

const APPS = [
  {
    slug: "menuweather",
    name: "MenuWeather",
    tagline: "The forecast in your menu bar, nothing else.",
    description:
      "MenuWeather puts the current temperature and the next six hours in your menu bar.\n\nNo account, no ads, no tracking. Pick a city or let it use your location.",
    priceCents: 500,
    kind: "SOFTWARE",
    platform: "MACOS",
    file: "MenuWeather.dmg",
  },
  {
    slug: "clipstack",
    name: "Clipstack",
    tagline: "Clipboard history you can search with one shortcut.",
    description:
      "Press ⌥⌘V to see everything you copied today, search it, and paste it back.\n\nText, images and files. History stays on your Mac.",
    priceCents: 900,
    kind: "SOFTWARE",
    platform: "MACOS",
    file: "Clipstack.dmg",
  },
  {
    slug: "shipping-notes",
    name: "Shipping Notes",
    tagline: "A short field guide to releasing your first indie app.",
    description:
      "Forty pages on pricing, landing pages, release checklists and what to do the week after launch.\n\nPDF, free. Pay with an email address.",
    priceCents: 0,
    kind: "EBOOK",
    platform: null,
    licenseKeys: false,
    file: "Shipping Notes.pdf",
  },
] as const;

async function main() {
  const user = await db.user.upsert({
    where: { email: "demo@distrohub.dev" },
    update: {},
    create: { email: "demo@distrohub.dev", name: "Demo Studio", passwordHash },
  });

  for (const { file: fileName, ...a } of APPS) {
    const app = await db.app.upsert({
      where: { slug: a.slug },
      update: {},
      create: { ...a, ...keys(), ownerId: user.id, status: "PUBLISHED" },
    });
    const fileKey = `apps/${app.id}/1.0.0-seed/${fileName}`;
    const file = path.join(process.cwd(), ".storage", fileKey);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `Placeholder build for ${a.name}\n`);
    await db.release.upsert({
      where: { fileKey },
      update: {},
      create: { appId: app.id, version: "1.0.0", fileKey, fileName, fileSize: 32, uploaded: true },
    });
    console.log(`${a.name}: appId=${app.id} publicKey=${app.signingPublicKey}`);
  }
}

main().finally(() => db.$disconnect());
