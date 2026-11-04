import { createClient } from "@supabase/supabase-js";
import { key, url } from "./supabase";

export const account = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "ib-account" } });

export async function authHeader(): Promise<Record<string, string>> {
  const { data } = await account.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}
