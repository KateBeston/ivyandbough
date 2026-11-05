import { createHmac, timingSafeEqual } from "crypto";
import { SITE_URL, sendMessage } from "./comms";
import { admin } from "./server";

const token = (email: string) => createHmac("sha256", `subscribe:${process.env.SUPABASE_SECRET_KEY}`).update(email).digest("hex");

export function validToken(email: string, given: string) {
  const a = Buffer.from(token(email));
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

const setupCode = (email: string, expires: string) => createHmac("sha256", `setup:${process.env.SUPABASE_SECRET_KEY}`).update(`${email}:${expires}`).digest("hex");

// Lasts 30 minutes from the first confirmation, so an old or forwarded email can't create an account.
export function setupToken(email: string) {
  const expires = String(Date.now() + 30 * 60000);
  return `${expires}.${setupCode(email, expires)}`;
}

export function validSetup(email: string, given: string) {
  const [expires, code] = given.split(".");
  if (!code || Number(expires) < Date.now()) return false;
  const a = Buffer.from(setupCode(email, expires));
  const b = Buffer.from(code);
  return a.length === b.length && timingSafeEqual(a, b);
}

const stopCode = (email: string) => createHmac("sha256", `unsubscribe:${process.env.SUPABASE_SECRET_KEY}`).update(email).digest("hex");

export function validStop(email: string, given: string) {
  const a = Buffer.from(stopCode(email));
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

// The link goes to the address itself, so nobody can unsubscribe someone else.
export async function startUnsubscribe(email: string) {
  const db = admin();
  if (!db) return;
  const { data } = await db.from("subscribers").select("id").eq("email", email).maybeSingle();
  if (!data) return;
  await sendMessage({ slug: "unsubscribe-confirm", to: email, data: { unsubscribe_url: `${SITE_URL}/unsubscribe?e=${encodeURIComponent(email)}&t=${stopCode(email)}` } });
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
