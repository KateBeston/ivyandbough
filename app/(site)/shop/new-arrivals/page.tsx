import type { Metadata } from "next";
import { newest, ShopList } from "@/components/ShopList";

export const revalidate = 60;
export const metadata: Metadata = { title: "New Christmas Arrivals | Ivy & Bough", description: "The newest Christmas decorations, table pieces and gifts at Ivy & Bough. Delivered across Australia.", alternates: { canonical: "/shop/new-arrivals" } };

export default function Page() {
  return <ShopList title="New arrivals" intro="The latest pieces to join the range." pick={newest} />;
}
