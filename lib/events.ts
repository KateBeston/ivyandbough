import { supabase } from "./supabase";

export type CalEvent = { id: string; slug: string; name: string; event_type: string; is_featured: boolean; state: string; region: string; suburb: string; venue: string; address: string; start_date: string; end_date: string | null; time_text: string; price_text: string; about: string; official_url: string; booking_url: string; image_url: string; image_credit: string; source: string; organiser_name: string; lead: string; story: StoryBlock[]; highlights: { title: string; detail: string }[]; menu: { title: string; price: string; note: string; items: string[] }[]; menu_url: string; good_to_know: string[]; awards: { years: string; title: string; detail: string }[]; venue_about: string; venue_phone: string; venue_hours: string; facebook_url: string; instagram_url: string; maps_url: string };
export type StoryBlock = { type: "text"; heading?: string; text: string } | { type: "image"; url: string; alt?: string; caption?: string; credit?: string; layout?: "wide" | "right" };

const COLUMNS = "id,slug,name,event_type,is_featured,state,region,suburb,venue,address,start_date,end_date,time_text,price_text,about,official_url,booking_url,image_url,image_credit,source,organiser_name,lead,story,highlights,menu,menu_url,good_to_know,awards,venue_about,venue_phone,venue_hours,facebook_url,instagram_url,maps_url";

export const EVENT_TYPES = ["Carols", "Light displays", "Markets", "Family", "Community", "Christmas dining", "Outdoor movies", "Santa"];
export const EVENT_AREAS = ["Brisbane City", "South East Queensland", "Gold Coast", "Sunshine Coast"];
export const STATE_NAMES: Record<string, string> = { QLD: "Queensland", NSW: "New South Wales", VIC: "Victoria", SA: "South Australia", WA: "Western Australia", TAS: "Tasmania", ACT: "the ACT", NT: "the Northern Territory" };

// Our own library photos stand in until the organiser sends theirs.
const STAND_IN: Record<string, string> = {
  "Light displays": "/images/library/fakhri98-29922196.jpg",
  Carols: "/images/library/duygugungor-19541231.jpg",
  Markets: "/images/library/goksun-baris-gokalp-35225785.jpg",
  Family: "/images/library/christelle-wehbe-29673965.jpg",
  Community: "/images/library/carel-voorhorst-35130484.jpg",
  "Christmas dining": "/images/library/kanat-kairatov-14943637.jpg",
  "Outdoor movies": "/images/library/jsantiagoph-35379086.jpg",
  Santa: "/images/library/eftychia-syrimi-10594653.jpg",
};
export const eventImage = (e: Pick<CalEvent, "image_url" | "event_type">) => e.image_url || STAND_IN[e.event_type] || "/images/library/eftychia-syrimi-10594653.jpg";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });

export async function getEvents() {
  const { data } = await supabase.from("events").select(COLUMNS).eq("status", "Approved").order("start_date");
  const now = today();
  return ((data ?? []) as CalEvent[]).filter((e) => (e.end_date || e.start_date) >= now);
}

export async function getEvent(slug: string) {
  const { data } = await supabase.from("events").select(COLUMNS).eq("status", "Approved").eq("slug", slug).maybeSingle();
  return data as CalEvent | null;
}

export const fmtDate = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", o);
export const dateRange = (e: Pick<CalEvent, "start_date" | "end_date">, long = false) => {
  const o: Intl.DateTimeFormatOptions = long ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "short" };
  return e.end_date && e.end_date !== e.start_date ? `${fmtDate(e.start_date, o)} to ${fmtDate(e.end_date, o)}` : fmtDate(e.start_date, o);
};
