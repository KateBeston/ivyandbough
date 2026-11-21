import { createClient } from "@supabase/supabase-js";

// Publishable values only: these are safe in the browser and protected by row level security.
export const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://pexlozjdgwrygzwiaivm.supabase.co";
export const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_78WlEU5wqKv1iE3zUUTyWg_APJTdzuM";

export const supabase = createClient(url, key, { auth: { persistSession: false } });

// Reads every row of a query, 1,000 at a time: the database returns at most 1,000 rows per request,
// so without this the shop, search and feeds would silently stop at 1,000 listings.
type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
export async function all<T = Record<string, unknown>>(page: (from: number, to: number) => unknown, size = 1000): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await (page(from, from + size - 1) as Page<T>);
    if (error) return { data: rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < size) return { data: rows, error: null };
  }
}
