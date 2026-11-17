// Made-to-order pieces (stored as "Pre-order") are made or bought in batches once orders come in. The order-by date shows as a separate banner.
export type PreorderSettings = { cutoff: string | null; min: number; max: number };

const TZ = "Australia/Brisbane";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const nice = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "long" });

export const niceDate = nice;
export const afterCutoff = (s: PreorderSettings) => Boolean(s.cutoff && today() > s.cutoff);

// The line under the price on a product page.
export function preorderLine(s: PreorderSettings) {
  if (afterCutoff(s)) return "Made to order. Ships in January, after Christmas.";
  return `Made to order. Ships with the next batch, usually within ${s.min} to ${s.max} business days.`;
}

// The short note in the basket and order emails.
export function preorderNote(s: PreorderSettings) {
  return afterCutoff(s) ? "Made to order: ships in January" : `Made to order: ships within ${s.min} to ${s.max} business days`;
}
