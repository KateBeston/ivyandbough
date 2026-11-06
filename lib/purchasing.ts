import { sendMessage } from "./comms";
import { admin } from "./server";

type Db = NonNullable<ReturnType<typeof admin>>;

// Runs when an order is paid. Drafts are never sent from here, and a failure can be repeated from the portal.
export async function draftPurchaseOrders(db: Db, orderId: string, orderNumber: string) {
  await db.rpc("create_purchase_orders", { target: orderId });
  const { data } = await db.rpc("order_flags", { target: orderId });
  const flags = (data ?? []) as string[];
  if (!flags.length) return;
  await sendMessage({ slug: "order-assistant-alert", to: "hello@ivyandbough.com", data: { order_number: orderNumber, flags: [...new Set(flags)].join("\n"), portal_url: process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://ivy-and-bough-portal.vercel.app" } });
}
