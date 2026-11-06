import type { Metadata } from "next";
import { formatDate, getDeliveryDates, getDeliverySummary } from "@/lib/catalogue";

export const revalidate = 60;
export const metadata: Metadata = { title: "Delivery | Ivy & Bough", description: "Delivery costs, dispatch times and Christmas last order dates for Ivy & Bough orders across Australia.", alternates: { canonical: "/delivery" } };

export default async function DeliveryPage() {
  const dates = await getDeliveryDates();
  const summary = await getDeliverySummary();
  return (
    <main className="prose">
      <h1>Delivery</h1>
      <p>We deliver Australia-wide to addresses our couriers can reach. A small number of remote locations may cost more or may not be serviceable, particularly for large items. If we can&apos;t deliver to your address, we&apos;ll let you know and give you a full refund. {summary}</p>
      <p>During busy periods, including the lead-up to Christmas, deliveries may be delayed. We&apos;ll always do our best to get your order to you as quickly as possible.</p>
      <p>Dispatch times are shown on each product page. Some pieces ship directly from our suppliers, so your order may arrive in separate parcels.</p>
      <h2>Under the tree in time</h2>
      <p>Last order dates for Christmas delivery.</p>
      <div className="delivery-grid">
        {dates.map((d) => <div key={d.region}><small>{d.region}</small><strong>{formatDate(d.last_order_date)}</strong></div>)}
      </div>
    </main>
  );
}
