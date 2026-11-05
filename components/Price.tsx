import { formatPrice } from "@/lib/catalogue";

export function Price({ cents, wasCents }: { cents: number | null; wasCents?: number | null }) {
  if (!wasCents) return <>{formatPrice(cents)}</>;
  return <><s className="was-price" aria-label={`Was ${formatPrice(wasCents)}`}>{formatPrice(wasCents)}</s> <b className="now-price">{formatPrice(cents)}</b></>;
}
