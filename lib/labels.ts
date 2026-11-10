import { supabase } from "./supabase";
import { admin } from "./server";

// What each product quality label means, set in the portal's Label meanings. Only returned once it's switched on there.
const groupKey = (group: string) => `quality_${group.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;

export async function labelsLive() {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "labels_guide").maybeSingle();
  return Boolean((data?.value as { live?: boolean } | null)?.live);
}

export async function getLabelGuide(): Promise<{ group: string; items: { label: string; meaning: string }[] }[]> {
  const db = admin();
  if (!db || !(await labelsLive())) return [];
  const { data: g } = await db.from("dropdown_options").select("value").eq("list_key", "quality_groups").eq("hidden", false).order("sort_order");
  const groups = ((g ?? []) as { value: string }[]).map((r) => r.value);
  const { data } = await db.from("dropdown_options").select("list_key,value,description").in("list_key", groups.map(groupKey)).eq("hidden", false).neq("description", "").order("sort_order");
  const rows = (data ?? []) as { list_key: string; value: string; description: string }[];
  return groups.map((group) => ({ group, items: rows.filter((r) => r.list_key === groupKey(group)).map((r) => ({ label: r.value, meaning: r.description })) })).filter((x) => x.items.length);
}

// "Group|Label" → meaning, for the labels on one product page.
export async function getLabelMeanings(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const g of await getLabelGuide()) for (const i of g.items) out[`${g.group}|${i.label}`] = i.meaning;
  return out;
}
