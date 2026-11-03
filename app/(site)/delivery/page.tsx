import type { Metadata } from "next";
import { formatDate, getDeliveryDates } from "@/lib/catalogue";

export const revalidate = 60;
export const metadata: Metadata = { title: "Delivery | Ivy & Bough" };

export default async function DeliveryPage() {
  const dates = await getDeliveryDates();
  return (
    <main className="prose">
      <h1>Delivery</h1>
      <p>We deliver Australia-wide. Delivery costs are calculated at checkout.</p>
      <p>[Add dispatch times, carriers and any delivery exclusions.]</p>
      <h2>Under the tree in time</h2>
      <p>Last order dates for Christmas delivery.</p>
      <div className="delivery-grid">
        {dates.map((d) => <div key={d.region}><small>{d.region}</small><strong>{formatDate(d.last_order_date)}</strong></div>)}
      </div>
    </main>
  );
}
