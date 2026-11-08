// The name used on baskets, orders, receipts and purchase orders, so each colour or scent is identified exactly.
export const fullName = (p: { name: string; version_name?: string | null }) => (p.version_name?.trim() ? `${p.name} – ${p.version_name.trim()}` : p.name);

// Where each product lives on the site: its own listing, or its group with that colour chosen. The result goes after /products/.
type Reader = { from: (t: string) => { select: (c: string) => { in: (k: string, v: string[]) => PromiseLike<{ data: unknown }> } } };
export async function productPaths(db: Reader, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data } = await db.from("product_links").select("product_id,path").in("product_id", ids);
  return new Map(((data ?? []) as { product_id: string; path: string }[]).map((r) => [r.product_id, r.path]));
}
