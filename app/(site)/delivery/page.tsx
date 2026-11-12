import Link from "next/link";
import type { Metadata } from "next";
import { formatDate, getDeliveryDates, getDeliverySummary, getPreorderSettings } from "@/lib/catalogue";

export const revalidate = 60;
export const metadata: Metadata = { title: "Delivery | Ivy & Bough", description: "Delivery costs, dispatch times and Christmas last order dates for Ivy & Bough orders across Australia.", alternates: { canonical: "/delivery" } };

export default async function DeliveryPage() {
  const dates = await getDeliveryDates();
  const summary = await getDeliverySummary();
  const pre = await getPreorderSettings();
  return (
    <main className="prose">
      <h1>Delivery</h1>
      <p>We deliver Australia-wide to street addresses our couriers can reach. We can&apos;t deliver to PO Boxes, Locked Bags or Parcel Lockers. A small number of remote locations may cost more or may not be serviceable, particularly for large items. If we can&apos;t deliver to your address, we&apos;ll let you know and give you a full refund. {summary} Free delivery doesn&apos;t apply to large items or Christmas trees, which are charged at their own delivery rate.</p>
      <p>Some plant and seed products can&apos;t be sent to every state because of biosecurity rules. Where a product can&apos;t be sent to every state, we say so on its product page. If something in your order still can&apos;t be delivered to you, we&apos;ll let you know and give you a full refund.</p>
      <p>During busy periods, including the lead-up to Christmas, deliveries may be delayed. We&apos;ll always do our best to get your order to you as quickly as possible.</p>
      <p>Dispatch times are shown on each product page. Some pieces ship directly from our suppliers, so your order may arrive in separate parcels.</p>
      <p>We deliver to street addresses, PO boxes and parcel lockers. Large or heavy items need a street address. If your order includes one and you&apos;ve given a PO box or parcel locker, we&apos;ll contact you to arrange delivery.</p>
      <p>At checkout you can ask us to leave your parcel in a safe place if no one is home, and add delivery instructions. Once a parcel is left as you asked, it counts as delivered.</p>
      <h2>Dispatch and delivery times</h2>
      <p>Dispatch and delivery times shown on our site are estimates, not guarantees. Dispatch times are counted in business days, Monday to Friday, excluding public holidays, from when your payment clears. Delivery times then depend on the courier and your location, and can be longer for regional and remote areas. Occasionally things outside our control, such as courier delays, severe weather, supplier stock issues or very high demand at Christmas, can hold up an order. If your order is going to be noticeably later than shown, we&apos;ll email you with an update and your options, including a refund if you&apos;d rather not wait.</p>
      <h2>If something goes wrong</h2>
      <p>If your tracking hasn&apos;t changed for several days, or your parcel seems lost, please let us know as soon as possible. We&apos;ll look into it with the courier and, if it&apos;s lost, send a replacement or give you a refund.</p>
      <p>If your tracking says delivered but you can&apos;t find your parcel, please check around your property and with neighbours, then let us know promptly so we can investigate with the courier.</p>
      <p>If an item arrives damaged, please photograph the item and its packaging and keep the packaging. Then let us know under Returns and disputes in <Link href="/account?tab=requests">your account</Link> or through the <Link href="/contact?type=refund">refund form</Link>.</p>
      <p>If your delivery address is wrong, contact us straight away. We&apos;ll update it if your order hasn&apos;t been dispatched. Once it has, any redirection or redelivery charge is yours to pay. See our <Link href="/terms-of-sale">Terms of Sale</Link> for the details.</p>
      <h2 id="christmas">Under the tree in time</h2>
      <p>Last order dates for Christmas delivery.</p>
      <p>These dates are for pieces marked Available to order.{pre.cutoff ? ` Pre-order pieces need to be ordered by ${formatDate(pre.cutoff)} to arrive for Christmas.` : ""} Each product page shows the date that applies to it.</p>
      <div className="delivery-grid">
        {dates.map((d) => <div key={d.region}><small>{d.region}</small><strong>{formatDate(d.last_order_date)}</strong></div>)}
      </div>
    </main>
  );
}
