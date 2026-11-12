// Pre-order pieces are bought from the supplier in batches once enough orders come in.
export type PreorderSettings = { cutoff: string | null; min: number; max: number };

const TZ = "Australia/Brisbane";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const nice = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "long" });

export const afterCutoff = (s: PreorderSettings) => Boolean(s.cutoff && today() > s.cutoff);

// The line under the price on a product page.
export function preorderLine(s: PreorderSettings) {
  if (afterCutoff(s)) return "Pre-order. Ships in January, after Christmas.";
  return `Pre-order. Ships with our next supplier batch, usually within ${s.min} to ${s.max} business days.${s.cutoff ? ` Order by ${nice(s.cutoff)} for Christmas.` : ""}`;
}

// The short note in the basket and order emails.
export function preorderNote(s: PreorderSettings) {
  return afterCutoff(s) ? "Pre-order: ships in January" : `Pre-order: ships within ${s.min} to ${s.max} business days`;
}
