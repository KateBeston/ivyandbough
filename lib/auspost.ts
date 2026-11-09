// Australia Post's Postage Assessment Calculator and Postcode Search. Both use AUSPOST_API_KEY.
// Every call fails quietly (returns null) so checkout can fall back to the flat rate.

const BASE = "https://digitalapi.auspost.com.au";
const MAX_KG = 22;
const MAX_SIDE_CM = 105;

async function get(path: string, params: Record<string, string>) {
  const key = process.env.AUSPOST_API_KEY;
  if (!key) return null;
  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, { headers: { "AUTH-KEY": key }, signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } }).catch(() => null);
  if (!res?.ok) return null;
  return res.json().catch(() => null);
}

export type Item = { quantity: number; height_cm: number | null; width_cm: number | null; depth_cm: number | null; weight_g: number | null };

// One box for the whole order: the largest item plus 2 cm of packaging each way, made taller if the items need more room,
// and the total weight plus 10% for packaging. The same guess the portal calculator starts from.
export function parcelFor(items: Item[]) {
  if (!items.length || items.some((i) => !(Number(i.height_cm) > 0 && Number(i.width_cm) > 0 && Number(i.depth_cm) > 0 && Number(i.weight_g) > 0))) return null;
  const sides = items.map((i) => [Number(i.height_cm), Number(i.width_cm), Number(i.depth_cm)].sort((a, b) => b - a));
  const largest = [...sides].sort((a, b) => b[0] * b[1] * b[2] - a[0] * a[1] * a[2])[0];
  const volume = items.reduce((n, i, k) => n + sides[k][0] * sides[k][1] * sides[k][2] * i.quantity, 0) * 1.1;
  const [length, width] = [largest[0] + 2, largest[1] + 2];
  const height = Math.max(largest[2] + 2, volume / (length * width) + 2);
  const kg = Math.ceil((items.reduce((n, i) => n + Number(i.weight_g) * i.quantity, 0) * 1.1) / 100) / 10;
  if (kg > MAX_KG || Math.max(length, width, height) > MAX_SIDE_CM) return null;
  return { length: Math.ceil(length), width: Math.ceil(width), height: Math.ceil(height), weight: kg };
}

// Australia Post's standard Parcel Post price, in cents.
export async function parcelPostCents(from: string, to: string, parcel: { length: number; width: number; height: number; weight: number }) {
  const data = await get("/postage/parcel/domestic/calculate.json", { from_postcode: from, to_postcode: to, length: String(parcel.length), width: String(parcel.width), height: String(parcel.height), weight: String(parcel.weight), service_code: "AUS_PARCEL_REGULAR" });
  const cost = Number(data?.postage_result?.total_cost);
  return cost > 0 ? Math.round(cost * 100) : null;
}

// The suburbs Australia Post has for a postcode, or null if it can't be checked right now.
export async function suburbsFor(postcode: string) {
  const data = await get("/postcode/search.json", { q: postcode });
  if (!data) return null;
  const raw = data?.localities?.locality;
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : []) as { location: string; postcode: number | string; state: string; category?: string }[];
  return list.filter((l) => String(l.postcode) === postcode).map((l) => ({ suburb: l.location, state: l.state }));
}

const plain = (s: string) => s.toUpperCase().replace(/[^A-Z ]/g, "").replace(/\s+/g, " ").trim();
const title = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

// A message if the suburb isn't in that postcode, or "" when it matches or can't be checked.
export async function checkSuburb(suburb: string, state: string, postcode: string) {
  const list = await suburbsFor(postcode);
  if (!list) return "";
  if (!list.length) return `We can't find postcode ${postcode}. Please check it.`;
  if (list.some((l) => plain(l.suburb) === plain(suburb) && l.state === state)) return "";
  const names = [...new Set(list.filter((l) => l.state === state).map((l) => title(l.suburb)))];
  if (!names.length) return `Postcode ${postcode} isn't in ${state}. Please check the state and postcode.`;
  return `${title(suburb) || "That suburb"} isn't in postcode ${postcode}. Australia Post lists ${names.slice(0, 6).join(", ")}${names.length > 6 ? " and others" : ""}. Please check your suburb and postcode.`;
}
