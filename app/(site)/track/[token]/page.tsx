import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTACT_EMAIL } from "@/lib/requests";
import { admin } from "@/lib/server";
import { trackingUrl } from "@/lib/tracking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Track your order | Ivy & Bough", robots: { index: false, follow: false } };

type Item = { name: string; quantity: number; shipping_status: string; carrier: string; tracking_number: string; shipped_on: string | null; products: { product_images: { url: string; sort_order: number; media_type: string | null }[] } | null };
type Order = { order_number: string; placed_on: string; status: string; shipping_name: string; order_items: Item[] };

const STEPS = ["Ordered", "Preparing", "On its way", "Delivered"];
// Where each item status sits on the progress line.
const STEP_OF: Record<string, number> = { "Not shipped": 1, Packing: 1, "With supplier": 1, Shipped: 2, "In transit": 2, "Out for delivery": 2, "Delivery problem": 2, Delivered: 3, Returned: 3 };
const NOTE: Record<string, string> = {
  "Not shipped": "We're getting this ready.", Packing: "We're packing this now.", "With supplier": "This is being prepared by our maker and will ship directly to you.",
  Shipped: "This is on its way.", "In transit": "This is on its way.", "Out for delivery": "This is out for delivery today.",
  "Delivery problem": "There's a hold-up with this delivery. We're looking into it and will be in touch.", Delivered: "This has been delivered.", Returned: "This has been returned to us.",
};
const date = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "long", year: "numeric" });

function Progress({ at }: { at: number }) {
  return (
    <ol className="track-steps" aria-label="Progress">
      {STEPS.map((s, n) => <li key={s} className={n <= at ? "done" : ""} aria-current={n === at ? "step" : undefined}><span />{s}</li>)}
    </ol>
  );
}

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{24}$/.test(token)) notFound();
  const db = admin();
  if (!db) notFound();
  const { data } = await db.from("orders").select("order_number,placed_on,status,shipping_name,order_items(name,quantity,shipping_status,carrier,tracking_number,shipped_on,products(product_images(url,sort_order,media_type)))").eq("track_token", token).maybeSingle();
  if (!data) notFound();
  const order = data as unknown as Order;

  // Items sharing a tracking number travel together, so show them as one parcel.
  const groups = new Map<string, Item[]>();
  for (const i of order.order_items) {
    const k = i.tracking_number ? `${i.carrier}|${i.tracking_number}` : `waiting|${i.shipping_status}`;
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const parcels = [...groups.values()].sort((a, b) => (STEP_OF[b[0].shipping_status] ?? 1) - (STEP_OF[a[0].shipping_status] ?? 1));
  const overall = Math.min(...order.order_items.map((i) => STEP_OF[i.shipping_status] ?? 1));
  const first = order.shipping_name.split(" ")[0];

  return (
    <main className="shop-page track-page">
      <p className="eyebrow">Order {order.order_number}</p>
      <h1 className="heading">{first ? `${first}, here's your order` : "Your order"}</h1>
      <p className="muted">Placed on {date(order.placed_on)}{parcels.length > 1 ? `. Your order is coming in ${parcels.length} parcels, as some pieces ship directly from our makers.` : "."}</p>
      <Progress at={order.status === "Cancelled" ? 0 : overall} />

      {parcels.map((items, n) => {
        const i = items[0];
        const link = i.tracking_number ? trackingUrl(i.carrier, i.tracking_number) : null;
        return (
          <section key={n} className="track-parcel">
            <div className="track-parcel-head">
              <h2>{parcels.length > 1 ? `Parcel ${n + 1}` : "Your parcel"}</h2>
              <span className={`track-status${i.shipping_status === "Delivery problem" ? " problem" : ""}`}>{i.shipping_status === "Not shipped" ? "Preparing" : i.shipping_status}</span>
            </div>
            <p>{NOTE[i.shipping_status] ?? ""}{i.shipped_on ? ` Sent on ${date(i.shipped_on)}.` : ""}</p>
            <ul className="track-items">
              {items.map((it, k) => {
                const img = [...(it.products?.product_images ?? [])].filter((m) => m.media_type !== "video").sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
                return (
                  <li key={k}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img ? <img src={img} alt="" /> : <span className="track-blank" />}
                    <span>{it.name}<small>Quantity {it.quantity}</small></span>
                  </li>
                );
              })}
            </ul>
            {i.tracking_number && (
              <div className="track-courier">
                <p>{i.carrier || "Courier"} tracking number <strong>{i.tracking_number}</strong></p>
                {link && <a className="solid" href={link} target="_blank" rel="noopener noreferrer">Track with {i.carrier}</a>}
              </div>
            )}
          </section>
        );
      })}

      <p className="track-help">Questions about your delivery? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your order number, or see our <Link href="/delivery">delivery information</Link>.</p>
    </main>
  );
}
