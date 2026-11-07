import { NextResponse } from "next/server";
import { CHANGE_OF_MIND, changeOfMind, type EligibleOrder } from "@/lib/requests";
import { admin, userFrom } from "@/lib/server";

type Row = { id: string; order_number: string; placed_on: string; order_items: { id: string; name: string; quantity: number; sku: string; tracking_number: string; products: { return_days: number | null; final_sale: boolean; sale_kind: string; product_images: { url: string; sort_order: number }[] } | null }[]; parcels: { tracking_number: string; delivered_at: string | null }[] };

// The signed-in customer's orders, with each item's eligibility for the chosen reason.
export async function GET(request: Request) {
  const user = await userFrom(request);
  const db = admin();
  if (!user || !db) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const reason = new URL(request.url).searchParams.get("reason") ?? "";
  const { data, error } = await db.from("orders")
    .select("id,order_number,placed_on,order_items(id,name,quantity,sku,tracking_number,products(return_days,final_sale,sale_kind,product_images(url,sort_order))),parcels(tracking_number,delivered_at)")
    .eq("auth_user_id", user.id).not("paid_at", "is", null).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Your orders didn't load. Please try again." }, { status: 500 });
  const orders: EligibleOrder[] = ((data ?? []) as unknown as Row[]).map((o) => {
    const delivered = o.parcels.map((p) => p.delivered_at).filter(Boolean).sort()[0] ?? null;
    return {
      id: o.id, order_number: o.order_number, placed_on: o.placed_on, delivered_on: delivered,
      items: o.order_items.map((i) => {
        const own = o.parcels.find((p) => p.tracking_number && p.tracking_number === i.tracking_number)?.delivered_at ?? delivered;
        const rule = reason === CHANGE_OF_MIND
          ? changeOfMind({ delivered: own, returnDays: i.products?.return_days ?? null, finalSale: Boolean(i.products?.final_sale), clearance: /clearance/i.test(i.products?.sale_kind ?? "") })
          : { eligible: true, note: "" };
        const image = [...(i.products?.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? "";
        return { order_item_id: i.id, name: i.name, quantity: i.quantity, sku: i.sku ?? "", image, ...rule };
      }),
    };
  });
  return NextResponse.json({ orders });
}
