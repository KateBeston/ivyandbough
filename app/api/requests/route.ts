import { NextResponse } from "next/server";
import { SITE_URL, sendMessage } from "@/lib/comms";
import { isHuman } from "@/lib/guard";
import { allowed } from "@/lib/limits";
import { CHANGE_OF_MIND, DISPUTE_CATEGORIES, MAX_PHOTOS, REFUND_REASONS, RESPONSE_HOURS, changeOfMind } from "@/lib/requests";
import { admin, userFrom } from "@/lib/server";

const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const brisbane = (d: Date) => new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Brisbane" }).format(d);

type ItemRow = { id: string; name: string; quantity: number; sku: string; tracking_number: string; order_id: string; products: { return_days: number | null; final_sale: boolean; sale_kind: string } | null };

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return fail("That didn't go through. Please try again.");
  if (form.get("company")) return NextResponse.json({ ok: true, reference: "" });
  let body: Record<string, unknown>;
  try { body = JSON.parse(String(form.get("data") ?? "{}")); } catch { return fail("That didn't go through. Please try again."); }

  const user = await userFrom(request);
  if (!(await allowed(request, "requests", 6, 3600))) return fail(`Please try again in a little while, or email hello@ivyandbough.com.`, 429);
  if (!user && !(await isHuman(body.token, request))) return fail("We couldn't confirm you're human. Please refresh the page and try again.", 403);
  const db = admin();
  if (!db) return fail("That didn't go through. Please email hello@ivyandbough.com.", 503);

  const kind = body.kind === "Dispute" ? "Dispute" : body.kind === "Refund" ? "Refund" : null;
  if (!kind) return fail("Please choose what you'd like to do.");
  const category = text(body.category, 80);
  const options = kind === "Refund" ? REFUND_REASONS[category] : DISPUTE_CATEGORIES.find((c) => c.id === category)?.issues;
  if (!options) return fail("Please choose what it's about.");
  const issues = (Array.isArray(body.issues) ? body.issues : []).map((v) => text(v, 100)).filter((v) => options.includes(v));
  if (!issues.length) return fail("Please tick at least one issue.");
  const comment = text(body.comment, 3000);
  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, MAX_PHOTOS);
  if (photos.some((f) => !/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 10 * 1024 * 1024)) return fail("Photos need to be JPEG, PNG or WebP images under 10 MB.");
  if (kind === "Refund" && !photos.length) return fail("Please add at least one photo.");

  let name = text(body.name, 120);
  let email = text(body.email, 254).toLowerCase();
  const phone = text(body.phone, 30);
  let orderNumber = text(body.orderNumber, 30).toUpperCase();
  const itemNumbers = text(body.itemNumbers, 300);
  let orderId: string | null = null;
  let verified = false;
  let items: { order_item_id: string; name: string; quantity: number; sku: string }[] = [];
  const needs = kind === "Refund" ? "items" : DISPUTE_CATEGORIES.find((c) => c.id === category)!.needs;

  if (user) {
    email = (user.email ?? "").toLowerCase();
    const { data: me } = await db.from("customers").select("name").eq("auth_user_id", user.id).maybeSingle();
    name = name || me?.name || String(user.user_metadata?.full_name ?? "");
    if (needs !== "none") {
      const { data: order } = await db.from("orders").select("id,order_number,parcels(tracking_number,delivered_at)").eq("id", text(body.orderId, 40)).eq("auth_user_id", user.id).maybeSingle();
      if (!order) return fail("Please choose one of your orders.");
      orderId = order.id; orderNumber = order.order_number; verified = true;
      if (needs === "items") {
        const ids = (Array.isArray(body.itemIds) ? body.itemIds : []).map((v) => text(v, 40));
        const { data: rows } = await db.from("order_items").select("id,name,quantity,sku,tracking_number,order_id,products(return_days,final_sale,sale_kind)").eq("order_id", order.id).in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
        const list = (rows ?? []) as unknown as ItemRow[];
        if (!list.length) return fail("Please choose at least one item.");
        if (kind === "Refund" && category === CHANGE_OF_MIND) {
          const parcels = (order.parcels ?? []) as { tracking_number: string; delivered_at: string | null }[];
          const first = parcels.map((p) => p.delivered_at).filter(Boolean).sort()[0] ?? null;
          const blocked = list.find((i) => !changeOfMind({ delivered: parcels.find((p) => p.tracking_number && p.tracking_number === i.tracking_number)?.delivered_at ?? first, returnDays: i.products?.return_days ?? null, finalSale: Boolean(i.products?.final_sale), clearance: /clearance/i.test(i.products?.sale_kind ?? "") }).eligible);
          if (blocked) return fail(`${blocked.name} isn't eligible for a change of mind refund.`);
        }
        items = list.map((i) => ({ order_item_id: i.id, name: i.name, quantity: i.quantity, sku: i.sku ?? "" }));
      }
    }
  } else {
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Please add your name and email address.");
    if (needs !== "none" && !orderNumber) return fail("Please add your order number.");
    if (orderNumber) {
      const { data: order } = await db.from("orders").select("id,customer_email").eq("order_number", orderNumber).maybeSingle();
      if (order) { orderId = order.id; verified = (order.customer_email ?? "").toLowerCase() === email; }
    }
  }

  const respondBy = new Date(Date.now() + RESPONSE_HOURS * 3_600_000);
  const { data: row, error } = await db.from("customer_requests").insert({
    kind, category, reason: kind === "Refund" ? category : "", issues, items, order_id: orderId, order_number: orderNumber, order_verified: verified,
    item_numbers: itemNumbers, auth_user_id: user?.id ?? null, name, email, phone, comment, source: user ? "Account" : "Contact page", respond_by: respondBy.toISOString(),
  }).select("id,reference").single();
  if (error || !row) return fail("That didn't go through. Please email hello@ivyandbough.com.", 500);

  const paths: string[] = [];
  for (const [n, f] of photos.entries()) {
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `${row.id}/${n + 1}.${ext}`;
    const { error: up } = await db.storage.from("requests").upload(path, Buffer.from(await f.arrayBuffer()), { contentType: f.type, upsert: true });
    if (!up) paths.push(path);
  }
  if (paths.length) await db.from("customer_requests").update({ photos: paths }).eq("id", row.id);

  const label = kind === "Refund" ? "refund request" : "dispute";
  const itemText = items.length ? items.map((i) => `${i.quantity} × ${i.name}`).join(", ") : itemNumbers || "Not given";
  const data = {
    reference: row.reference, first_name: name.split(" ")[0] || "there", request_kind: label,
    request_order: orderNumber || "Not given", request_summary: `${category}: ${issues.join(", ")}`, request_items: itemText, request_comment: comment || "None",
    request_link: user ? `[View your request](${SITE_URL}/account?tab=requests&ref=${row.reference})` : "",
  };
  await sendMessage({ slug: "request-received", to: email, orderId: null, data }).catch(() => null);
  await sendMessage({ slug: "request-alert", to: "hello@ivyandbough.com", data: { ...data, customer_name: name, customer_email: email, photo_count: String(paths.length), respond_by: brisbane(respondBy), portal_url: process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://ivy-and-bough-portal.vercel.app" } }).catch(() => null);
  return NextResponse.json({ ok: true, reference: row.reference });
}
