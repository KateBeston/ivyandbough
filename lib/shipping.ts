// Delivery is always priced here, from the rates managed in the portal.
type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type Zone = { id: string; name: string; postcodes: string; rate: number; is_default: boolean; sort_order: number };
export type Quote = { zone: string; subtotalCents: number; baseCents: number; surchargeCents: number; deliveryCents: number; free: boolean; freeOverCents: number | null; lines: { id: string; name: string; quantity: number; className: string; surchargeCents: number }[] };

const cents = (n: unknown) => Math.round(Number(n ?? 0) * 100);

export function inZone(zone: Pick<Zone, "postcodes">, postcode: string) {
  const code = Number(postcode);
  return zone.postcodes.split(/[,\s]+/).filter(Boolean).some((part) => {
    const [from, to] = part.split("-").map(Number);
    return code >= from && code <= (to ?? from);
  });
}

export function pickZone(zones: Zone[], postcode: string) {
  return [...zones].sort((a, b) => a.sort_order - b.sort_order).find((z) => !z.is_default && inZone(z, postcode)) ?? zones.find((z) => z.is_default) ?? null;
}

type Row = { id: string; name: string; price_cents: number | null; shipping_classes: { name: string; surcharge: number; free_delivery_applies: boolean } | null };

export function price(rows: Row[], items: { id: string; quantity: number }[], zone: Zone, freeOver: number | null): Quote {
  const lines = items.flatMap((item) => {
    const row = rows.find((r) => r.id === item.id);
    if (!row || row.price_cents === null) return [];
    return [{ id: row.id, name: row.name, quantity: item.quantity, priceCents: row.price_cents, className: row.shipping_classes?.name ?? "Standard", surchargeCents: cents(row.shipping_classes?.surcharge) * item.quantity, eligible: row.shipping_classes?.free_delivery_applies ?? true }];
  });
  const subtotalCents = lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);
  const freeOverCents = freeOver === null ? null : cents(freeOver);
  const free = freeOverCents !== null && subtotalCents >= freeOverCents && lines.every((l) => l.eligible);
  const baseCents = free ? 0 : cents(zone.rate);
  const surchargeCents = free ? 0 : lines.reduce((n, l) => n + l.surchargeCents, 0);
  return { zone: zone.name, subtotalCents, baseCents, surchargeCents, deliveryCents: baseCents + surchargeCents, free, freeOverCents, lines: lines.map(({ id, name, quantity, className, surchargeCents: s }) => ({ id, name, quantity, className, surchargeCents: s })) };
}

export async function quoteDelivery(db: Db, items: { id: string; quantity: number }[], postcode: string) {
  if (!/^\d{4}$/.test(postcode)) throw new Error("Enter a 4-digit Australian postcode.");
  const [products, zones, settings] = await Promise.all([
    db.from("products").select("id,name,price_cents,shipping_classes(name,surcharge,free_delivery_applies)").in("id", items.map((i) => i.id)),
    db.from("delivery_zones").select("id,name,postcodes,rate,is_default,sort_order"),
    db.from("delivery_settings").select("free_over").maybeSingle(),
  ]);
  if (products.error || zones.error || settings.error) throw new Error("Delivery can't be calculated right now.");
  const zone = pickZone(zones.data as Zone[], postcode);
  if (!zone) throw new Error("Delivery can't be calculated right now.");
  const quote = price(products.data as Row[], items, zone, settings.data?.free_over === null || settings.data?.free_over === undefined ? null : Number(settings.data.free_over));
  if (quote.lines.length !== items.length) throw new Error("Something in your basket is no longer available.");
  return quote;
}

export const cleanItems = (input: unknown) => (Array.isArray(input) ? (input as { id: string; quantity: number }[]).slice(0, 50) : []).map((i) => ({ id: String(i.id), quantity: Math.min(20, Math.max(1, Math.round(Number(i.quantity)) || 1)) }));
