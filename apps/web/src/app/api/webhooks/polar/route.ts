import { NextResponse } from "next/server";
import { webhooks } from "@polar-sh/sdk/2026-10";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fulfillOrder, OrderNotFoundError, refundOrder } from "@/lib/fulfillment";

export async function POST(req: Request) {
  const body = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
  };

  let event: Awaited<ReturnType<typeof webhooks.validateEvent>>;
  try {
    event = await webhooks.validateEvent(body, headers, env.required("POLAR_WEBHOOK_SECRET"));
  } catch (err) {
    if (err instanceof webhooks.PolarWebhookVerificationError) {
      return NextResponse.json({ error: "invalid signature" }, { status: 403 });
    }
    if (err instanceof webhooks.PolarWebhookUnknownTypeError) {
      return NextResponse.json({ received: true, ignored: true });
    }
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const eventId = headers["webhook-id"];
  if (eventId && (await db.webhookEvent.findUnique({ where: { id: eventId } }))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "order.paid") {
      const order = event.data;
      if (order.checkout_id) {
        await fulfillOrder({
          checkoutId: order.checkout_id,
          providerOrderId: order.id,
          email: order.customer.email ?? "",
          amountCents: order.net_amount,
          currency: order.currency,
        });
      }
    } else if (event.type === "order.refunded") {
      const order = event.data;
      if (order.refunded_amount >= order.total_amount) await refundOrder(order.id);
    }
  } catch (err) {
    if (err instanceof OrderNotFoundError) {
      // Not one of ours (e.g. a sale made directly in Polar) — acknowledge so Polar stops retrying.
      console.warn(`[polar] ${err.message}`);
    } else {
      console.error("[polar] webhook handling failed", err);
      return NextResponse.json({ error: "processing failed" }, { status: 500 }); // Polar retries
    }
  }

  if (eventId) await db.webhookEvent.create({ data: { id: eventId, type: event.type } }).catch(() => {});
  return NextResponse.json({ received: true });
}
