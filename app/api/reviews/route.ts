import { NextResponse } from "next/server";
import { allowed } from "@/lib/limits";
import { validReviewToken } from "@/lib/reviews";
import { admin } from "@/lib/server";

const MAX_PHOTO = 8 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

// A review from the link in the review email. It waits in the portal until it's approved.
export async function POST(request: Request) {
  if (!(await allowed(request, "review", 20, 3600))) return NextResponse.json({ ok: false, error: "Too many tries. Please wait a little and try again." }, { status: 429 });
  const db = admin();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  const form = await request.formData().catch(() => null);
  if (!form || form.get("company")) return NextResponse.json({ ok: true });
  const orderId = String(form.get("o") ?? "");
  const productId = String(form.get("product_id") ?? "");
  if (!validReviewToken(orderId, String(form.get("t") ?? ""))) return NextResponse.json({ ok: false, error: "This review link isn't valid." }, { status: 403 });

  const rating = Math.round(Number(form.get("rating")));
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ ok: false, error: "Please choose a star rating." }, { status: 400 });
  const body = String(form.get("body") ?? "").trim().slice(0, 2000);
  const name = String(form.get("display_name") ?? "").trim().slice(0, 40);

  const { data: order } = await db.from("orders").select("id,customer_email,paid_at").eq("id", orderId).maybeSingle();
  if (!order?.paid_at) return NextResponse.json({ ok: false, error: "We couldn't find that order." }, { status: 404 });
  const { data: item } = await db.from("order_items").select("id").eq("order_id", orderId).eq("product_id", productId).limit(1).maybeSingle();
  if (!item) return NextResponse.json({ ok: false, error: "That item isn't in this order." }, { status: 400 });
  const { data: existing } = await db.from("product_reviews").select("id").eq("order_id", orderId).eq("product_id", productId).maybeSingle();
  if (existing) return NextResponse.json({ ok: false, error: "You've already reviewed this item. Thank you!" }, { status: 409 });

  let photo_url = "";
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    const ext = TYPES[file.type];
    if (!ext || file.size > MAX_PHOTO) return NextResponse.json({ ok: false, error: "Photos need to be a JPG, PNG or WebP under 8 MB." }, { status: 400 });
    const path = `reviews/${orderId}/${productId}-${Date.now()}.${ext}`;
    const { error } = await db.storage.from("media").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ ok: false, error: "The photo didn't upload. Please try again, or send the review without it." }, { status: 500 });
    photo_url = db.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await db.from("product_reviews").insert({ product_id: productId, order_id: orderId, customer_email: order.customer_email ?? "", display_name: name, rating, body, photo_url });
  if (error) return NextResponse.json({ ok: false, error: "That didn't go through. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
