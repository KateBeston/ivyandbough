import { NextResponse } from "next/server";
import { DELIVERY_CENTS, FREE_DELIVERY_OVER_CENTS } from "@/lib/delivery";
import { stripe, userFrom } from "@/lib/server";
import { supabase } from "@/lib/supabase";

type Row = { id: string; name: string; price_cents: number | null; product_images: { url: string; sort_order: number }[] };

export async function POST(request: Request) {
  const client = stripe();
  if (!client) return NextResponse.json({ error: "Checkout isn't switched on yet." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? (body.items as { id: string; quantity: number }[]).slice(0, 50) : [];
  if (!items.length) return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });

  // Prices always come from the database, never from the browser.
  const { data, error } = await supabase.from("products").select("id,name,price_cents,product_images(url,sort_order)").in("id", items.map((i) => String(i.id)));
  if (error) return NextResponse.json({ error: "Checkout isn't available right now." }, { status: 500 });
  const rows = (data ?? []) as Row[];
  const origin = new URL(request.url).origin;
  const lines = items.flatMap((item) => {
    const row = rows.find((r) => r.id === item.id);
    return row && row.price_cents !== null ? [{ row, quantity: Math.min(20, Math.max(1, Math.round(Number(item.quantity)) || 1)) }] : [];
  });
  if (lines.length !== items.length) return NextResponse.json({ error: "Something in your basket is no longer available." }, { status: 400 });

  const subtotal = lines.reduce((n, l) => n + l.row.price_cents! * l.quantity, 0);
  const free = subtotal >= FREE_DELIVERY_OVER_CENTS;
  const user = await userFrom(request);
  const session = await client.checkout.sessions.create({
    mode: "payment",
    currency: "aud",
    line_items: lines.map(({ row, quantity }) => {
      const url = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
      return { quantity, price_data: { currency: "aud", unit_amount: row.price_cents!, product_data: { name: row.name, images: url ? [url.startsWith("/") ? `${origin}${url}` : url] : undefined, metadata: { product_id: row.id } } } };
    }),
    shipping_address_collection: { allowed_countries: ["AU"] },
    shipping_options: [{ shipping_rate_data: { display_name: free ? "Free delivery" : "Standard delivery", type: "fixed_amount", fixed_amount: { amount: free ? 0 : DELIVERY_CENTS, currency: "aud" } } }],
    phone_number_collection: { enabled: true },
    custom_text: { submit: { message: "By placing your order, you agree to the Ivy & Bough Terms of Sale and Privacy Policy." } },
    customer_email: user?.email,
    metadata: { user_id: user?.id ?? "", cart_session: String(body?.sessionId ?? "").slice(0, 60) },
    success_url: `${origin}/order/thanks`,
    cancel_url: `${origin}/basket`,
  });
  return NextResponse.json({ url: session.url });
}
