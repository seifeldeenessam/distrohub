import "server-only";
import { createPolar, type models } from "@polar-sh/sdk/2026-10";
import type { App } from "@/generated/prisma/client";
import { db } from "../db";
import { env } from "../env";
import type { PaymentsProvider } from "./types";

let client: ReturnType<typeof createPolar> | undefined;
export function polar() {
  client ??= createPolar({
    accessToken: env.required("POLAR_ACCESS_TOKEN"),
    environment: process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
  });
  return client;
}

/**
 * Each app maps to one one-time Polar product. Created lazily on first checkout and
 * re-priced whenever the creator changes the app's price.
 */
async function ensurePolarProduct(app: App) {
  const prices = [
    {
      amount_type: "fixed" as const,
      price_amount: app.priceCents,
      price_currency: app.currency as models.PresentmentCurrency,
    },
  ];

  if (!app.polarProductId) {
    const product = await polar().products.create({
      name: app.name,
      description: app.tagline,
      prices,
      metadata: { distrohub_app_id: app.id },
    });
    await db.app.update({
      where: { id: app.id },
      data: { polarProductId: product.id, polarPriceCents: app.priceCents },
    });
    return product.id;
  }

  if (app.polarPriceCents !== app.priceCents) {
    await polar().products.update(app.polarProductId, { name: app.name, prices });
    await db.app.update({ where: { id: app.id }, data: { polarPriceCents: app.priceCents } });
  }
  return app.polarProductId;
}

export const polarProvider: PaymentsProvider = {
  name: "polar",
  async createCheckout({ app, customerEmail }) {
    if (app.priceCents === 0) throw new Error("Free products don't go through Polar checkout");
    const productId = await ensurePolarProduct(app);
    const checkout = await polar().checkouts.create({
      products: [productId],
      customer_email: customerEmail ?? null,
      success_url: `${env.appUrl}/purchase/success?checkout_id={CHECKOUT_ID}`,
      return_url: `${env.appUrl}/apps/${app.slug}`,
      metadata: { distrohub_app_id: app.id },
    });
    return { checkoutId: checkout.id, url: checkout.url };
  },
};
