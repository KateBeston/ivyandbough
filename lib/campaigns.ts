import { supabase } from "./supabase";

// Public sale codes (Black Friday and the like): anyone can use them, as often as they like, between the dates.
// Category lists include their sub-categories. Set up in the campaign_codes table.
export type CampaignCode = {
  id: string; code: string; campaign: string; label: string; headline: string;
  discount_type: "Amount" | "Percent"; discount_value: number; min_order: number;
  include_categories: string[]; exclude_categories: string[]; exclude_suppliers: string[];
  applies_to_sale: boolean; starts_at: string; ends_at: string;
};

export const CAMPAIGN_COLUMNS = "id,code,campaign,label,headline,discount_type,discount_value,min_order,include_categories,exclude_categories,exclude_suppliers,applies_to_sale,starts_at,ends_at";

export async function getCampaignCodes(campaign?: string) {
  let q = supabase.from("campaign_codes").select(CAMPAIGN_COLUMNS).eq("is_active", true).order("discount_value", { ascending: false });
  if (campaign) q = q.eq("campaign", campaign);
  const { data } = await q;
  return (data ?? []) as CampaignCode[];
}

export type CampaignState = "before" | "live" | "after";
export function campaignState(codes: Pick<CampaignCode, "starts_at" | "ends_at">[], now = new Date()): CampaignState {
  if (!codes.length) return "after";
  const start = Math.min(...codes.map((c) => new Date(c.starts_at).getTime()));
  const end = Math.max(...codes.map((c) => new Date(c.ends_at).getTime()));
  return now.getTime() < start ? "before" : now.getTime() > end ? "after" : "live";
}

// Does a category (or its parent) qualify for this code?
export function categoryQualifies(code: Pick<CampaignCode, "include_categories" | "exclude_categories">, categoryId: string | null | undefined, parentId?: string | null) {
  const ids = [categoryId, parentId].filter(Boolean) as string[];
  if (ids.some((id) => code.exclude_categories.includes(id))) return false;
  return !code.include_categories.length || ids.some((id) => code.include_categories.includes(id));
}

const money = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const codeOffer = (c: Pick<CampaignCode, "discount_type" | "discount_value">) => (c.discount_type === "Percent" ? `${Number(c.discount_value)}% off` : `${money(Number(c.discount_value))} off`);
export const codeMinimum = (c: Pick<CampaignCode, "min_order">) => (Number(c.min_order) > 0 ? money(Number(c.min_order)) : "");
export const campaignDates = (c: Pick<CampaignCode, "starts_at" | "ends_at">) => {
  const f = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Brisbane", ...o }).format(new Date(d));
  return { start: f(c.starts_at, { weekday: "long", day: "numeric", month: "long" }), end: f(c.ends_at, { weekday: "long", day: "numeric", month: "long" }) };
};

// The menu link for a sale that's on right now.
export async function getCampaignLink(): Promise<{ label: string; href: string } | null> {
  const codes = await getCampaignCodes("Black Friday").catch(() => []);
  return campaignState(codes) === "live" ? { label: "Black Friday", href: "/black-friday" } : null;
}
