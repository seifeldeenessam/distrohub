import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { randomToken } from "@/lib/crypto";
import { payments } from "@/lib/payments";
import { latestRelease } from "@/lib/releases";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** "Download for $X" button target: opens a hosted checkout for the app. */
export async function POST(req: Request) {
  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const back = (error: string) => NextResponse.redirect(`${env.appUrl}/apps/${slug}?error=${error}`, 303);

  if (!rateLimit(`checkout:${clientIp(req.headers)}`, 20, 60_000)) return back("rate_limited");

  const app = await db.app.findUnique({ where: { slug } });
  if (!app || app.status !== "PUBLISHED") return NextResponse.redirect(`${env.appUrl}/`, 303);
  if (!(await latestRelease(app.id))) return back("no_release");

  try {
    const provider = payments();
    const checkout = await provider.createCheckout({ app });
    await db.order.create({
      data: {
        appId: app.id,
        provider: provider.name,
        checkoutId: checkout.checkoutId,
        amountCents: app.priceCents,
        currency: app.currency,
        downloadToken: randomToken(),
      },
    });
    return NextResponse.redirect(checkout.url, 303);
  } catch (err) {
    console.error("[checkout] failed", err);
    return back("checkout_failed");
  }
}
