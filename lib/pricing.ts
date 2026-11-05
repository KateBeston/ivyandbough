// The one place an offer turns into a price. The shop, basket and checkout all use it.
export const OFFER_COLUMNS = "sale_kind,discount_type,discount_value,sale_starts_at,sale_ends_at";

export type OfferFields = { price_cents: number | null; sale_kind?: string | null; discount_type?: string | null; discount_value?: number | string | null; sale_starts_at?: string | null; sale_ends_at?: string | null };

export function offerPrice(row: OfferFields, now = new Date()) {
  const plain = { cents: row.price_cents, wasCents: null as number | null, label: "" };
  const value = Number(row.discount_value ?? 0);
  if (row.price_cents === null || !row.sale_kind || !value) return plain;
  if (row.sale_starts_at && new Date(row.sale_starts_at) > now) return plain;
  if (row.sale_ends_at && new Date(row.sale_ends_at) <= now) return plain;
  const cents = row.discount_type === "Amount" ? row.price_cents - Math.round(value * 100) : Math.round(row.price_cents * (1 - value / 100));
  if (cents <= 0 || cents >= row.price_cents) return plain;
  return { cents, wasCents: row.price_cents, label: row.sale_kind };
}

export type Promotion = { discount_type: string; discount_value: number | string; min_order: number | string };

const dollars = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);

export function offerAmount(p: Promotion) {
  const value = Number(p.discount_value);
  return `${p.discount_type === "Percent" ? `${value}%` : dollars(value)} off`;
}

export function offerText(p: Promotion) {
  const value = Number(p.discount_value);
  const min = Number(p.min_order);
  return `${p.discount_type === "Percent" ? `${value}%` : dollars(value)} off your first order${min ? ` of ${dollars(min)} or more` : ""}`;
}
