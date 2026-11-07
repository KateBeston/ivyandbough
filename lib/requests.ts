// Shared by the request forms and the API, so the choices and rules match on both sides.

export const RESPONSE_HOURS = 24;
export const DEFAULT_RETURN_DAYS = 14;
export const CONTACT_EMAIL = "hello@ivyandbough.com";
export const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "";
export const MAX_PHOTOS = 6;
export const CHANGE_OF_MIND = "Changed my mind";

export type Kind = "Refund" | "Dispute";
export const KINDS: { id: Kind; title: string; text: string }[] = [
  { id: "Refund", title: "Request a refund or return", text: "Return one or more items, whether something is wrong or you've changed your mind." },
  { id: "Dispute", title: "Raise a dispute", text: "Tell us about a problem with an order, a delivery, a product or our service." },
];

// Refund reasons. Only change of mind has a time limit: faulty, damaged and incorrect goods
// are covered by the Australian Consumer Law whenever they're reported.
export const REFUND_REASONS: Record<string, string[]> = {
  [CHANGE_OF_MIND]: ["It wasn't what I expected", "It doesn't suit my space or style", "I ordered the wrong item", "I no longer need it", "Other"],
  "Faulty or not working": ["Doesn't light up or switch on", "Stopped working after use", "A part is broken", "Battery or cable problem", "Other fault"],
  "Damaged on arrival": ["Broken or cracked", "Glass or ceramic shattered", "Scratched or marked", "Bent or dented", "Packaging was crushed"],
  "Wrong item sent": ["A different product", "Wrong colour", "Wrong size", "Wrong quantity"],
  "Not as described": ["Colour differs from the photos", "Size differs from the listing", "Material or quality differs", "Missing features listed"],
  "Missing pieces": ["Pieces missing from a set", "Accessories missing", "Instructions missing"],
};

// Dispute categories. "items" asks the customer to pick products, "order" asks for the order only.
export const DISPUTE_CATEGORIES: { id: string; needs: "items" | "order" | "none"; issues: string[] }[] = [
  { id: "Product concern", needs: "items", issues: ["Quality isn't what I expected", "Faulty or not working", "Damaged", "Not as described", "Safety concern", "Other"] },
  { id: "Product not received", needs: "items", issues: ["Tracking says delivered but it isn't here", "Tracking hasn't moved", "Part of my order is missing", "No tracking received"] },
  { id: "Wrong item received", needs: "items", issues: ["A different product", "Wrong colour", "Wrong size", "Wrong quantity"] },
  { id: "Delivery time", needs: "order", issues: ["Later than the estimate", "Won't arrive before Christmas", "Dispatch is taking too long", "Delivery date keeps changing"] },
  { id: "Delivery or courier experience", needs: "order", issues: ["Left in an unsafe place", "Delivered to the wrong address", "Courier was unhelpful", "Packaging was poor"] },
  { id: "Billing or payment", needs: "order", issues: ["Charged the wrong amount", "Charged twice", "Discount code didn't apply", "Refund hasn't arrived"] },
  { id: "Customer service", needs: "none", issues: ["Slow to respond", "My question wasn't answered", "Unhelpful response", "Other"] },
  { id: "Website or checkout", needs: "none", issues: ["Checkout didn't work", "Couldn't sign in", "Page didn't load", "Other"] },
  { id: "Other", needs: "none", issues: ["Other"] },
];

export type RequestItem = { order_item_id: string; name: string; quantity: number; sku: string; image: string };
export type EligibleItem = RequestItem & { eligible: boolean; note: string };
export type EligibleOrder = { id: string; order_number: string; placed_on: string; delivered_on: string | null; items: EligibleItem[] };

const day = 86_400_000;
const fmt = (d: Date) => new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" }).format(d);

// Change-of-mind eligibility for one item. Everything else is always eligible.
export function changeOfMind(opts: { delivered: string | null; returnDays: number | null; finalSale: boolean; clearance: boolean }, now = Date.now()) {
  if (opts.finalSale) return { eligible: false, note: "This item is final sale, so it can't be returned for change of mind." };
  if (opts.clearance) return { eligible: false, note: "Clearance items can't be returned for change of mind." };
  const days = opts.returnDays ?? DEFAULT_RETURN_DAYS;
  if (!opts.delivered) return { eligible: true, note: `Change of mind returns are accepted within ${days} days of delivery.` };
  const last = new Date(new Date(opts.delivered).getTime() + days * day);
  if (now > last.getTime()) return { eligible: false, note: `The ${days}-day change of mind period for this item ended on ${fmt(last)}, so it isn't eligible for a refund.` };
  return { eligible: true, note: `Eligible until ${fmt(last)}.` };
}
