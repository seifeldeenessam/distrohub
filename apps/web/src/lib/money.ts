/** Paid prices start here (Polar's USD minimum). 0 is allowed and means free. */
export const MIN_PAID_PRICE_CENTS = 50;

export function formatPrice(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Store-facing price: "Free" for $0, otherwise the formatted amount. */
export const priceLabel = (cents: number, currency = "usd") => (cents === 0 ? "Free" : formatPrice(cents, currency));
