import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { env } from "./env";
import { generateLicenseKey } from "./crypto";
import { orderEmail, sendEmail } from "./email";

export function downloadUrl(downloadToken: string) {
  return `${env.appUrl}/d/${downloadToken}`;
}

export class OrderNotFoundError extends Error {}

/**
 * Marks an order paid, issues its license (when the product uses keys) and emails the download link.
 * Free orders come through here too, with amountCents 0.
 * Idempotent: webhook retries for an already-paid order are no-ops.
 */
export async function fulfillOrder(input: {
  checkoutId: string;
  providerOrderId: string;
  email: string;
  amountCents: number;
  currency: string;
}) {
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { checkoutId: input.checkoutId },
      include: { app: true },
    });
    if (!order) throw new OrderNotFoundError(`No order for checkout ${input.checkoutId}`);
    if (order.status !== "PENDING") return null;

    const platformFeeCents = Math.round((input.amountCents * env.platformFeeBps) / 10_000);
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        providerOrderId: input.providerOrderId,
        email: input.email,
        amountCents: input.amountCents,
        currency: input.currency,
        platformFeeCents,
        creatorEarningsCents: input.amountCents - platformFeeCents,
      },
    });
    if (order.app.licenseKeys) {
      await tx.license.create({
        data: {
          key: generateLicenseKey(),
          appId: order.appId,
          orderId: order.id,
          email: input.email,
          maxActivations: order.app.maxActivations,
        },
      });
    }
    return order;
  });

  if (!result) return;
  await sendOrderEmail(result.id).catch((err) =>
    console.error(`[fulfillment] receipt email failed for order ${result.id}`, err),
  );
}

async function sendOrderEmail(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { app: true, license: true } });
  if (!order.email) return;
  const mail = orderEmail({
    productName: order.app.name,
    downloadUrl: downloadUrl(order.downloadToken),
    free: order.amountCents === 0,
    license: order.license,
  });
  await sendEmail({ to: order.email, ...mail });
}

export async function sendLicenseEmail(licenseId: string) {
  const license = await db.license.findUniqueOrThrow({
    where: { id: licenseId },
    include: { app: true, order: true },
  });
  const mail = orderEmail({
    productName: license.app.name,
    downloadUrl: license.order ? downloadUrl(license.order.downloadToken) : `${env.appUrl}/apps/${license.app.slug}`,
    free: !license.order || license.order.amountCents === 0,
    license,
  });
  await sendEmail({ to: license.email, ...mail });
}

/** Full refund: the order stops granting downloads and its license is revoked. */
export async function refundOrder(providerOrderId: string) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { providerOrderId } });
    if (!order || order.status === "REFUNDED") return;
    await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
    await tx.license.updateMany({ where: { orderId: order.id }, data: { status: "REVOKED" } });
  });
}

export const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
