import type { User } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { admin } from "./server";

// Saved cards belong to a Stripe customer. Only a confirmed account gets one.
export async function stripeCustomer(client: Stripe, user: User) {
  const db = admin();
  if (!db || !user.email || !user.email_confirmed_at) return null;
  const email = user.email.toLowerCase();
  const { data: row } = await db.from("customers").select("id,name,stripe_customer_id").eq("email", email).maybeSingle();
  if (row?.stripe_customer_id) {
    // An id from the Stripe sandbox doesn't exist in live, so a new one replaces it.
    const existing = await client.customers.retrieve(row.stripe_customer_id).catch(() => null);
    if (existing && !existing.deleted) return existing.id;
  }
  const name = row?.name || String(user.user_metadata?.full_name ?? "");
  const customer = await client.customers.create({ email, name: name || undefined, metadata: { auth_user_id: user.id } });
  if (row) await db.from("customers").update({ stripe_customer_id: customer.id }).eq("id", row.id);
  else await db.from("customers").insert({ name, email, auth_user_id: user.id, stripe_customer_id: customer.id });
  return customer.id;
}

// Created once for each Stripe account, so the sandbox and live both work without dashboard setup.
export async function cardPortal(client: Stripe) {
  const { data } = await client.billingPortal.configurations.list({ active: true, limit: 100 });
  const found = data.find((c) => c.metadata?.purpose === "payment-methods");
  if (found) return found.id;
  const created = await client.billingPortal.configurations.create({ business_profile: { headline: "Manage your saved payment methods" }, features: { payment_method_update: { enabled: true }, customer_update: { enabled: false }, invoice_history: { enabled: false } }, metadata: { purpose: "payment-methods" } });
  return created.id;
}
