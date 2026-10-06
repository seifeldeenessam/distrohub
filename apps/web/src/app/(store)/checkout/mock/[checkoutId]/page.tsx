import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatPrice } from "@/lib/money";
import { randomToken } from "@/lib/crypto";
import { fulfillOrder } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

/** Stand-in for Polar's hosted checkout when PAYMENTS_PROVIDER=mock. */
function mockEnabled() {
  try {
    return env.paymentsProvider === "mock";
  } catch {
    return false;
  }
}

export default async function MockCheckoutPage({ params }: PageProps<"/checkout/mock/[checkoutId]">) {
  if (!mockEnabled()) notFound();
  const { checkoutId } = await params;
  const order = await db.order.findUnique({ where: { checkoutId }, include: { app: true } });
  if (!order) notFound();
  if (order.status !== "PENDING") redirect(`/purchase/success?checkout_id=${checkoutId}`);

  async function pay(formData: FormData) {
    "use server";
    if (!mockEnabled()) return;
    const email = z.email().safeParse(formData.get("email"));
    if (!email.success) return;
    await fulfillOrder({
      checkoutId,
      providerOrderId: `mock_order_${randomToken(8)}`,
      email: email.data,
      amountCents: order!.amountCents,
      currency: order!.currency,
    });
    redirect(`/purchase/success?checkout_id=${checkoutId}`);
  }

  return (
    <div className="mx-auto max-w-sm pt-16">
      <p className="mb-4 rounded-md bg-accent-wash p-3 text-sm text-accent-ink">
        Test checkout. No card is charged. Set PAYMENTS_PROVIDER=polar to use Polar.
      </p>
      <div className="panel p-6">
        <h1 className="text-2xl font-bold">{order.app.name}</h1>
        <p className="mt-1 text-3xl font-semibold">{formatPrice(order.amountCents, order.currency)}</p>
        <form action={pay} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="label">
              {order.app.licenseKeys ? "Email for your license key" : "Email for your download link"}
            </label>
            <input id="email" name="email" type="email" required className="input" placeholder="you@example.com" />
          </div>
          <button className="btn btn-primary w-full">Pay {formatPrice(order.amountCents, order.currency)}</button>
        </form>
      </div>
    </div>
  );
}
