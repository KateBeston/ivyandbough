// Delivery is always priced here, from the rates managed in the portal.
import { admin } from "./server";
import { parcelFor, parcelPostCents } from "./auspost";
import { OFFER_COLUMNS, offerPrice, type OfferFields } from "./pricing";

type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type Zone = { id: string; name: string; postcodes: string; rate: number; is_default: boolean; sort_order: number };
export type Quote = { source: "auspost" | "rate"; zone: string; subtotalCents: number; baseCents: number; surchargeCents: number; deliveryCents: number; free: boolean; freeOverCents: number | null; lines: { id: string; name: string; quantity: number; className: string; surchargeCents: number }[] };

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

type Row = OfferFields & { id: string; name: string; height_cm: number | null; width_cm: number | null; depth_cm: number | null; weight_g: number | null; shipping_classes: { name: string; surcharge: number; free_delivery_applies: boolean } | null };

export function price(rows: Row[], items: { id: string; quantity: number }[], zone: Zone, freeOver: number | null): Quote {
  const lines = items.flatMap((item) => {
    const row = rows.find((r) => r.id === item.id);
    const live = row ? offerPrice(row).cents : null;
    if (!row || live === null) return [];
    return [{ id: row.id, name: row.name, quantity: item.quantity, priceCents: live, className: row.shipping_classes?.name ?? "Standard", surchargeCents: cents(row.shipping_classes?.surcharge) * item.quantity, eligible: row.shipping_classes?.free_delivery_applies ?? true }];
  });
  const subtotalCents = lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);
  const freeOverCents = freeOver === null ? null : cents(freeOver);
  const free = freeOverCents !== null && subtotalCents >= freeOverCents && lines.every((l) => l.eligible);
  const baseCents = free ? 0 : cents(zone.rate);
  const surchargeCents = free ? 0 : lines.reduce((n, l) => n + l.surchargeCents, 0);
  return { source: "rate", zone: zone.name, subtotalCents, baseCents, surchargeCents, deliveryCents: baseCents + surchargeCents, free, freeOverCents, lines: lines.map(({ id, name, quantity, className, surchargeCents: s }) => ({ id, name, quantity, className, surchargeCents: s })) };
}

export async function quoteDelivery(db: Db, items: { id: string; quantity: number }[], postcode: string) {
  if (!/^\d{4}$/.test(postcode)) throw new Error("Enter a 4-digit Australian postcode.");
  const [products, zones, settings] = await Promise.all([
    db.from("products").select(`id,name,price_cents,${OFFER_COLUMNS},height_cm,width_cm,depth_cm,weight_g,shipping_classes(name,surcharge,free_delivery_applies)`).in("id", items.map((i) => i.id)),
    db.from("delivery_zones").select("id,name,postcodes,rate,is_default,sort_order"),
    db.from("delivery_settings").select("free_over,live_postage").maybeSingle(),
  ]);
  if (products.error || zones.error || settings.error) throw new Error("Delivery can't be calculated right now.");
  const zone = pickZone(zones.data as Zone[], postcode);
  if (!zone) throw new Error("Delivery can't be calculated right now.");
  const quote = price(products.data as Row[], items, zone, settings.data?.free_over === null || settings.data?.free_over === undefined ? null : Number(settings.data.free_over));
  if (quote.lines.length !== items.length) throw new Error("Something in your basket is no longer available.");
  return live(quote, products.data as Row[], items, postcode, settings.data);
}

// Live Australia Post Parcel Post price, when it's switched on in the portal. Items you post go from your postcode;
// items a dropship supplier sends go from theirs, each as its own parcel, and the prices are added together.
// Falls back to the zone rate for trees (they go by courier), items without a weight, parcels over Australia Post's limits,
// or if Australia Post doesn't answer.
async function live(quote: Quote, rows: Row[], items: { id: string; quantity: number }[], postcode: string, settings: { live_postage?: boolean } | null): Promise<Quote> {
  if (quote.free || !settings?.live_postage || quote.lines.some((l) => /tree/i.test(l.className))) return quote;
  const db = admin();
  if (!db) return quote;
  // The send-from postcode and supplier details are private, so they're read with the server key.
  const [{ data: s }, { data: links }] = await Promise.all([
    db.from("delivery_settings").select("send_from_postcode").maybeSingle(),
    db.from("supplier_items").select("product_id,suppliers(dropship,ships_from_postcode)").in("product_id", items.map((i) => i.id)),
  ]);
  const home = s?.send_from_postcode ?? "";
  if (!/^\d{4}$/.test(home)) return quote;
  const originOf = (id: string) => {
    const sup = ((links ?? []) as unknown as { product_id: string; suppliers: { dropship: boolean; ships_from_postcode: string } | null }[]).find((l) => l.product_id === id)?.suppliers;
    return sup?.dropship && /^\d{4}$/.test(sup.ships_from_postcode) ? sup.ships_from_postcode : home;
  };
  const groups = new Map<string, { id: string; quantity: number }[]>();
  for (const i of items) groups.set(originOf(i.id), [...(groups.get(originOf(i.id)) ?? []), i]);
  let total = 0;
  for (const [from, list] of groups) {
    const parcel = parcelFor(list.map((i) => ({ ...rows.find((r) => r.id === i.id)!, quantity: i.quantity })));
    const cents = parcel && (await parcelPostCents(from, postcode, parcel));
    if (!cents) return quote;
    total += cents;
  }
  return { ...quote, source: "auspost", zone: groups.size > 1 ? `Australia Post Parcel Post (${groups.size} parcels)` : "Australia Post Parcel Post", baseCents: total, deliveryCents: total + quote.surchargeCents };
}

export const cleanItems = (input: unknown) => (Array.isArray(input) ? (input as { id: string; quantity: number }[]).slice(0, 50) : []).map((i) => ({ id: String(i.id), quantity: Math.min(20, Math.max(1, Math.round(Number(i.quantity)) || 1)) }));
