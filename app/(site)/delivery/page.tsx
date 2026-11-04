import type { Metadata } from "next";
import { formatDate, getDeliveryDates } from "@/lib/catalogue";
import { DELIVERY_SUMMARY } from "@/lib/delivery";

export const revalidate = 60;
export const metadata: Metadata = { title: "Delivery | Ivy & Bough" };

export default async function DeliveryPage() {
  const dates = await getDeliveryDates();
  return (
    <main className="prose">
      <h1>Delivery</h1>
      <p>We deliver Australia-wide. {DELIVERY_SUMMARY}</p>
      <p>Dispatch times are shown on each product page. Some pieces ship directly from our suppliers, so your order may arrive in separate parcels.</p>
      <h2>Under the tree in time</h2>
      <p>Last order dates for Christmas delivery.</p>
      <div className="delivery-grid">
        {dates.map((d) => <div key={d.region}><small>{d.region}</small><strong>{formatDate(d.last_order_date)}</strong></div>)}
      </div>
    </main>
  );
}
