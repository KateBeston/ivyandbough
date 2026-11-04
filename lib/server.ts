import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { key, url } from "./supabase";

// Server only. These values live in Vercel's environment settings, never in this repository.
export const stripe = () => (process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null);
export const admin = () => (process.env.SUPABASE_SECRET_KEY ? createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } }) : null);

export async function userFrom(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const { data } = await createClient(url, key, { auth: { persistSession: false } }).auth.getUser(token);
  return data.user;
}
