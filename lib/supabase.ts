import { createClient } from "@supabase/supabase-js";

// Publishable values only: these are safe in the browser and protected by row level security.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://pexlozjdgwrygzwiaivm.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_78WlEU5wqKv1iE3zUUTyWg_APJTdzuM";

export const supabase = createClient(url, key, { auth: { persistSession: false } });
