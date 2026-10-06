import "server-only";
import { randomToken } from "../crypto";
import { env } from "../env";
import type { PaymentsProvider } from "./types";

/** Local-development stand-in for Polar: a fake checkout page at /checkout/mock/[id]. */
export const mockProvider: PaymentsProvider = {
  name: "mock",
  async createCheckout() {
    const checkoutId = `mock_${randomToken(12)}`;
    return { checkoutId, url: `${env.appUrl}/checkout/mock/${checkoutId}` };
  },
};
