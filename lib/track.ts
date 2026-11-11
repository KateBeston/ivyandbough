import { readConsent } from "@/lib/consent";

// Google Analytics shopping events, sent through Tag Manager's dataLayer.
// Only sent when the customer accepted all cookies, the same rule that loads Tag Manager.
type TrackLine = { id: string; sku?: string; name: string; price_cents: number; quantity: number };
type Tagged = Window & { dataLayer?: unknown[] };

const items = (lines: TrackLine[]) => lines.map((l) => ({ item_id: l.sku || l.id, item_name: l.name, price: l.price_cents / 100, quantity: l.quantity }));
const total = (lines: TrackLine[]) => Math.round(lines.reduce((n, l) => n + l.price_cents * l.quantity, 0)) / 100;

export function track(event: "add_to_cart" | "begin_checkout" | "purchase", lines: TrackLine[], extra: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || readConsent() !== "all" || !lines.length) return;
  const w = window as unknown as Tagged;
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ ecommerce: null });
  w.dataLayer.push({ event, ecommerce: { currency: "AUD", value: total(lines), items: items(lines), ...extra } });
}

// The basket is cleared once payment succeeds, so checkout keeps a copy for the thank-you page's purchase event.
const KEY = "ib-purchase";
export function rememberPurchase(lines: TrackLine[]) { try { sessionStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage off */ } }
export function sendPurchase(transactionId: string) {
  let lines: TrackLine[] = [];
  try { lines = JSON.parse(sessionStorage.getItem(KEY) ?? "[]"); sessionStorage.removeItem(KEY); } catch { return; }
  if (lines.length) track("purchase", lines, { transaction_id: transactionId });
}
