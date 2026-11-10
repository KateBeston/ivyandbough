import { formatPrice } from "@/lib/catalogue";

// A price, with "incl. GST" after it on product cards and product pages.
export function Price({ cents, wasCents, gst = false }: { cents: number | null; wasCents?: number | null; gst?: boolean }) {
  const tag = gst && cents !== null ? <span className="gst-tag"> incl. GST</span> : null;
  if (!wasCents) return <>{formatPrice(cents)}{tag}</>;
  return <><s className="was-price" aria-label={`Was ${formatPrice(wasCents)}`}>{formatPrice(wasCents)}</s> <b className="now-price">{formatPrice(cents)}</b>{tag}</>;
}
