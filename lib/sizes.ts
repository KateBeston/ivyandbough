import type { Product } from "./catalogue";

// Size bands from the largest measurement in centimetres.
export const SIZES: [string, string, number, number][] = [
  ["small", "Small (under 15 cm)", 0, 15],
  ["medium", "Medium (15 to 40 cm)", 15, 40],
  ["large", "Large (40 to 100 cm)", 40, 100],
  ["xl", "Extra large (100 cm and over)", 100, Infinity],
];

export function sizeOf(p: Product) {
  const biggest = Math.max(p.height_cm ?? 0, p.width_cm ?? 0, p.depth_cm ?? 0);
  if (!biggest) return "";
  return SIZES.find(([, , lo, hi]) => biggest >= lo && biggest < hi)?.[0] ?? "";
}

export const SORTS: [string, string][] = [["featured", "Featured"], ["newest", "Newest"], ["low", "Price: low to high"], ["high", "Price: high to low"], ["az", "Name: A to Z"], ["za", "Name: Z to A"]];

export function sortProducts(list: Product[], sort: string) {
  const money = (p: Product, none: number) => p.price_cents ?? none;
  const out = [...list];
  if (sort === "newest") out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (sort === "low") out.sort((a, b) => money(a, Infinity) - money(b, Infinity));
  if (sort === "high") out.sort((a, b) => money(b, -1) - money(a, -1));
  if (sort === "az") out.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "za") out.sort((a, b) => b.name.localeCompare(a.name));
  return out;
}
