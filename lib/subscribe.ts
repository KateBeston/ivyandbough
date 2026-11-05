import { createHmac, timingSafeEqual } from "crypto";
import { SITE_URL, sendMessage } from "./comms";
import { admin } from "./server";

const token = (email: string) => createHmac("sha256", `subscribe:${process.env.SUPABASE_SECRET_KEY}`).update(email).digest("hex");

export function validToken(email: string, given: string) {
  const a = Buffer.from(token(email));
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Nobody joins the list until they click the link sent to that address.
export async function startSubscription(email: string, source: string) {
  const db = admin();
  if (!db) return false;
  const { data: existing } = await db.from("subscribers").select("confirmed_at").eq("email", email).maybeSingle();
  if (existing?.confirmed_at) return true;
  if (!existing) {
    const { error } = await db.from("subscribers").insert({ email, source });
    if (error && error.code !== "23505") return false;
  }
  const url = `${SITE_URL}/subscribe/confirm?e=${encodeURIComponent(email)}&t=${token(email)}`;
  await sendMessage({ slug: "subscribe-confirm", to: email, data: { confirm_url: url } });
  return true;
}
