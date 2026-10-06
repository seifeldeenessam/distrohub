import type { App, License, Release } from "@/generated/prisma/client";

export const serializeApp = (app: App) => ({
  id: app.id,
  slug: app.slug,
  name: app.name,
  status: app.status,
  kind: app.kind,
  platform: app.platform,
  priceCents: app.priceCents,
  currency: app.currency,
  licenseKeys: app.licenseKeys,
  maxActivations: app.maxActivations,
  signingPublicKey: app.signingPublicKey,
  createdAt: app.createdAt,
});

export const serializeLicense = (l: License & { _count?: { activations: number } }) => ({
  id: l.id,
  key: l.key,
  email: l.email,
  status: l.status,
  maxActivations: l.maxActivations,
  activations: l._count?.activations,
  orderId: l.orderId,
  note: l.note,
  createdAt: l.createdAt,
});

export const serializeRelease = (r: Release) => ({
  id: r.id,
  version: r.version,
  notes: r.notes,
  fileName: r.fileName,
  fileSize: r.fileSize,
  uploaded: r.uploaded,
  createdAt: r.createdAt,
});
